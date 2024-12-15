import ts from "typescript";
import { TransformState } from "./TransformState";
import { transformFile } from "./transformFile";

// The transformer entry point
// This provides access to necessary resources and the user specified configuration
// It returns a transformer function that will be called for each file that is transformed which iterates over every node in the file
// The program and config arguments are passed by the compiler

export default function(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
	return context => {
        const state = new TransformState(program, context);

		return file => {
            const result = transformFile(state, file);

            return result;
        }
    }
}
