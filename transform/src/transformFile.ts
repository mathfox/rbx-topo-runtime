import ts from "typescript";
import { TransformState } from "./TransformState";
import { v4 as uuid } from "uuid";
import path from "path"

function transformNode(node: ts.Node, state: TransformState): ts.Node {
    for (const visitor of [visitHookCalls]) {
        const [shouldTransform, newNode] = visitor(node, state);
        if (shouldTransform) {
            return newNode
        }
    }

    return ts.visitEachChild(node, (newNode) => transformNode(newNode, state), state.context);
}

function visitHookCalls(node: ts.Node, context: TransformState): [true, ts.Node] | [false, undefined] {
    const f = context.factory;

    if (ts.isImportClause(node)) {
    }

    if (ts.isFunctionDeclaration(node)) {
        //node.body;
    }

    if (ts.isVariableStatement(node)) {
        node.declarationList.declarations[0]
    }

    //const state = ts.factory.createVariableStatement(
    //    undefined,
    //    ts.factory.createVariableDeclarationList(
    //        [ts.factory.createVariableDeclaration(
    //        ts.factory.createIdentifier("value"),
    //        undefined,
    //        undefined,
    //        ts.factory.createCallExpression(
    //            ts.factory.createIdentifier("custom_hook_1"),
    //            undefined,
    //            []
    //        )
    //        )],
    //        ts.NodeFlags.Const | ts.NodeFlags.Constant
    //    )
    //)

    if (ts.isCallExpression(node)) {
        if (node.expression.getText() === "useHookState") {
            // TODO: use unique indexes instead of generating UUID for everything.
            //return [true,
            //    f.createBinaryExpression(
            //        f.createPropertyAccessExpression(
            //            f.createIdentifier("_G"),
            //            f.createIdentifier("__TOPO_RUNTIME_BASE_KEY")
            //        ),
            //        f.createToken(ts.SyntaxKind.EqualsToken),
            //        f.createStringLiteral(uuid())
            //    )]

            //return [true, f.createBlock(
            //    [
            //    f.createExpressionStatement(f.createBinaryExpression(
            //        f.createPropertyAccessExpression(
            //            f.createIdentifier("_G"),
            //            f.createIdentifier("__TOPO_RUNTIME_BASE_KEY")
            //        ),
            //        f.createToken(ts.SyntaxKind.EqualsToken),
            //        f.createStringLiteral(uuid())
            //    )),
            //    f.createExpressionStatement(f.createCallExpression(
            //        f.createIdentifier("useHookState"),
            //        undefined,
            //        [
            //            node.arguments[0] || f.createIdentifier("undefined"),
            //            node.arguments[1] || f.createIdentifier("undefined"),
            //        ]
            //    )),
            //    ],
            //    true,
            //)];
        }
    }

    return [false, undefined]
}

function transformStatements(statements: ReadonlyArray<ts.Statement>, state: TransformState): ts.Statement[] {
    const output = new Array<ts.Statement>();

    for (const statement of statements) {
        const newStatements = ts.visitEachChild(statement, (newNode) => transformNode(newNode, state), state.context);

        if (ts.isBlock(newStatements)) {
            for (const st of newStatements.statements) {
                output.push(st);
            }

        } else {
            output.push(newStatements);
        }
    }

    return output;
}

export function transformFile(file: ts.SourceFile, state: TransformState): ts.SourceFile {
    console.log("yo", path.relative(process.cwd(), file.fileName));

    const statements = transformStatements(file.statements, state);

    return state.factory.updateSourceFile(file, statements);
}