import { useHookState } from "./useHookState";

function nonAssigningHook(discriminator?: unknown) {
    useHookState(discriminator)
}

function system() {
    nonAssigningHook();
}