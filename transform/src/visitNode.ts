import ts from "typescript";
import { TransformState } from "./TransformState";
import { visitHookCalls } from "./visitHookCalls";

export function visitNode(node: ts.Node, state: TransformState): any {
    // TODO:
    for (const transformer of [visitHookCalls]) {
        const [shouldTransform, nodes] = transformer(node, state)
        if (shouldTransform) return nodes
    }

    return node
}