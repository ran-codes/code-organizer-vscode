export interface SectionMatch {
  name: string;
  index: number;
  fullText: string;
  depth: number;
  parentName?: string;
}

/**
 * Find all section matches in text
 * Supports patterns:
 * - # Section Name ---- (4+ dashes)
 * - # Section Name ===== (4+ equals)
 * - # Section Name ##### (4+ hashes)
 */
export function findSections(text: string): SectionMatch[] {
  const matches: SectionMatch[] = [];
  
  // Enhanced pattern to support dashes, equals, and hashes as separators
  // Also handles various comment styles (//, /*, --, etc.)
  const patterns = [
    // Hash-style comments: # Section Name ---- (exactly 4 separators, no more)
    /^(#{1,4})\s*(.+?)\s+([-=]{4}|#{4})\s*$/gm,
    // Double-slash comments: // Section Name ---- (exactly 4 separators, no more)
    /^(\/\/+)\s*(.+?)\s+([-=]{4}|#{4})\s*$/gm,
    // SQL/Ada-style comments: -- Section Name ---- (exactly 4 separators, no more)
    /^(--+)\s*(.+?)\s+([-=]{4}|#{4})\s*$/gm,
    // C-style block comments: /* Section Name ---- */ (exactly 4 separators, no more)
    /^\/\*\s*(.+?)\s+([-=]{4}|#{4})\s*\*\/\s*$/gm
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    
    while ((match = pattern.exec(text)) !== null) {
      let depth: number;
      let sectionName: string;
      
      if (match[0].startsWith('#')) {
        // Hash-style: use number of # symbols for depth
        const hashSymbols = match[1];
        depth = Math.min(hashSymbols.length, 4);
        sectionName = match[2].trim();
      } else if (match[0].startsWith('/*')) {
        // Block comment style: depth 1
        depth = 1;
        sectionName = match[1].trim();
      } else {
        // Other comment styles: use number of comment chars for rough depth
        const commentSymbols = match[1];
        depth = Math.min(Math.max(1, Math.floor(commentSymbols.length / 2)), 4);
        sectionName = match[2].trim();
      }

      // Skip if section name is empty or just separators/whitespace
      if (sectionName && !sectionName.match(/^[-=#\s]*$/)) {
        // Find parent: look backwards for a section with smaller depth
        let parentName: string | undefined = undefined;
        for (let i = matches.length - 1; i >= 0; i--) {
          if (matches[i].depth < depth) {
            parentName = matches[i].name;
            break;
          }
        }
        
        matches.push({
          name: sectionName,
          index: match.index,
          fullText: match[0],
          depth: depth,
          parentName: parentName
        });
      }
    }
  }
  
  return matches.sort((a, b) => a.index - b.index);
}
