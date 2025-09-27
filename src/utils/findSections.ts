// 1. Type Definitions ----
export interface SectionMatch {
  name: string;
  index: number;
  fullText: string;
  depth: number;
  parentName?: string;
  uniqueId: string; // New property: name + index for unique identification
}

// 2. Main Section Parser ----
/**
 * Find all section matches in text
 * Supports multiple comment syntaxes: #, //, --
 * Special handling for Markdown/Quarto: headers without ----
 */
export function findSections(text: string, languageId?: string): SectionMatch[] {
  // console.log(`[Code Organizer > findSections] Processing file type: ${languageId}`);
  const matches: SectionMatch[] = [];

  // Check if this is a Markdown or Quarto file
  const isMarkdownOrQuarto = languageId && ['markdown', 'quarto', 'md', 'qmd', 'rmd'].includes(languageId.toLowerCase());

  // For Markdown/Quarto files, find code block ranges to exclude from parsing
  const codeBlocks: { start: number; end: number }[] = [];
  if (isMarkdownOrQuarto) {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockStart = 0;
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = index;
        } else {
          inCodeBlock = false;
          codeBlocks.push({ 
            start: codeBlockStart, 
            end: index 
          });
        }
      }
    });
  }

  // Helper function to check if a match index is inside a code block
  const isInCodeBlock = (matchIndex: number): boolean => {
    if (!isMarkdownOrQuarto) return false;
    
    const lines = text.substring(0, matchIndex).split('\n');
    const matchLineNumber = lines.length - 1;
    
    return codeBlocks.some(block => 
      matchLineNumber >= block.start && matchLineNumber <= block.end
    );
  };

  //// 2.1 Pattern Definitions ----
  // Define patterns for different comment styles
  const patterns = isMarkdownOrQuarto ? [
    // Markdown/Quarto headers: # Header, ## Header, etc. (without requiring ----)
    { regex: /^(#{1,6})\s+(.+?)\s*$/gm, commentType: 'markdown' }
  ] : [
    // Hash comments: # Section Name ---- (Python, R, shell, etc.)
    { regex: /^[ \t]*(#{1,4})\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '#' },

    // Double slash comments: // Section Name ---- (JS, TS, C, C++, C#, Java, Go, Rust, Swift)
    { regex: /^[ \t]*(\/\/+)\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '//' },

    // SQL comments: -- Section Name ---- (SQL)
    { regex: /^[ \t]*(--+)\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '--' },

    // JSX comments: {/* // Section Name ---- */} (React, JSX, TSX)
    { regex: /^[ \t]*\{\/\*\s*(\/\/+)\s*(.+?)\s+[-]{4,}\s*\*\/\s*\}/gm, commentType: 'jsx' }
  ];

  //// 2.2 Pattern Matching Loop ----
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const commentSymbols = match[1];
      const sectionName = match[2].trim();
      let depth: number;

      ////// 2.2.1 Depth Calculation ----
      if (pattern.commentType === 'markdown') {
        // Markdown headers: depth based on number of # symbols
        // Limit to 4 levels for consistency with outline view
        depth = Math.min(commentSymbols.length, 4);
      } else if (pattern.commentType === '#') {
        // Hash comments: depth based on number of # symbols
        depth = Math.min(commentSymbols.length, 4);
      } else if (pattern.commentType === 'jsx') {
        // JSX comments: depth based on number of / symbols in //
        const baseLength = 2; // "//" = 2 characters
        depth = Math.min(Math.max(1, Math.floor(commentSymbols.length / baseLength)), 4);
      } else {
        // Other comments (//, --): depth based on repetition
        // // = depth 1, //// = depth 2, etc.
        const baseLength = pattern.commentType.length;
        depth = Math.min(Math.max(1, Math.floor(commentSymbols.length / baseLength)), 4);
      }

      ////// 2.2.2 Section Validation ----
      // Skip if section name is empty or just dashes/whitespace
      // Also skip if this match is inside a code block (for Markdown/Quarto)
      if (sectionName && !sectionName.match(/^[-\s]*$/) && !isInCodeBlock(match.index)) {

        ////// 2.2.3 Parent Resolution ----
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

        ////// 2.2.4 Match Storage ----
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

  //// 2.3 Result Sorting ----
  // Sort matches by index to maintain document order
  return matches.sort((a, b) => a.index - b.index);
}