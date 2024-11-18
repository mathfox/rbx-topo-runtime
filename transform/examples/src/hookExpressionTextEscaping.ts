import { useHookState } from "./useHookState";

function useHook(cb: Function) {
    useHookState();
}

function some(value: string) {}

function hookExpressionTextEscaping() {
    useHook(() => {
        return {
            color: some("#fff"),
        }
    })
}