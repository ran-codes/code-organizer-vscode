import * as vscode from 'vscode';

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
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    console.log(`FriendlyOutlineDocumentSymbolProvider: provideDocumentSymbols called for: "${fileName}" (${document.languageId})`);

    const text = document.getText();
    console.log(`Document has ${document.lineCount} lines`);

    // Find all section matches
    const matches = this.findSections(text);
    console.log('Found', matches.length, 'matches:', matches);

    const symbols: vscode.DocumentSymbol[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sectionName = match.name;

      // Calculate positions
      const startPos = document.positionAt(match.index);
      const nextMatch = matches[i + 1];
      const endIndex = nextMatch ? nextMatch.index : text.length;
      const endPos = document.positionAt(endIndex);

      const fullRange = new vscode.Range(startPos, endPos);
      const selectionRange = new vscode.Range(startPos, document.positionAt(match.index + match.fullText.length));

      const symbol = new vscode.DocumentSymbol(
        sectionName,
        '',
        vscode.SymbolKind.Module,
        fullRange,
        selectionRange
      );

      // CREATE A DUMMY CHILD SYMBOL
      const childSymbol = new vscode.DocumentSymbol(
        'text-child',                    // Child name
        'This is a dummy child',         // Child detail
        vscode.SymbolKind.Function,      // Different icon for child
        fullRange,                       // Same range as parent (you could make it smaller)
        selectionRange                   // Same selection range (you could make it smaller)
      );

      // ADD THE CHILD TO THE PARENT
      symbol.children.push(childSymbol);
      symbols.push(symbol);
    }

    console.log('Returning', symbols.length, 'symbols');
    console.log(symbols)
    return symbols;
  }

  /**
   * Find all section matches in text
   * Pattern: # Section Name ----  
   **/

  private findSections(text: string): Array<{ name: string, index: number, fullText: string, depth: number, parentIndex?: number }> {
    const matches: Array<{ name: string, index: number, fullText: string, depth: number, parentIndex?: number }> = [];

    // Updated regex: capture 1-4 # symbols, followed by text, then space, then 4+ dashes
    const pattern = /^(#{1,4})\s*(.+?)\s+[-]{4,}\s*$/gm;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const hashSymbols = match[1];  // The # symbols (e.g., "#", "##", "###")
      const sectionName = match[2].trim();  // The section name text
      const depth = Math.min(hashSymbols.length, 4);  // Depth 1-4, capped at 4

      // Skip if section name is empty or just dashes/whitespace
      if (sectionName && !sectionName.match(/^[-\s]*$/)) {
        
        // Find parent: look backwards for a section with smaller depth
        let parentIndex: number | undefined = undefined;
        for (let i = matches.length - 1; i >= 0; i--) {
          if (matches[i].depth < depth) {
            parentIndex = i;
            break;
          }
        }

        matches.push({
          name: sectionName,
          index: match.index,
          fullText: match[0],
          depth: depth,
          parentIndex: parentIndex
        });
        
        const parentName = parentIndex !== undefined ? matches[parentIndex].name : 'root';
        console.log(`Found section: "${sectionName}" at position ${match.index}, depth ${depth}, parent: ${parentName}`);
      }
    }

    return matches;
  }
}