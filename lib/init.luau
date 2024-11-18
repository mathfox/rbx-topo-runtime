--!native
--!optimize 2

export type System = () -> ()

export type CleanupCallback = (storage: any) -> boolean?

export type FrameState = {
	deltaTime: number,
}

export type Node = {
	system: {
		[string]: {
			storage: {
				[string]: any,
			},
			cleanupCallback: CleanupCallback,
		},
	},
	frame: FrameState | nil,
	currentSystem: System | nil,
}

-- cannot express here that TNode would extend Node
-- so there is no point in generics
export type StackFrame = {
	node: Node,
	accessedKeys: { [any]: { [string]: true } },
}

local stack: { StackFrame } = {}

local function start(node: Node, fn: () -> ())
	-- newStackFrame start
	table.insert(stack, {
		node = node,
		accessedKeys = {},
	})

	-- newStackFrame end

	fn()

	-- cleanup start

	local currentFrame = stack[#stack] :: StackFrame

	for baseKey, state in currentFrame.node.system do
		for key, value in state.storage do
			if not currentFrame.accessedKeys[baseKey] or not currentFrame.accessedKeys[baseKey][key] then
				local cleanupCallback = state.cleanupCallback

				if cleanupCallback then
					local shouldAbortCleanup = cleanupCallback(value)

					if shouldAbortCleanup then
						continue
					end
				end

				state.storage[key] = nil
			end
		end
	end

	-- cleanup end

	table.remove(stack, #stack)
end

local function withinTopoContext(): boolean
	return #stack ~= 0
end

-- this will error when called outside topo aware context.
local function useFrameState(): FrameState
	return stack[#stack].node.frame :: FrameState
end

local function useCurrentSystem()
	if #stack == 0 then return end

	return stack[#stack].node.currentSystem
end

--[=[
	:::tip
	**Don't use this function directly in your systems.**

	This function is used for implementing your own topologically-aware functions. It should not be used in your
	systems directly. You should use this function to implement your own utilities, similar to `useEvent` and
	`useThrottle`.
	:::

	`useHookState` does one thing: it returns a table. An empty, pristine table.

	### Uniqueness

	If your function is called multiple times from the same line, perhaps within a loop, the default behavior of
	`useHookState` is to uniquely identify these by call count, and will return a unique table for each call.

	However, you can override this behavior: you can choose to key by any other value. This means that in addition to
	script and line number, the storage will also only return the same table if the unique value (otherwise known as the
	"discriminator") is the same.

	### Cleaning up
	As a third optional parameter, you can pass a function that is automatically invoked when your storage is about
	to be cleaned up. This happens when your function (and by extension, `useHookState`) ceases to be called again
	next frame (keyed by script, line number, and discriminator).

	Your cleanup callback is passed the storage table that's about to be cleaned up. You can then perform cleanup work,
	like disconnecting events.

	*Or*, you could return `true`, and abort cleaning up altogether. If you abort cleanup, your storage will stick
	around another frame (even if your function wasn't called again). This can be used when you know that the user will
	(or might) eventually call your function again, even if they didn't this frame. (For example, caching a value for
	a number of seconds).

	If cleanup is aborted, your cleanup function will continue to be called every frame, until you don't abort cleanup,
	or the user actually calls your function again.

	### Example: useThrottle

	This is the entire implementation of the built-in `useThrottle` function:

	```lua
	local function cleanup(storage)
		return os.clock() < storage.expiry
	end

	local function useThrottle(seconds, discriminator)
		local storage = useHookState(discriminator, cleanup)

		if storage.time == nil or os.clock() - storage.time >= seconds then
			storage.time = os.clock()
			storage.expiry = os.clock() + seconds
			return true
		end

		return false
	end
	```

	A lot of talk for something so simple, right?

	@param discriminator? any -- A unique value to additionally key by
	@param cleanupCallback (storage: {}) -> boolean? -- A function to run when the storage for this hook is cleaned up
]=]
local function useHookState(discriminator: any, cleanupCallback: CleanupCallback): any
    local baseKey = _G.__TOPO_RUNTIME_BASE_KEY

	local currentFrame = stack[#stack]
	if currentFrame == nil then
		error("Attempt to access topologically-aware storage outside of a Loop-system context.", 3)
	end

	if not currentFrame.accessedKeys[baseKey] then
		currentFrame.accessedKeys[baseKey] = {}
	end

	local accessedKeys = currentFrame.accessedKeys[baseKey]

    local key = 0 :: any;

	if discriminator ~= nil then
		if type(discriminator) == "number" then
			discriminator = tostring(discriminator)
		end

		key = discriminator
	end

	accessedKeys[key] = true

	if not currentFrame.node.system[baseKey] then
		currentFrame.node.system[baseKey] = {
			storage = {},
			cleanupCallback = cleanupCallback,
		}
	end

	local storage = currentFrame.node.system[baseKey].storage

	if not storage[key] then
		storage[key] = {}
	end

	return storage[key]
end

-- Returns the `os.clock()` time delta between the start of this and last frame.
local function useDeltaTime(): number
	local state = useFrameState()

	return state.deltaTime
end

type SystemSamples = {
	index: number | nil,
}

type LoopProperties = {
    -- [ModuleFullName + FunctionName + Line]: function
	_systems: { [string]: System },
    -- [ModuleFullName + FunctionName + Line]: state
	_systemState: { [string]: any },
	_systemLastTime: { [string]: number },

	_systemErrors: { [string]: any },
	trackErrors: boolean,

	_skipSystems: { [string]: boolean },

	profiling: { [string]: SystemSamples } | nil,
}

type LoopImpl = {
	__index: LoopImpl,

	new: () -> Loop,

	schedule: (self: Loop, system: System) -> (() -> (), () -> ()),
}

type Loop = typeof(setmetatable({} :: LoopProperties, (nil :: any) :: LoopImpl))

local recentErrors = {}
local recentErrorLastTime = 0

local Loop = {} :: LoopImpl
Loop.__index = Loop

function Loop.new()
	local self = setmetatable({
		_systemState = {},
		_systems = {},
        _systemLastTime = {},
		_systemErrors = {},
		_skipSystems = {},
		trackErrors = true,
		profiling = nil,
	}, Loop)

	return self
end

function Loop:schedule(system)
    local source, name = debug.info(system, "sn")
    assert(name ~= nil, "Attempted to schedule anonymous function, only named functions are allowed")
    local key = `{source}:{name}`

    self._systems[key] = system
    if self._systemState[key] == nil then
        self._systemState[key] = {}
    end
    if self._systemLastTime[key] == nil then
        self._systemLastTime[key] = os.clock()
    end

    return function()
        local currentTime = os.clock()
        local deltaTime = currentTime - self._systemLastTime[key];
        self._systemLastTime[key] = currentTime;

        start({
            system = self._systemState[key],
            frame = {
                deltaTime = deltaTime,
            },
            currentSystem = system,
        }, function()
            local profiling = self.profiling

            if self._skipSystems[key] then
                if profiling then
                    profiling[key] = nil
                end

                return
            end

            --local systemName = `{debug.info(system, "s")} -> {debug.info(system, "n")}`

            --debug.profilebegin(`system: {systemName}`)

            local thread = coroutine.create(system)

            local startTime = os.clock()
            local success, errorValue = coroutine.resume(thread)

            if profiling then
                local duration = os.clock() - startTime

                local samples = profiling[key]
                if samples == nil then
                    samples = {}
                    profiling[key] = samples
                end

                samples[samples.index or 1] = duration

                local MAX_SAMPLES = 60
                samples.index = if samples.index then (samples.index % MAX_SAMPLES) + 1 else 1
            end

            if coroutine.status(thread) ~= "dead" then
                coroutine.close(thread)

                task.spawn(
                    error,
                    ("System %s yielded! Its thread has been closed. " .. "Yielding in systems is not allowed."):format(
                        key
                    )
                )
            end

            if not success then
                if os.clock() - recentErrorLastTime > 10 then
                    recentErrorLastTime = os.clock()
                    recentErrors = {}
                end

                local errorString =`{key}: {errorValue :: string}\n{debug.traceback(thread)}`

                if not recentErrors[errorString] then
                    task.spawn(error, errorString)
                    warn("The above error will be suppressed for the next 10 seconds")
                    recentErrors[errorString] = true
                end

                if self.trackErrors then
                    if self._systemErrors[key] == nil then
                        self._systemErrors[key] = {}
                    end

                    local errorStorage = self._systemErrors[key]
                    local lastError = errorStorage[#errorStorage]

                    if lastError and lastError.error == errorString then
                        lastError.when = os.time()
                    else
                        table.insert(errorStorage, {
                            error = errorString,
                            when = os.time(),
                        })

                        if #errorStorage > 100 then
                            table.remove(errorStorage, 1)
                        end
                    end
                end
            end

            --debug.profileend()
        end)
    end, function()
        self._systems[key] = nil
        self._systemErrors[key] = nil

        start({
            system = self._systemState[key],
        }, function() end)

        self._systemState[key] = nil
        self._systemLastTime[key] = nil
    end
end

local exports = {
	start = start,
	useHookState = useHookState,
	useFrameState = useFrameState,
	useCurrentSystem = useCurrentSystem,
	withinTopoContext = withinTopoContext,
	useDeltaTime = useDeltaTime,
	Loop = Loop,
}

return exports
