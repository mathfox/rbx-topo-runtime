import ts from "typescript";

export class TransformState {
    constructor(
        public program: ts.Program,
        public context: ts.TransformationContext,
    ) {
    }
}
