import ts from "typescript";
import { v4 as uuid } from "uuid";

// Helper class to store the program, context, and config
export class TransformContext {
    public factory: ts.NodeFactory;

    constructor(
        public program: ts.Program,
        public context: ts.TransformationContext,
    ) {
        this.factory = context.factory
    }

    visit(node: ts.Node): ts.Node {
        const context = this.context;
        const f = context.factory;

        node = ts.visitEachChild(node, this.visit, context);

        if (ts.isCallExpression(node)) {
            if (node.expression.getText() === "useHookState") {
                // TODO: use unique indexes instead of generating UUID for everything.

                return f.createBlock([
                    f.createExpressionStatement(f.createBinaryExpression(
                        f.createPropertyAccessExpression(
                            f.createIdentifier("_G"),
                            f.createIdentifier("__TOPO_RUNTIME_BASE_KEY")
                        ),
                        f.createToken(ts.SyntaxKind.EqualsToken),
                        f.createStringLiteral(uuid())
                    )),
                    f.createExpressionStatement(f.createCallExpression(
                        f.createIdentifier("useHookState"),
                        undefined,
                        [
                            node.arguments[0] || f.createIdentifier("undefined"),
                            node.arguments[1] || f.createIdentifier("undefined"),
                        ]
                    )),
                ]);
            }
        }

        //return ts.visitEachChild(node, (child) => visitNode(this, child), this.context);
        return node;
    }
}

function visitNode(context: TransformContext, node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
        //console.log("got function expression", node.name?.getText())
        //console.log("function expression has symbol:", context.program.getTypeChecker().getSymbolAtLocation(node))
    }


    // return the original node
    //return context.transform(node)
}