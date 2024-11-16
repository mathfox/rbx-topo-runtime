import ts from "typescript";
import { TransformState } from "./TransformState";
import { getFunctionDeclaration } from "./getFunctionDeclaration";
import { GlobalState } from "./GlobalState";

function checkHookStateUsageStatementRecursive(node: ts.Node): boolean {
    if (ts.isCallExpression(node) && node.expression.getText() === "useHookState") return true;
    if (ts.isExpressionStatement(node)) return checkHookStateUsageStatementRecursive(node.expression);

    return ts.forEachChild(node, checkHookStateUsageStatementRecursive) ?? false;
}

export function visitHookCalls(node: ts.Node, state: TransformState): ts.Node {
    const f = state.context.factory;

    if (!ts.isCallExpression(node)) return node;

    const decl = getFunctionDeclaration(node.expression, state);
    if (!decl || !ts.isFunctionDeclaration(decl)) return node;

    const statements = decl.body?.statements
    if (!statements) return node;

    let functionUsesHookState = false;

    for (const st of statements) {
        functionUsesHookState = checkHookStateUsageStatementRecursive(st);
        if (functionUsesHookState) break;
    }

    if (!functionUsesHookState) return node;

    //console.log(`call of ${node.expression.getText()} requires setting base key`)

    const hookCallStatement = f.createReturnStatement(node);

    const baseKeyAssignStatement = f.createExpressionStatement(f.createBinaryExpression(
        f.createPropertyAccessExpression(
            f.createParenthesizedExpression(f.createAsExpression(
                f.createIdentifier("_G"),
                f.createTypeLiteralNode([f.createPropertySignature(
                    undefined,
                    f.createIdentifier("__TOPO_RUNTIME_BASE_KEY"),
                    undefined,
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                )])
            )),
            f.createIdentifier("__TOPO_RUNTIME_BASE_KEY")
        ),
        f.createToken(ts.SyntaxKind.EqualsToken),
        f.createStringLiteral(`${GlobalState.hookCalls++}`)
    ));

    const invoked = f.createCallExpression(
        f.createParenthesizedExpression(
            f.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                f.createBlock([
                    baseKeyAssignStatement,
                    hookCallStatement,
                ], true)
            )
        ),
        undefined,
        []
    );

    return [invoked] as any;
}
