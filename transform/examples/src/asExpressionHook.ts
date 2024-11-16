import { useHookState } from "./useHookState";

interface Storage {}

function asExpressionHook() {
    const storage = useHookState() as Storage
}

function system() {
    const value = asExpressionHook();
}