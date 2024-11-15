import ts from "typescript";
import { TransformState } from "./TransformState";
import { v4 as uuid } from "uuid";
import path from "path"
import { getFunctionDeclaration } from "./getFunctionDeclaration";

function checkDeclarationUseRecursive(expr: ts.Expression, decl: ts.Declaration, state: TransformState): boolean {
    const declaration = getFunctionDeclaration(expr, state);

    return false
}

export function visitHookCalls(node: ts.Node, state: TransformState): [true, ts.Node[]] | [false, undefined] {
    const f = state.context.factory;

    //node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());

//    if (ts.isFunctionDeclaration(node)) {
//        //for (const s of node.body?.statements!) {
//        //    console.log("Function decl ", node.name?.escapedText, s.kind)
//        //}
//
//        let times = 0;
//
//        for (const statement of node.body!.statements) {
//            ts.forEachChild(statement, (node) => {
//                //console.log("func statement", node.kind)
//                if (ts.isCallExpression(node)) {
//                    times++;
//                }
//            })
//        }
//
//        console.log(node)
//        console.log("Function ", node.name?.escapedText, "call other funcs inside times:", times);
//    }

    if (ts.isCallExpression(node)) {
        const decl = getFunctionDeclaration(node.expression, state);
        if (decl) {}

        console.log(node.expression.getText(), " is declared at:", decl?.getSourceFile().getLineAndCharacterOfPosition(decl.getStart()));
        // TODO: use unique indexes instead of generating UUID for everything.

        if (node.expression.getText() === "useHookState") {
            //console.log(`got useHookState call expression, source declaration is:`, declaration);

            const hookCallStatement = f.createReturnStatement(f.createCallExpression(
                f.createIdentifier("useHookState"),
                undefined,
                [
                    node.arguments[0] || f.createIdentifier("undefined"),
                    node.arguments[1] || f.createIdentifier("undefined"),
                ]
            ));

            const baseKeyAssignStatement = f.createExpressionStatement(f.createBinaryExpression(
                f.createPropertyAccessExpression(
                    f.createIdentifier("_G"),
                    f.createIdentifier("__TOPO_RUNTIME_BASE_KEY")
                ),
                f.createToken(ts.SyntaxKind.EqualsToken),
                f.createStringLiteral(uuid())
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
            )

            const nodes = [node];

            return [true, [invoked]]
        }
    }

    return [false, undefined]
}
