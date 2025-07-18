
import * as vscode from 'vscode';
import { findSections, SectionMatch } from './utils/findSections';

/**
 * Document Symbol Provider for friendly code outlines
 * Detects comment sections with pattern: # Section Name ----
 */
export class FriendlyOutlineDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  /**
   * Helper method to add child symbols to a parent symbol
   */
  private addChildSymbols(
    parentSymbol: vscode.DocumentSymbol,
    parentMatch: SectionMatch,
    allMatches: SectionMatch[],
    document: vscode.TextDocument
  ): void {
    const children = allMatches.filter(item => item.parentName == parentMatch.name);
    if (children.length > 0) {
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        const range = new vscode.Range(
          document.positionAt(child.index),
          document.positionAt(child.index + child.fullText.length));
        const configs = {
          name: child.name,
          detail: '',
          kind: vscode.SymbolKind.Function,
          range: range,
          selectionRange: range,
          children: [],
          tags: null
        }
        const childSymbol = new vscode.DocumentSymbol(
          child.name, "",
          vscode.SymbolKind.Function, range, range
        );

        console.log('++++ '.repeat(child.depth), "Added Level ", child.depth," Symbol: ", configs)
        parentSymbol.children.push(childSymbol);
      }
    }
  }

  /**
   * Main method called by VS Code when it needs symbols for a Python file
   */
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {

    // Setup
    const text = document.getText();
    const all_matches: SectionMatch[] = findSections(text);
    const matches = all_matches.filter((item: SectionMatch) => item.depth === 1);
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" + `FriendlyOutlineDocumentSymbolProvider: provideDocumentSymbols called for: "${document.fileName.split('\\').pop() || document.fileName.split('/').pop() || 'unknown'}" (${document.languageId})`);
    console.log('Found', all_matches.length, 'total matches:', all_matches);

    // Generate symbols
    const symbols: vscode.DocumentSymbol[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sectionName = match.name;
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match.fullText.length));
      const symbol = new vscode.DocumentSymbol(
        sectionName, '',
        vscode.SymbolKind.Module,  range,  range
      );
      console.log("+++ Added Level 1: ", symbol)

      // Child Level Logic
      this.addChildSymbols(symbol, match, all_matches, document);

      // Return
      symbols.push(symbol);
    }

    console.log('Returning', symbols.length, 'first level symbols:', symbols);
    return symbols;
  }

}