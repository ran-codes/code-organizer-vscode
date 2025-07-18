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
 * Pattern: # Section Name ----
 */
export function findSections(text: string): SectionMatch[] {
  const matches: SectionMatch[] = [];
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
        parentName: parentUniqueId, // Use parent's uniqueId instead of just name
        uniqueId: uniqueId
      });
    }
  }
  return matches;
}
