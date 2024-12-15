import ts from "typescript";
import { TransformState } from "./TransformState";

export function getFunctionDeclaration(node: ts.Node, state: TransformState): ts.Declaration | undefined {
    const checker = state.program.getTypeChecker();

    let symbol = checker.getSymbolAtLocation(node);

    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = checker.getAliasedSymbol(symbol);
    }

    if (!symbol) return;
    if (!symbol.declarations) return;

    for (const decl of symbol.declarations) {
        if (ts.isFunctionDeclaration(decl) && decl.body?.statements) return decl;
    }

    //return symbol.valueDeclaration;
}
