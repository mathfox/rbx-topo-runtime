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

    // Transforms the children of the specified node
    transform<TNode extends ts.Node>(node: TNode): TNode {
        return ts.visitEachChild(node, (child) => visitNode(this, child), this.context);
    }
}

function cyrb53(str: string, seed = 0): number {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

function visitNode(context: TransformContext, node: ts.Node): ts.Node {
    if (ts.isFunctionDeclaration(node)) {
        //console.log("got function expression", node.name?.getText())
        //console.log("function expression has symbol:", context.program.getTypeChecker().getSymbolAtLocation(node))
    }

    const f = context.factory;

    if (ts.isCallExpression(node)) {

        if (node.expression.getText() === "useHookState") {
            // TODO: use unique indexes instead of generating UUID for everything.

            ts.visitNode(node, (node) => {

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

            })
        }
    }

    // return the original node
    return context.transform(node)
}