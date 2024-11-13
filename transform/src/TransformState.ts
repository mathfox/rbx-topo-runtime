import ts from "typescript";

export class TransformState {
    public factory: ts.NodeFactory

    constructor(
        public program: ts.Program,
        public context: ts.TransformationContext,
    ) {
        this.factory = context.factory
    }
}