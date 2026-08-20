import { SectionMatch } from './findSections';

// 1. Cursor Resolution ----
/**
 * The deepest section containing `offset`, or undefined when the cursor sits
 * outside every section.
 *
 * Takes an offset and a length rather than a `vscode.Position`/`TextDocument` so
 * this module stays vscode-free and directly unit-testable; callers pass
 * `document.offsetAt(cursorPos)` and `document.getText().length`.
 *
 * `sections` must be in document order, as `findSections` returns it.
 *
 * **Why "the last section starting at or before the offset" is the deepest
 * containing one.** A section runs until the next section at the same or smaller
 * depth. Let S be the last section with `index <= offset`. Nothing starts between
 * S and the cursor, so S's terminator — if it has one — begins after the cursor,
 * and S contains the offset. Any other containing section T starts before S; if S
 * were at the same or smaller depth than T it would have terminated T before the
 * cursor, so S is strictly deeper than every other containing section. One scan
 * therefore replaces the per-section boundary search this used to do.
 *
 * **EOF returns undefined**, because a section ends *before* its terminator and
 * the final section's terminator is the end of the text. A cursor at
 * `offset === textLength` is in no section at all. That is a pre-existing quirk
 * — visible as the highlight dropping when the cursor is at the very end of a
 * file — deliberately preserved here and tracked separately, not fixed in passing.
 */
export function getCurrentSection(
  offset: number,
  textLength: number,
  sections: readonly SectionMatch[]
): SectionMatch | undefined {
  if (offset >= textLength) {
    return undefined;
  }

  let deepest: SectionMatch | undefined;
  for (const section of sections) {
    if (section.index > offset) {
      break;
    }
    deepest = section;
  }

  return deepest;
}
