import { useHookState } from "./useHookState";

export function customHook(discriminator?: unknown) {
    const storage = useHookState(discriminator, () => {});

    useHookState(discriminator);
}