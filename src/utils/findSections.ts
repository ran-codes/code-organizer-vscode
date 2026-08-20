// 1. Type Definitions ----
export interface SectionMatch {
  name: string;
  index: number;
  fullText: string;
  depth: number;
  /** The parent section's `uniqueId`, or undefined when no shallower section precedes it. */
  parentId?: string;
  uniqueId: string; // New property: name + index for unique identification
}

/**
 * A comment style, as data. To support a new comment token, add one entry to
 * COMMENT_PATTERNS — no new regex loop and no new depth branch is needed.
 */
interface PatternSpec {
  /** Regex source with exactly two capture groups: (1) comment symbols, (2) section name. */
  source: string;
  /** Characters of comment symbol per depth level (`#` = 1, `//` and `--` = 2). */
  symbolUnit: number;
}

// 2. Pattern Table ----
/**
 * Dash-terminated comment sections: `<token> Section Name ----`.
 *
 * The token pattern is spelled out per entry rather than derived, because the
 * quantifiers genuinely differ: `#` is bounded at 4 while `//` and `--` are
 * unbounded. Generating `(#+)` instead of `(#{1,4})` would change parsed names
 * — on `##### Level 5 ----` the 5th `#` is currently part of the name.
 */
const dashSource = (tokenPattern: string): string =>
  String.raw`^[ \t]*${tokenPattern}\s*(.+?)\s+[-]{4,}\s*$`;

const COMMENT_PATTERNS: PatternSpec[] = [
  // Hash comments: # Section Name ---- (Python, R, shell, etc.)
  { source: dashSource(String.raw`(#{1,4})`), symbolUnit: 1 },

  // Double slash comments: // Section Name ---- (JS, TS, C, C++, C#, Java, Go, Rust, Swift)
  { source: dashSource(String.raw`(\/\/+)`), symbolUnit: 2 },

  // SQL comments: -- Section Name ---- (SQL)
  { source: dashSource(String.raw`(--+)`), symbolUnit: 2 },

  // JSX comments: {/* // Section Name ---- */} (React, JSX, TSX)
  // Hand-written — the wrapper makes its shape different from the dash family.
  { source: String.raw`^[ \t]*\{\/\*\s*(\/\/+)\s*(.+?)\s+[-]{4,}\s*\*\/\s*\}`, symbolUnit: 2 },
];

const MARKDOWN_PATTERNS: PatternSpec[] = [
  // Markdown/Quarto headers: # Header, ## Header, etc. (without requiring ----)
  { source: String.raw`^(#{1,6})\s+(.+?)\s*$`, symbolUnit: 1 },
];

const MAX_DEPTH = 4;

/** Depth from the matched comment symbols. Covers every comment style. */
const depthFor = (symbols: string, symbolUnit: number): number =>
  Math.min(Math.max(1, Math.floor(symbols.length / symbolUnit)), MAX_DEPTH);

// 3. Main Section Parser ----
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

  // For Markdown/Quarto files, collect the line ranges to exclude from parsing:
  // YAML front matter and ``` code blocks both land in this one list.
  const excludedRanges: { start: number; end: number }[] = [];
  if (isMarkdownOrQuarto) {
    const lines = text.split('\n');

    // YAML front matter: `---` as the very first line, closed by the next
    // `---` or `...` line (Pandoc accepts both). trimEnd(), not trim() — an
    // *indented* `---` is not a delimiter in YAML/Jekyll/Quarto. trimEnd() is
    // also what strips the `\r` of a CRLF document, so every delimiter check
    // here has to keep going through it; an exact `=== '---'` compare would
    // break every CRLF file on Windows.
    //
    // The search stops at the first *unindented* ``` and reports no closer. A
    // fence cannot open at column 0 inside real YAML front matter, so a `---`
    // past that point belongs to a code block, not to metadata. Without the
    // stop, a line-1 horizontal rule plus any `---` inside a fence would
    // swallow every header in between.
    //
    // Unclosed => excluded as NOT front matter: a lone top rule must not
    // swallow every header in the file. The fence scan below follows the same
    // rule for the same reason — see the unmatched-fence note there.
    //
    // Known limitation (#44): a line-1 `---` with a coincidental later `---` or
    // `...` is taken as front matter even when both were meant as horizontal
    // rules. Accepted on purpose — Pandoc/Quarto read the same file the same
    // way, so the outline agrees with what the document renders as.
    let frontMatterEnd = -1;
    if (lines[0].trimEnd() === '---') {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trimEnd();
        if (line.startsWith('```')) break;
        if (line === '---' || line === '...') {
          frontMatterEnd = i;
          excludedRanges.push({ start: 0, end: i });
          break;
        }
      }
    }

    let inCodeBlock = false;
    let codeBlockStart = 0;

    lines.forEach((line, index) => {
      // Front matter is metadata, not document body. A ``` inside a block
      // scalar (`desc: >`) must not open a phantom fence, which would pair with
      // the next real fence in the body and exclude every header in between —
      // and leave every later fence an opener/closer out of phase.
      if (index <= frontMatterEnd) return;

      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = index;
        } else {
          inCodeBlock = false;
          excludedRanges.push({
            start: codeBlockStart,
            end: index
          });
        }
      }
    });
    // An unmatched opening fence excludes NOTHING, the same call made for an
    // unclosed `---` above. Extending it to EOF makes every header below the
    // fence vanish, and the most common way to get an unmatched fence is a user
    // part-way through typing one — the outline would blank out mid-edit and
    // come back only on the closing ```. It is also what turns any single
    // miscounted fence into a document-wide blackout: a stray ``` (an indented
    // one, or a `---` misread as a front matter closer leaving the scan a half
    // fence out of phase) silently empties the rest of the outline.
    //
    // The trade-off, stated plainly: headers below a genuinely unclosed fence
    // are reported as sections even though Pandoc would render them as code.
    // Showing a few sections that turn out to be code is strictly better than
    // showing none at all.
  }

  // Helper function to check if a match index is inside an excluded range
  const isExcluded = (matchIndex: number): boolean => {
    if (!isMarkdownOrQuarto) return false;

    const lines = text.substring(0, matchIndex).split('\n');
    const matchLineNumber = lines.length - 1;

    return excludedRanges.some(range =>
      matchLineNumber >= range.start && matchLineNumber <= range.end
    );
  };

  //// 3.1 Pattern Construction ----
  // Compile the specs fresh on every call. The RegExp objects are deliberately
  // NOT hoisted to module level: /gm regexes carry `lastIndex` between uses, and
  // per-call construction keeps that state from leaking across documents.
  const patterns = (isMarkdownOrQuarto ? MARKDOWN_PATTERNS : COMMENT_PATTERNS)
    .map(spec => ({ regex: new RegExp(spec.source, 'gm'), symbolUnit: spec.symbolUnit }));

  //// 3.2 Pattern Matching Loop ----
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const commentSymbols = match[1];
      const sectionName = match[2].trim();
      const depth = depthFor(commentSymbols, pattern.symbolUnit);

      ////// 3.2.1 Section Validation ----
      // Skip if section name is empty or just dashes/whitespace
      // Also skip if this match is inside an excluded range — a code block or
      // YAML front matter (for Markdown/Quarto)
      if (sectionName && !sectionName.match(/^[-\s]*$/) && !isExcluded(match.index)) {

        ////// 3.2.2 Parent Resolution ----
        // Find parent: look backwards for a section with smaller depth
        let parentUniqueId: string | undefined = undefined;
        for (let i = matches.length - 1; i >= 0; i--) {
          if (matches[i].depth < depth) {
            parentUniqueId = matches[i].uniqueId;
            break;
          }
        }

        ////// 3.2.3 Match Storage ----
        // Create unique ID by combining name and index
        const uniqueId = `${sectionName}_${match.index}`;

        matches.push({
          name: sectionName,
          index: match.index,
          fullText: match[0],
          depth: depth,
          parentId: parentUniqueId,
          uniqueId: uniqueId
        });
      }
    }
    // No lastIndex reset needed: each regex is built above for this call only,
    // and exec() already resets lastIndex to 0 when it returns null.
  }

  //// 3.3 Result Sorting ----
  // Sort matches by index to maintain document order
  return matches.sort((a, b) => a.index - b.index);
}
