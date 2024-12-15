import ts from "typescript";
import { transformStatement } from "./transformStatement";
import { TransformState } from "./TransformState";
import { transformCallExpression } from "./transformCallExpression";

export function transformNode(state: TransformState, node: ts.Node): ts.Node | ts.Statement[] {
	if (ts.isCallExpression(node)) {
		return transformCallExpression(state, node);
	} else if (ts.isStatement(node)) {
		return transformStatement(state, node);
    }

	return ts.visitEachChild(node, (newNode) => transformNode(state, newNode), state.context);
}
