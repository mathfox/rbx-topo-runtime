--!strict
--!native
--!optimize 2

----- Queue start

type QueueProperties<T = any> = {
	_head: QueueEntry<T> | nil,
	_tail: QueueEntry<T> | nil,
}

type QueueImpl<T = any> = {
	__index: QueueImpl<T>,

	new: () -> Queue<T>,

	pushBack: (self: Queue<T>, value: T) -> (),
	popFront: (self: Queue<T>) -> T | nil,
}

type QueueEntry<T = any> = {
	value: T,
	next: QueueEntry<T> | nil,
}

type Queue<T = any> = typeof(setmetatable({} :: QueueProperties<T>, (nil :: any) :: QueueImpl<T>))

local Queue = {} :: QueueImpl
Queue.__index = Queue

function Queue.new()
	return setmetatable({
		_head = nil,
		_tail = nil,
	}, Queue)
end

function Queue:pushBack(value)
	local entry: QueueEntry<unknown> = {
		value = value,
		next = nil,
	}

	if self._tail ~= nil then
		self._tail.next = entry
	end

	self._tail = entry

	if self._head == nil then
		self._head = entry
	end
end

function Queue:popFront()
	if self._head == nil then
		return nil
	end

	local value = self._head.value
	self._head = self._head.next

	return value
end

----- Queue end

type System = (...any) -> ()

type CleanupCallback = (storage: any) -> boolean?

type FrameState = {
	deltaTime: number,
}

type Node = {
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
type StackFrame = {
	node: Node,
	accessedKeys: { [string]: { [string]: true } },
}

local stack: { StackFrame } = {}

local function start(node: Node, fn: (...any) -> ...any)
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

local function useFrameState(): FrameState
	return stack[#stack].node.frame
end

local function useCurrentSystem()
	if #stack == 0 then
		return
	end

	return stack[#stack].node.currentSystem
end

--[=[
	:::tip
	**Don't use this function directly in your systems.**

	This function is used for implementing your own topologically-aware functions. It should not be used in your
	systems directly. You should use this function to implement your own utilities, similar to `useEvent` and
	`useThrottle`.
	:::

	`useHookState` does one thing: it returns a table. An empty, pristine table. Here's the cool thing though:
	it always returns the *same* table, based on the script and line where *your function* (the function calling
	`useHookState`) was called.

	### Uniqueness

	If your function is called multiple times from the same line, perhaps within a loop, the default behavior of
	`useHookState` is to uniquely identify these by call count, and will return a unique table for each call.

	However, you can override this behavior: you can choose to key by any other value. This means that in addition to
	script and line number, the storage will also only return the same table if the unique value (otherwise known as the
	"discriminator") is the same.

	### Cleaning up
	As a second optional parameter, you can pass a function that is automatically invoked when your storage is about
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
	local file, line = debug.info(3, "sl")
	local fn = debug.info(2, "f")

	local baseKey = string.format("%s:%s:%d", tostring(fn), file, line)

	local currentFrame = stack[#stack]

	if currentFrame == nil then
		error("Attempt to access topologically-aware storage outside of a Loop-system context.", 3)
	end

	if not currentFrame.accessedKeys[baseKey] then
		currentFrame.accessedKeys[baseKey] = {}
	end

	local accessedKeys = currentFrame.accessedKeys[baseKey]

	local key = #accessedKeys

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
	_systems: { System },
	_systemState: {
		[System]: {},
	},

	_systemErrors: { [System]: any },
	trackErrors: boolean,

	_skipSystems: { [System]: boolean },

	profiling: { [System]: SystemSamples } | nil,
}

type LoopImpl = {
	__index: LoopImpl,

	new: () -> Loop,

	_scheduleSystem: (self: Loop, system: System) -> System,
	_evictSystem: (self: Loop, system: System) -> System,
	_replaceSystem: (self: Loop, old: System, new: System) -> (),

	schedule: (self: Loop, ...System) -> () -> (),
}

type Loop = typeof(setmetatable({} :: LoopProperties, (nil :: any) :: LoopImpl))

local recentErrors = {}
local recentErrorLastTime = 0

local function getSystemInfo(system: System): { moduleFullName: string, functionName: string }
	return {
		moduleFullName = debug.info(system, "s") :: string,
		functionName = debug.info(system, "n") :: string,
	}
end

local Loop = {} :: LoopImpl
Loop.__index = Loop

function Loop.new()
	local self = setmetatable({
		_systemState = {},
		_systems = {},
		_systemErrors = {},
		_skipSystems = {},
		trackErrors = true,
		profiling = nil,
	}, Loop)

	return self
end

function Loop:_scheduleSystem(system)
	table.insert(self._systems, system)
	self._systemState[system] = {}

	return system
end

function Loop:_evictSystem(system)
	local systemIndex = table.find(self._systems, system)

	if systemIndex == nil then
		error("Can't evict system because it doesn't exist")
	end

	table.remove(self._systems, systemIndex)

	self._systemErrors[system] = nil

	start({
		system = self._systemState[system],
	}, function() end)

	self._systemState[system] = nil

	return system
end

--[=[
	Replaces an older version of a system with a newer version of the system. Internal system storage (which is used
	by hooks) will be moved to be associated with the new system. This is intended to be used for hot reloading.

	@param old System
	@param new System
]=]
function Loop:_replaceSystem(old, new)
	local systemIndex = table.find(self._systems, old)

	if not systemIndex then
		error("Before system does not exist!")
	end

	table.remove(self._systems, systemIndex)
	table.insert(self._systems, new)

	self._systemState[new] = self._systemState[old] or {}
	self._systemState[old] = nil

	if self._skipSystems[old] then
		self._skipSystems[old] = nil
		self._skipSystems[new] = true
	end
end

function Loop:schedule(...)
	local systems = { ... }

	for i = 1, select("#", ...) do
		local system = select(i, ...)
		self:_scheduleSystem(system)
	end

	local lastTime = os.clock()

	return function()
		local currentTime = os.clock()
		local deltaTime = currentTime - lastTime
		lastTime = currentTime

		for _, system in systems do
			start({
				system = self._systemState[system],
				frame = {
					deltaTime = deltaTime,
				},
				currentSystem = system,
			}, function()
				local profiling = self.profiling

				if self._skipSystems[system] then
					if profiling then
						profiling[system] = nil
					end

					return
				end

				local systemInfo = getSystemInfo(system)
				local systemName = `{systemInfo.moduleFullName} -> {systemInfo.functionName}`

				debug.profilebegin(`system: {systemName}`)

				local thread = coroutine.create(system)

				local startTime = os.clock()
				local success, errorValue = coroutine.resume(thread)

				if profiling then
					local duration = os.clock() - startTime

					local samples = profiling[system]
					if samples == nil then
						samples = {}
						profiling[system] = samples
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
							systemName
						)
					)
				end

				if not success then
					if os.clock() - recentErrorLastTime > 10 then
						recentErrorLastTime = os.clock()
						recentErrors = {}
					end

					local errorString = `{systemName}: {errorValue :: string}\n{debug.traceback(thread)}`

					if not recentErrors[errorString] then
						task.spawn(error, errorString)
						warn("The above error will be suppressed for the next 10 seconds")
						recentErrors[errorString] = true
					end

					if self.trackErrors then
						if self._systemErrors[system] == nil then
							self._systemErrors[system] = {}
						end

						local errorStorage = self._systemErrors[system]
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

				debug.profileend()
			end)
		end
	end, function()
		for _, system in systems do
			self:_evictSystem(system)
		end
	end
end

local EVENT_CONNECT_METHODS = { "Connect", "on", "connect" }
local CONNECTION_DISCONNECT_METHODS = { "Disconnect", "Destroy", "disconnect", "destroy" }

local function connect(object: any, callback, event)
	local eventObject = object
	local eventType = typeof(event)

	if eventType == "RBXScriptSignal" or eventType == "table" then
		eventObject = event
	elseif type(event) == "string" then
		eventObject = object[event]
	end

	if type(eventObject) == "function" then
		return eventObject(object)
	elseif typeof(eventObject) == "RBXScriptSignal" then
		return eventObject:Connect(callback)
	end

	if type(eventObject) == "table" then
		for _, method in EVENT_CONNECT_METHODS do
			if type(eventObject[method]) ~= "function" then
				continue
			end

			return eventObject[method](eventObject, callback)
		end
	end

	error(
		"Couldn't connect to event as no valid connect methods were found! Ensure the passed event has a 'Connect' or an 'on' method!"
	)
end

local function disconnect(connection: { [any]: any } | nil)
	if connection == nil then
		return
	end

	if type(connection) == "function" then
		connection()

		return
	end

	for _, method in CONNECTION_DISCONNECT_METHODS do
		if type(connection[method]) ~= "function" then
			continue
		end

		connection[method](connection)
		break
	end
end

local function validateConnection(connection: any)
	local connectionType = typeof(connection)
	if connectionType == "function" or connectionType == "RBXScriptConnection" then
		return
	end

	for _, method in CONNECTION_DISCONNECT_METHODS do
		if connectionType ~= "table" or connection[method] == nil then
			continue
		end

		return
	end

	error("Ensure passed event returns a cleanup function, or a table with a 'Disconnect' or a 'Destroy' method!")
end

type UseEventStorage = {
	event: any,
	connection: { [any]: any } | nil,
	queue: Queue | nil,
}

local function useEventCleanupCallback(storage: UseEventStorage)
	disconnect(storage.connection)
	storage.queue = nil
end

--[=[
	@type ConnectionObject {Disconnect: (() -> ())?, Destroy: (() - >())?, disconnect: (() -> ())?, destroy: (() -> ())?} | () -> ()

	A connection object returned by a custom event must be either a table with any of the following methods, or a cleanup function.
]=]

--[=[
	@interface CustomEvent
	.Connect ((...) -> ConnectionObject)?
	.on ((...) -> ConnectionObject)?
	.connect ((...) -> ConnectionObject)?

	A custom event must have any of these 3 methods.
]=]

--[=[
	:::info Topologically-aware function
	This function is only usable if called within the context of [`Loop:begin`](/api/Loop#begin).
	:::

	Collects events that fire during the frame and allows iteration over event arguments.

	```lua
	for _, player in ipairs(Players:GetPlayers()) do
		for i, character in useEvent(player, "CharacterAdded") do
			world:spawn(
				components.Target(),
				components.Model({
					model = character,
				})
			)
		end
	end
	```

	Returns an iterator function that returns an ever-increasing number, starting at 1, followed by any event arguments
	from the specified event.

	Events are returned in the order that they were fired.

	:::caution
	`useEvent` keys storage uniquely identified by **the script and line number** `useEvent` was called from, and the
	first parameter (instance). If the second parameter, `event`, is not equal to the event passed in for this unique
	storage last frame, the old event is disconnected from and the new one is connected in its place.

	Tl;dr: on a given line, you should hard-code a single event to connect to. Do not dynamically change the event with
	a variable. Dynamically changing the first parameter (instance) is fine.

	```lua
	for _, instance in pairs(someTable) do
		for i, arg1, arg2 in useEvent(instance, "Touched") do -- This is ok
		end
	end

	for _, instance in pairs(someTable) do
		local event = getEventSomehow()
		for i, arg1, arg2 in useEvent(instance, event) do -- PANIC! This is NOT OK
		end
	end
	```
	:::

	If `useEvent` ceases to be called on the same line with the same instance and event, the event connection is
	disconnected from automatically.

	You can also pass the actual event object instead of its name as the second parameter:

	```lua
	useEvent(instance, instance.Touched)
	useEvent(instance, instance:GetPropertyChangedSignal("Name"))
	```

	`useEvent` supports custom events as well, so you can pass in an object with a `Connect`, `connect` or an `on` method.
	The object returned by any event must either be a cleanup function, or a table with a `Disconnect` or a `Destroy`
	method so that `useEvent` can later clean the event up when needed.	See [ConnectionObject] for more information.

	@param instance Instance | { [string]: CustomEvent } | CustomEvent -- The instance or the custom event, or a table that has the event you want to connect to
	@param event string | RBXScriptSignal | CustomEvent -- The name of, or the actual event that you want to connect to
]=]
local function useEvent(instance: any, event: any): () -> (number, ...any)
	assert(instance ~= nil, "Instance is nil")
	assert(event ~= nil, "Event is nil")

	local storage = useHookState(instance, useEventCleanupCallback) :: UseEventStorage

	if storage.event ~= event then
		if storage.event then
			disconnect(storage.connection)
			warn("useEvent event changed:", storage.event, "->", event)
			table.clear(storage)
		end

		local queue = Queue.new()
		storage.queue = queue
		storage.event = event

		local connection = connect(instance, function(...)
			queue:pushBack(table.pack(...))
		end, event)

		validateConnection(connection)
		storage.connection = connection
	end

	local index = 0
	return function(): any
		index += 1

		local arguments = (storage.queue :: Queue):popFront()

		if arguments then
			return index, unpack(arguments, 1, arguments.n)
		end

		return
	end
end

local function useThrottleCleanupCallback(storage)
	return os.clock() < storage.expiry
end

--[=[
	:::info Topologically-aware function
	This function is only usable if called within the context of [`Loop:begin`](/api/Loop#begin).
	:::

	Utility for easy time-based throttling.

	Accepts a duration, and returns `true` if it has been that long since the last time this function returned `true`.
	Always returns `true` the first time.

	This function returns unique results keyed by script and line number. Additionally, uniqueness can be keyed by a
	unique value, which is passed as a second parameter. This is useful when iterating over a query result, as you can
	throttle doing something to each entity individually.

	```lua
	if useThrottle(1) then -- Keyed by script and line number only
		print("only prints every second")
	end

	for id, enemy in world:query(Enemy) do
		if useThrottle(5, id) then -- Keyed by script, line number, and the entity id
			print("Recalculate target...")
		end
	end
	```

	@param seconds number -- The number of seconds to throttle for
	@param discriminator? any -- A unique value to additionally key by
	@return boolean -- returns true every x seconds, otherwise false
]=]
local function useThrottle(seconds, discriminator)
	local storage = useHookState(discriminator, useThrottleCleanupCallback)

	if storage.time == nil or os.clock() - storage.time >= seconds then
		storage.time = os.clock()
		storage.expiry = os.clock() + seconds
		return true
	end

	return false
end

return {
	start = start,
	useHookState = useHookState,
	useFrameState = useFrameState,
	useCurrentSystem = useCurrentSystem,
	withinTopoContext = withinTopoContext,
	useDeltaTime = useDeltaTime,
	Loop = Loop,

	useEvent = useEvent,
	useThrottle = useThrottle,
	getSystemInfo = getSystemInfo,
}
