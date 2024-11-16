import { useHookState } from "./useHookState";

function multipleDeclarationHook(value: number): boolean;

function multipleDeclarationHook(value: string): string;

function multipleDeclarationHook(value: unknown) {
    const storage = useHookState() as {};

    return {} as any
}

function system() {
    multipleDeclarationHook(3);
}