import ts from "typescript";
import { TransformState } from "./TransformState";
import { getFunctionDeclaration } from "./getFunctionDeclaration";
import { cyrb53 } from "./cyrb53";

const GLOBAL_KEY = "__TOPO_RUNTIME_BASE_KEY";

function checkHookStateUsageStatementRecursive(node: ts.Node): boolean {
    if (ts.isCallExpression(node) && node.expression.getText() === "useHookState") return true;
    if (ts.isExpressionStatement(node)) return checkHookStateUsageStatementRecursive(node.expression);

    return ts.forEachChild(node, checkHookStateUsageStatementRecursive) ?? false;
}

export function transformUseHookState(state: TransformState, node: ts.CallExpression): ts.CallExpression {
    const f = state.context.factory;

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

    const hookCallStatement = f.createReturnStatement(node);

    const file = node.getSourceFile();
    const nodeLineAndChar = file.getLineAndCharacterOfPosition(node.getStart());

    const baseKeyAssignStatement = f.createExpressionStatement(f.createBinaryExpression(
        f.createPropertyAccessExpression(
            f.createParenthesizedExpression(f.createAsExpression(
                f.createIdentifier("_G"),
                f.createTypeLiteralNode([f.createPropertySignature(
                    undefined,
                    f.createIdentifier(GLOBAL_KEY),
                    undefined,
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
                )])
            )),
            f.createIdentifier(GLOBAL_KEY)
        ),
        f.createToken(ts.SyntaxKind.EqualsToken),
        f.createStringLiteral(`${cyrb53(`${nodeLineAndChar.line}::${nodeLineAndChar.character}::${node.getText()}`)}`)
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

    return invoked;
}
