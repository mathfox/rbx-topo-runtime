export type System = () => void;

export interface FrameState {
	deltaTime: number;
}

export interface Node {
	frame?: FrameState,
	currentSystem?: System,
	system?: Map<System, {
		storage: Map<string, any>,
		cleanupCallback: (storage: any) => boolean | void,
	}>;
}

export function start(node: Node, fn: () => void): void;

export function useHookState<TStorage>(
    hook: Callback,
	discriminator?: unknown,
	cleanupCallback?: (storage: TStorage) => boolean | void,
): TStorage;

export function useFrameState(): FrameState;

export function useCurrentSystem(): System;

export function withinTopoContext(): boolean;

export interface SystemSamples extends Array<number> {
	index?: number | undefined;
}

/**
 * @class Loop
 *
 * Yielding is not allowed in systems. Doing so will result in the system thread being closed early, but it will not
 * affect other systems.
 */
export class Loop {
	_systems: Map<string, System>;
    _systemState: Map<string, object>;

    _skipSystems: Set<string>;

	trackErrors: boolean;
	_systemErrors: Map<string, {
		error: unknown;
		when: number;
	}>;

    profiling?: Map<string, SystemSamples>;

	/**
	 * Schedules a system.
	 *
	 * @param system - System to schedule.
	 */
	schedule(system: System): LuaTuple<[step: () => void, evict: () => void]>;
}

export function useDeltaTime(): number;
