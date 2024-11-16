import ts from "typescript";
import { TransformState } from "./TransformState";
import { getFunctionDeclaration } from "./getFunctionDeclaration";
import { GlobalState } from "./GlobalState";

function checkHookStateUsageStatementRecursive(node: ts.Node): boolean {
    if (ts.isCallExpression(node) && node.expression.getText() === "useHookState") return true;
    if (ts.isExpressionStatement(node)) return checkHookStateUsageStatementRecursive(node.expression)

    //console.log("checkin", node.kind)

//    if (ts.isVariableStatement(node)) {
//        for (const decl of node.declarationList.declarations) {
//            const init = decl.initializer;
//            if (!init) continue;
//
//            const uses = checkHookStateUsageStatementRecursive(init);
//            if (uses) return true;
//        }
//    }

    return false;
}

export function visitHookCalls(node: ts.Node, state: TransformState): ts.Node {
    const f = state.context.factory;

    if (!ts.isCallExpression(node)) return node;

    //console.log(`Call to function ${node.expression.getText()} uses hook state`)
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

    //console.log(`call of ${node.expression.getText()} requires setting bae key`)

    const hookCallStatement = f.createReturnStatement(node);

    const baseKeyAssignStatement = f.createExpressionStatement(f.createBinaryExpression(
        f.createPropertyAccessExpression(
            f.createIdentifier("_G"),
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
