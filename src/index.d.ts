export type System<TParams extends ReadonlyArray<any> = ReadonlyArray<any>> = (
	...params: TParams
) => void;

export interface FrameState {
	deltaTime: number;
}

export interface Node<TParams extends ReadonlyArray<any>> {
	frame?: FrameState;
	currentSystem?: System<TParams>;
	system?: Map<
		System,
		{
			storage: Map<string, any>;
			cleanupCallback: (storage: any) => boolean | void;
		}
	>;
}

export function start<TParams extends ReadonlyArray<any>>(
	node: Node<TParams>,
	fn: () => void,
): void;

export function useHookState<TStorage>(
	discriminator?: unknown,
	cleanupCallback?: (storage: TStorage) => boolean | void,
): TStorage;

export function useFrameState(): FrameState;

export function useCurrentSystem<
	TParams extends ReadonlyArray<any>,
>(): System<TParams>;

export function withinTopoContext(): boolean;

export interface SystemSamples extends Array<number> {
	index?: number | undefined;
}

export function getSystemInfo(system: System): {
	readonly moduleFullName: string;
	readonly functionName: string;
};

/**
 * @class Loop
 *
 * The Loop class handles scheduling and *looping* (who would have guessed) over all of your game systems.
 *
 * Yielding is not allowed in systems. Doing so will result in the system thread being closed early, but it will not
 * affect other systems.
 */
export class Loop<TParams extends ReadonlyArray<any> = ReadonlyArray<any>> {
	/**
	 * Creates a new loop. `Loop.new` accepts as arguments the values that will be passed to all of your systems.
	 *
	 * So typically, you want to pass the World in here, as well as maybe a table of global game state.
	 *
	 * ```typescript
	 * const world = new World()
	 * const gameState = {}
	 *
	 * const loop = new Loop(world, gameState)
	 * ```
	 *
	 * @param ...dynamic_bundle - Values that will be passed to all of your systems
	 * @return Loop
	 */
	constructor(...dynamic_bundle: TParams);

	profiling?: Map<System, SystemSamples>;

	_systems: Array<System>;

	trackErrors: boolean;
	_systemErrors: Map<
		System,
		{
			error: unknown;
			when: number;
		}
	>;

	_skipSystems: Map<System, boolean>;

	/**
	 * Schedules a set of systems based on the constraints they define.
	 *
	 * Systems may optionally declare:
	 * - The name of the event they run on (e.g., RenderStepped, Stepped, Heartbeat)
	 * - A numerical priority value
	 * - Other systems that they must run *after*
	 *
	 * If systems do not specify an event, they will run on the `default` event.
	 *
	 * Systems that share an event will run in order of their priority, which means that systems with a lower `priority`
	 * value run first. The default priority is `0`.
	 *
	 * Systems that have defined what systems they run `after` can only be scheduled after all systems they depend on have
	 * already been scheduled.
	 *
	 * All else being equal, the order in which systems run is stable, meaning if you don't change your code, your systems
	 * will always run in the same order across machines.
	 *
	 * It is possible for your systems to be in an unresolvable state. In which case, `scheduleSystems` will error.
	 * This can happen when your systems have circular or unresolvable dependency chains.
	 *
	 * If a system has both a `priority` and defines systems it runs `after`, the system can only be scheduled if all of
	 * the systems it depends on have a lower or equal priority.
	 *
	 * Systems can never depend on systems that run on other events, because it is not guaranteed or required that events
	 * will fire every frame or will always fire in the same order.
	 *
	 * `scheduleSystems` has to perform nontrivial sorting work each time it's called, so you should avoid calling it multiple
	 * times if possible.
	 *
	 * @param systems - Array of systems to schedule.
	 */
	//scheduleSystems<S extends Array<System<T>>>(systems: S): void;

	/**
	 * Schedules a set of systems based on the constraints they define.
	 *
	 * Systems may optionally declare:
	 * - The name of the event they run on (e.g., RenderStepped, Stepped, Heartbeat)
	 * - A numerical priority value
	 * - Other systems that they must run *after*
	 *
	 * If systems do not specify an event, they will run on the `default` event.
	 *
	 * Systems that share an event will run in order of their priority, which means that systems with a lower `priority`
	 * value run first. The default priority is `0`.
	 *
	 * Systems that have defined what systems they run `after` can only be scheduled after all systems they depend on have
	 * already been scheduled.
	 *
	 * All else being equal, the order in which systems run is stable, meaning if you don't change your code, your systems
	 * will always run in the same order across machines.
	 *
	 * It is possible for your systems to be in an unresolvable state. In which case, `scheduleSystems` will error.
	 * This can happen when your systems have circular or unresolvable dependency chains.
	 *
	 * If a system has both a `priority` and defines systems it runs `after`, the system can only be scheduled if all of
	 * the systems it depends on have a lower or equal priority.
	 *
	 * Systems can never depend on systems that run on other events, because it is not guaranteed or required that events
	 * will fire every frame or will always fire in the same order.
	 *
	 * `scheduleSystems` has to perform nontrivial sorting work each time it's called, so you should avoid calling it multiple
	 * times if possible.
	 *
	 * @param system - System to schedule.
	 */
	scheduleSystem(system: System<TParams>): void;

	/**
	 * Schedules a single system. This is an expensive function to call multiple times. Instead, try batch scheduling
	 * systems with [Loop:scheduleSystems] if possible.
	 * @param system - System to evict from loop.
	 */
	evictSystem(system: System<TParams>): void;

	/**
	 * Replaces an older version of a system with a newer version of the system. Internal system storage (which is used
	 * by hooks) will be moved to be associated with the new system. This is intended to be used for hot reloading.
	 * @param oldSystem - The old system to be replaced.
	 * @param newSystem - The new system to replace with.
	 */
	replaceSystem(oldSystem: System<TParams>, newSystem: System<TParams>): void;

	/**
	 *
	 * Connects to frame events and starts invoking your systems.
	 *
	 * Pass a table of events you want to be able to run systems on, a map of name to event. Systems can use these names
	 * to define what event they run on. By default, systems run on an event named `"default"`. Custom events may be used
	 * if they have a `Connect` function.
	 *
	 * ```typescript
	 * loop.begin({
	 *   default: RunService.Heartbeat,
	 *   Heartbeat: RunService.Heartbeat,
	 *   RenderStepped: RunService.RenderStepped,
	 *   Stepped: RunService.Stepped,
	 * })
	 * ```
	 *
	 * &nbsp;
	 *
	 * Events that do not have any systems scheduled to run on them **at the time you call `Loop:begin`** will be skipped
	 * and never connected to. All systems should be scheduled before you call this function.
	 *
	 * Returns a table similar to the one you passed in, but the values are `RBXScriptConnection` values (or whatever is
	 * returned by `:Connect` if you passed in a synthetic event).
	 *
	 * @param events - A map from event name to event objects.
	 * @return A map from your event names to connection objects.
	 */
	//begin<T extends { [index: string]: RBXScriptSignal | { Connect: Callback } }>(
	//	events: T,
	//): { [P in keyof T]: RBXScriptConnection };
	begin<TEvent extends RBXScriptSignal | { Connect: Callback }>(
		event: TEvent,
	): ReturnType<TEvent["Connect"]>;

	/**
	 * Adds a user-defined middleware function that is called during each frame.
	 *
	 * This allows you to run code before and after each frame, to perform initialization and cleanup work.
	 *
	 * ```typescript
	 * loop.addMiddleware((nextFn) => {
	 *   return () => Plasma.start(plasmaNode, nextFn)
	 * })
	 * ```
	 *
	 * You must pass `addMiddleware` a function that itself returns a function that invokes `nextFn` at some point.
	 *
	 * The outer function is invoked only once. The inner function is invoked during each frame event.
	 *
	 * Middleware added later "wraps" middleware that was added earlier. The innermost middleware function is the internal
	 * function that actually calls your systems.
	 * @param middleware - (nextFn: () => void) => () => void
	 */
	//addMiddleware(
	//	middleware: (nextFn: () => void, eventName: string) => () => void,
	//): void;

	/**
	 * Sets the Worlds to be used by the Loop for deferring commands, and the Debugger for profiling.
	 * @param worlds - An array of Worlds or a map of World names to Worlds.
	 */
	//setWorlds(worlds: Array<World> | { [index: string]: World }): void;
}

export function useDeltaTime(): number;

type ConnectionLike =
	| { Disconnect(): void }
	| { disconnect(): void }
	| { Destroy(): void }
	| { destroy(): void }
	| (() => void);

type SignalLike<TArgs extends ReadonlyArray<any>> =
	| { Connect(callback: (...args: TArgs) => void): ConnectionLike }
	| { connect(callback: (...args: TArgs) => void): ConnectionLike }
	| { on(callback: (...args: TArgs) => void): ConnectionLike };

type InferSignalParameters<TValue> = TValue extends SignalLike<infer TParams>
	? TParams
	: never;

export function useEvent<
	TInstance extends Instance,
	TEvent extends InstanceEventNames<TInstance>,
>(
	instance: TInstance,
	event: TEvent,
): IterableFunction<
	LuaTuple<
		[
			index: number,
			...rest: InferSignalParameters<InstanceEvents<TInstance>[TEvent]>,
		]
	>
>;

export function useEvent<
	TParams extends ReadonlyArray<any>,
	TEvent extends SignalLike<TParams>,
>(
	discriminator: unknown,
	event: TEvent,
): IterableFunction<
	LuaTuple<[index: number, ...rest: InferSignalParameters<TEvent>]>
>;

export function useThrottle(seconds: number, discriminator?: unknown): boolean;
