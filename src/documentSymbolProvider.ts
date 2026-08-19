import * as vscode from 'vscode';
import { findSections, SectionMatch } from './utils/findSections';
import { buildChildrenMap, childrenOf } from './utils/sectionTree';
import { sectionRange } from './utils/vscodeHelpers';

// 1. Document Symbol Provider Class ----
/**
 * Document Symbol Provider for code organizer
 * Detects comment sections with pattern: # Section Name ----
 */
export class CodeOrganizerDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  //// 1.1 Child Symbol Processing ----
  /**
   * Helper method to add child symbols to a parent symbol (recursive)
   *
   * No cycle guard is needed: `findSections` resolves each parent by scanning
   * backwards for the nearest strictly smaller depth, so parent chains strictly
   * decrease in depth and this recursion always terminates.
   */
  private addChildSymbols(
    parentSymbol: vscode.DocumentSymbol,
    parentMatch: SectionMatch,
    childrenByParentId: Map<string, SectionMatch[]>,
    document: vscode.TextDocument
  ): void {

    ////// 1.1.1 Child Filtering ----
    const children = childrenOf(childrenByParentId, parentMatch.uniqueId);

    ////// 1.1.2 Child Symbol Creation ----
    if (children.length > 0) {
      for (let j = 0; j < children.length; j++) {
        const child = children[j];

        const range = sectionRange(child, document);
        const childSymbol = new vscode.DocumentSymbol(
          child.name, "",
          vscode.SymbolKind.Module, range, range
        );

        // Recursively add children to this child symbol
        this.addChildSymbols(childSymbol, child, childrenByParentId, document);

        parentSymbol.children.push(childSymbol);
      }
    }
  }

  //// 1.2 Main Symbol Provider Method ----
  /**
   * Main method called by VS Code when it needs symbols for a file
   */
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {

    ////// 1.2.1 Document Processing ----
    const text = document.getText();
    const languageId = document.languageId;
    const all_matches: SectionMatch[] = findSections(text, languageId);
    const childrenByParentId = buildChildrenMap(all_matches);
    const matches = all_matches.filter((item: SectionMatch) => item.depth === 1);

    ////// 1.2.2 Symbol Generation ----
    const symbols: vscode.DocumentSymbol[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sectionName = match.name;
      const range = sectionRange(match, document);
      const symbol = new vscode.DocumentSymbol(
        sectionName, '',
        vscode.SymbolKind.File, range, range
      );

      // Child Level Logic
      this.addChildSymbols(symbol, match, childrenByParentId, document);

      // Return
      symbols.push(symbol);
    }

    return symbols;
  }

}
