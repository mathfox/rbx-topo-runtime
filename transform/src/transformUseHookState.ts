import ts from "typescript";
import { TransformState } from "./TransformState";
import { cyrb53 } from "./cyrb53";

const GLOBAL_KEY = "__TOPO_RUNTIME_BASE_KEY";

// Attempts to get the declaration of the function;
export function getFunctionDeclaration(node: ts.Node, state: TransformState): ts.FunctionDeclaration | undefined {
    const checker = state.program.getTypeChecker();

    let symbol = checker.getSymbolAtLocation(node);

    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = checker.getAliasedSymbol(symbol);
    }

    if (!symbol) return;
    if (!symbol.declarations) return;

    // Ensure we return only the implementation version;
    for (const decl of symbol.declarations) {
        if (ts.isFunctionDeclaration(decl) && decl.body?.statements) return decl;
    }

    //return symbol.valueDeclaration;
}

function checkHookStateUsageStatementRecursive(node: ts.Node): boolean {
    if (ts.isCallExpression(node) && node.expression.getText() === "useHookState") return true;
    if (ts.isExpressionStatement(node)) return checkHookStateUsageStatementRecursive(node.expression);

    return ts.forEachChild(node, checkHookStateUsageStatementRecursive) ?? false;
}

export function transformUseHookState(state: TransformState, node: ts.CallExpression): ts.CallExpression {
    const f = state.context.factory;

    const decl = getFunctionDeclaration(node.expression, state);
    if (!decl) return node;

    const declUsesHookState = decl.body?.statements.some(checkHookStateUsageStatementRecursive) ?? false;
    if (!declUsesHookState) return node;

    const file = node.getSourceFile();
    const nodeLineAndChar = file.getLineAndCharacterOfPosition(node.getStart());

    const hookCallStatement = f.createReturnStatement(node);

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
