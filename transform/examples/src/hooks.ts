import { v4 } from "uuid"
import { testHook } from "./testHook";
import { useHookState } from "./useHookState";

function custom_hook_1(discriminator?: unknown) {
    const storage_1 = useHookState(discriminator, () => {})

    const storage_2 = useHookState(discriminator);

    v4();
}

function custom_hook_2(): void {
    const storage = useHookState();
}

function system_1() {
    const value = custom_hook_1();

    testHook();
}

