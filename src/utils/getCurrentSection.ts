import { SectionMatch } from './findSections';

// 1. Cursor Resolution ----
/**
 * The deepest section containing `offset`, or undefined when the cursor sits
 * outside every section.
 *
 * Takes a plain offset rather than a `vscode.Position`/`TextDocument` so this
 * module stays vscode-free and directly unit-testable; callers pass
 * `document.offsetAt(cursorPos)`.
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
 * **EOF resolves to the last section.** The final section runs to the end of the
 * text, so a cursor at `offset === textLength` — the last position in the file —
 * is inside it, and the scan below already says so without a special case. This
 * needs no bounds check of its own: an offset past the end still resolves to the
 * last section, which is a harmless answer rather than a crash (#52).
 */
export function getCurrentSection(
  offset: number,
  sections: readonly SectionMatch[]
): SectionMatch | undefined {
  let deepest: SectionMatch | undefined;
  for (const section of sections) {
    if (section.index > offset) {
      break;
    }
    deepest = section;
  }

  return deepest;
}
