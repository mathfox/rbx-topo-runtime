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
 * The main purpose of the Loop is to collect the data about the systems which later on could be used by different debugger implementations.
 *
 * Yielding is not allowed in systems. Doing so will result in the system thread being closed early, but it will not
 * affect other systems.
 */
export class Loop {
    profiling?: Map<System, SystemSamples>;

	_systems: Array<System>;
    _skipSystems: Set<System>;

	trackErrors: boolean;
	_systemErrors: Map<System, {
		error: unknown;
		when: number;
	}>;

	/**
	 * Schedules a system.
	 *
	 * @param system - System to schedule.
	 */
	_scheduleSystem(system: System): void;

	/**
	 * @param system - System to evict from loop.
	 */
	_evictSystem(system: System): void;

	/**
	 * Replaces an older version of a system with a newer version of the system. Internal system storage (which is used
	 * by hooks) will be moved to be associated with the new system. This is intended to be used for hot reloading.
	 * @param oldSystem - The old system to be replaced.
	 * @param newSystem - The new system to replace with.
	 */
	_replaceSystem(oldSystem: System, newSystem: System): void;

    /**
     * Returns the `step` function that should be called each frame.
     * 
     * @example
     * ```ts
     * function reconcilePlayerCollisions() {
     *     // some stuff
     * }
     * 
     * const [step, evict] = loop.schedule(reconcilePlayerCollisions)
     * 
     * // Custom scheduling
     * const name = "test";
     * 
     * RunService.BindToRenderStep(name, 0, () => {
     *    step();
     * })
     * // when we no longer need the system
     * RunService.UnbindFromRenderStep(name)
     * 
     * // other type of the event
     * RunService.Heartbeat.Connect(() => {
     *    step();
     * })
     * ```
     */
    schedule(...systems: System[]): LuaTuple<[step: () => void, evict: () => void]>;
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
