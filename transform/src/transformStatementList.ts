import ts from "typescript";
import { TransformState } from "./TransformState";
import { transformStatement } from "./transformStatement";

export function getNodeList<T extends ts.Node>(statements: T | T[]): T[] {
	return Array.isArray(statements) ? statements : [statements];
}

export function transformStatementList(state: TransformState, statements: ReadonlyArray<ts.Statement>): ts.Statement[] {
	const result = new Array<ts.Statement>();

	for (const statement of statements) {
		const newStatements = transformStatement(state, statement);

		result.push(...getNodeList(newStatements));
	}

	return result;
}
