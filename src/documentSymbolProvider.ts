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
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    console.log(`FriendlyOutlineDocumentSymbolProvider: provideDocumentSymbols called for: "${fileName}" (${document.languageId})`);

    const text = document.getText();

    // Find all section matches
    const all_matches = this.findSections(text);
    const matches = all_matches.filter(item => item.depth === 1);
    console.log('Found', all_matches.length, 'total matches:', all_matches);


    // Generate symbols
    const symbols: vscode.DocumentSymbol[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sectionName = match.name;

      // Calculate positions
      const ranges = this.calculateSymbolRanges(document, match, matches, i, text.length);
      const configs = {
        name: sectionName,
        detail: '',
        kind: vscode.SymbolKind.Module,
        range: ranges.fullRange,
        selectionRange: ranges.selectionRange,
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
      console.log("Added parent: ", configs)

      // Child logic
      if (match.name == '1. Setup') {
        const configs = {
          name: 'text-child',
          detail: 'This is a dummy child',
          kind: vscode.SymbolKind.Function,
          range: ranges.fullRange,
          selectionRange: ranges.selectionRange,
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
        
        console.log("--- Added Child Symbol: ", configs)
        symbol.children.push(childSymbol);
      }

      // Return
      symbols.push(symbol);
    }

    console.log('Returning', symbols.length, 'first level symbols:', symbols);
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
      }
    }

    return matches;
  }

  /**
   * Calculate the full range and selection range for a symbol
   */
  private calculateSymbolRanges(
    document: vscode.TextDocument,
    match: { name: string, index: number, fullText: string, depth: number, parentIndex?: number },
    allMatches: Array<{ name: string, index: number, fullText: string, depth: number, parentIndex?: number }>,
    currentIndex: number,
    textLength: number
  ): { fullRange: vscode.Range, selectionRange: vscode.Range } {
    
    const startPos = document.positionAt(match.index);
    const nextMatch = allMatches[currentIndex + 1];
    const endIndex = nextMatch ? nextMatch.index : textLength;
    const endPos = document.positionAt(endIndex);
    
    const fullRange = new vscode.Range(startPos, endPos);
    const selectionRange = new vscode.Range(startPos, document.positionAt(match.index + match.fullText.length));
    
    return {
      fullRange,
      selectionRange
    };
  }
}