
import * as vscode from 'vscode';
import { findSections, SectionMatch } from './utils/findSections';

/**
 * Document Symbol Provider for code organizer
 * Detects comment sections with pattern: # Section Name ----
 */
export class CodeOrganizerDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  /**
   * Helper method to add child symbols to a parent symbol (recursive)
   */
  private addChildSymbols(
    parentSymbol: vscode.DocumentSymbol,
    parentMatch: SectionMatch,
    allMatches: SectionMatch[],
    document: vscode.TextDocument,
    processedIds: Set<string> = new Set()
  ): void {
    // Prevent infinite recursion by tracking processed parent unique IDs
    if (processedIds.has(parentMatch.uniqueId)) {
      return;
    }
    processedIds.add(parentMatch.uniqueId);

    const children = allMatches.filter(item => item.parentName === parentMatch.uniqueId);
    console.log(`Looking for children of "${parentMatch.uniqueId}", found ${children.length} children`);

    if (children.length > 0) {
      for (let j = 0; j < children.length; j++) {
        const child = children[j];

        // Additional safety check to prevent infinite loops
        if (child.name === parentMatch.name) {
          continue;
        }

        const range = new vscode.Range(
          document.positionAt(child.index),
          document.positionAt(child.index + child.fullText.length));
        const childSymbol = new vscode.DocumentSymbol(
          child.name, "",
          vscode.SymbolKind.Module, range, range
        );


        // Recursively add children to this child symbol with updated processed set
        this.addChildSymbols(childSymbol, child, allMatches, document, new Set(processedIds));

        parentSymbol.children.push(childSymbol);
      }
    }
  }

  /**
   * Main method called by VS Code when it needs symbols for a file
   */
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {

    console.log('Code Organizer: provideDocumentSymbols called for', document.fileName);

    // Setup
    const text = document.getText();
    const all_matches: SectionMatch[] = findSections(text);
    const matches = all_matches.filter((item: SectionMatch) => item.depth === 1);

    console.log('Code Organizer: Found', all_matches.length, 'total sections,', matches.length, 'top-level sections');

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
        vscode.SymbolKind.File, range, range
      );

      // Child Level Logic
      this.addChildSymbols(symbol, match, all_matches, document);

      // Return
      symbols.push(symbol);
    }

    console.log('Code Organizer: Returning', symbols.length, 'symbols');
    return symbols;
  }

}