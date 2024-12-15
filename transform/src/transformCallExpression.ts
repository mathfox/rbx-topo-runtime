import ts from "typescript";
import { transformNode } from "./transformNode";
import { TransformState } from "./TransformState";
import { transformUseHookState } from "./transformUseHookState";

export function transformCallExpression(state: TransformState, expression: ts.CallExpression): ts.Expression {
    {
        const newExpression = transformUseHookState(state, expression);
        if (newExpression !== expression) return newExpression;
    }

	return ts.visitEachChild(expression, (newNode) => transformNode(state, newNode), state.context);
}
