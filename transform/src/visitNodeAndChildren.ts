import ts from "typescript";
import { TransformState } from "./TransformState";
import { visitNode } from "./visitNode";

export function visitNodeAndChildren(
    node: ts.SourceFile,
    state: TransformState,
): ts.SourceFile;
export function visitNodeAndChildren(
    node: ts.Node,
    state: TransformState,
): ts.Node | ts.Node[];
export function visitNodeAndChildren(
    node: ts.Node,
    state: TransformState,
): ts.Node | ts.Node[] {
    return ts.visitEachChild(
        visitNode(node, state),
        childNode => visitNodeAndChildren(childNode, state),
        state.context,
    );
}