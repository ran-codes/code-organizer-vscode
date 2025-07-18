
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
 
    console.log('Found', all_matches.length, 'total matches:', all_matches);


    // Generate symbols
    const symbols: vscode.DocumentSymbol[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sectionName = match.name;
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match.fullText.length));
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
        const child = all_matches.filter((item: SectionMatch) => item.depth === 2)[0];
        const range = new vscode.Range(
          document.positionAt(child.index),
          document.positionAt(child.index + child.fullText.length));
        console.log("Childddd: ", child)
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