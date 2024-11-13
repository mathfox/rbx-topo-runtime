function custom_hook_1(discriminator?: unknown) {
    const storage_1 = useHookState(discriminator, () => {})

    const storage_2 = useHookState(discriminator);
}

function custom_hook_2(): void {
    const storage = useHookState();
}

function system_1() {
    const value = custom_hook_1();
}

function useHookState(discriminator?: unknown, cleanup?: Function) {
    throw new Error("Function not implemented.");
}
