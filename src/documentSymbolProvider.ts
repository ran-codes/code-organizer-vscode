
import * as vscode from 'vscode';
import { findSections, SectionMatch } from './utils/findSections';

/**
 * Document Symbol Provider for friendly code outlines
 * Detects comment sections with pattern: # Section Name ----
 */
export class FriendlyOutlineDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  /**
   * Main method called by VS Code when it needs symbols for a Python file
   */
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {

    const fileName = document.fileName.split('\\').pop() || document.fileName.split('/').pop() || 'unknown';
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    console.log(`FriendlyOutlineDocumentSymbolProvider: provideDocumentSymbols called for: "${fileName}" (${document.languageId})`);

    const text = document.getText();

    // Find all section matches
    const all_matches: SectionMatch[] = findSections(text);
    const matches = all_matches.filter((item: SectionMatch) => item.depth === 1);
    const child = all_matches.filter((item: SectionMatch) => item.depth === 2);
    console.log('Found', all_matches.length, 'total matches:', all_matches);


    // Generate symbols
    const symbols: vscode.DocumentSymbol[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sectionName = match.name;

      // Calculate positions - simple single line range
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match.fullText.length);
      const range = new vscode.Range(startPos, endPos);

      const configs = {
        name: sectionName,
        detail: '',
        kind: vscode.SymbolKind.Module,
        range: range,
        selectionRange: range,
        children: [],
        tags: null
      }
      const symbol = new vscode.DocumentSymbol(
        configs.name,
        configs.detail,
        configs.kind,
        configs.range,
        configs.selectionRange
      );
      console.log("+++ Added parent: ", configs)

      // Child logic
      if (match.name == '1. Setup') {
        const configs = {
          name: 'text-child',
          detail: 'This is a dummy child',
          kind: vscode.SymbolKind.Function,
          range: range,
          selectionRange: range,
          children: [],
          tags: null
        }
        const childSymbol = new vscode.DocumentSymbol(
          configs.name,
          configs.detail,
          configs.kind,
          configs.range,
          configs.selectionRange
        );
        
        console.log("+++ ++++ Added Child Symbol: ", configs)
        symbol.children.push(childSymbol);
      }

      // Return
      symbols.push(symbol);
    }

    console.log('Returning', symbols.length, 'first level symbols:', symbols);
    return symbols;
  }

}