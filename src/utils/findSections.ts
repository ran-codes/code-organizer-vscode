export interface SectionMatch {
  name: string;
  index: number;
  fullText: string;
  depth: number;
  parentName?: string;
  uniqueId: string; // New property: name + index for unique identification
}

/**
 * Find all section matches in text
 * Supports multiple comment syntaxes: #, //, --
 */
export function findSections(text: string): SectionMatch[] {
  const matches: SectionMatch[] = [];
  
  // Define patterns for different comment styles
  const patterns = [
    // Hash comments: # Section Name ---- (Python, R, shell, etc.)
    { regex: /^[ \t]*(#{1,4})\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '#' },
    
    // Double slash comments: // Section Name ---- (JS, TS, C, C++, C#, Java, Go, Rust, Swift)
    { regex: /^[ \t]*(\/\/+)\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '//' },
    
    // SQL comments: -- Section Name ---- (SQL)
    { regex: /^[ \t]*(--+)\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '--' }
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    
    while ((match = pattern.regex.exec(text)) !== null) {
      const commentSymbols = match[1];
      const sectionName = match[2].trim();
      let depth: number;
      
      if (pattern.commentType === '#') {
        // Hash comments: depth based on number of # symbols
        depth = Math.min(commentSymbols.length, 4);
      } else {
        // Other comments (//, --): depth based on repetition
        // // = depth 1, //// = depth 2, etc.
        const baseLength = pattern.commentType.length;
        depth = Math.min(Math.max(1, Math.floor(commentSymbols.length / baseLength)), 4);
      }

      // Skip if section name is empty or just dashes/whitespace
      if (sectionName && !sectionName.match(/^[-\s]*$/)) {
        // Find parent: look backwards for a section with smaller depth
        let parentName: string | undefined = undefined;
        let parentUniqueId: string | undefined = undefined;
        for (let i = matches.length - 1; i >= 0; i--) {
          if (matches[i].depth < depth) {
            parentName = matches[i].name;
            parentUniqueId = matches[i].uniqueId;
            break;
          }
        }
        
        // Create unique ID by combining name and index
        const uniqueId = `${sectionName}_${match.index}`;
        
        matches.push({
          name: sectionName,
          index: match.index,
          fullText: match[0],
          depth: depth,
          parentName: parentUniqueId,
          uniqueId: uniqueId
        });
      }
    }
    
    // Reset regex state for next iteration
    pattern.regex.lastIndex = 0;
  }
  
  // Sort matches by index to maintain document order
  return matches.sort((a, b) => a.index - b.index);
}
