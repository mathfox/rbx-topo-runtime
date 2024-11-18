import ts from "typescript";
import { TransformState } from "./TransformState";
import { visitHookCalls } from "./visitHookCalls";

export function visitNode(node: ts.Node, state: TransformState): any {
    for (const transformer of [visitHookCalls]) {
        node = transformer(node, state);
    }

    return node
}