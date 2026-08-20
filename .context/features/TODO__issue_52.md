# Issue #52: Cursor at EOF matches no section

> **Status: TODO** — this is a ready-to-implement spec. An agent picking this up
> should read `src/CLAUDE.md`, `src/utils/CLAUDE.md`, and `src/test/CLAUDE.md`
> first, then follow the Implementation Steps below.

**Issue:** https://github.com/ran-codes/code-organizer-vscode/issues/52

---

## Problem Statement

`getCurrentSection(offset, textLength, sections)` opens with an early return:

```typescript
if (offset >= textLength) {
  return undefined;
}
```

So with the cursor at the very last position in the file, the section highlight
drops and the TreeView reveal is skipped — even though the cursor is visually
inside the last section. The last section runs to the end of the text, so there
is nothing else it could be in.

This is **pre-existing**, not a regression. It was found during src-refactor-3
(PR #49), left alone under that refactor's no-visible-behavior-change rule, and
pinned by an assertion in `src/test/getCurrentSection.test.ts` written to be
flipped by whoever fixes it. `src/utils/CLAUDE.md` carries a matching guardrail —
*"Do not 'fix' it here without an issue and a changelog entry."* **This issue is
that issue**, and Step 5 is that changelog entry; the guardrail is satisfied, not
violated.

### Triage (done 2026-08-20)

| Scale | Score | Notes |
| --- | --- | --- |
| Ease | 9/10 | Delete four lines from a pure function. The hard part is the docs, not the code. |
| Blast radius | 3/10 | One caller, one test file. But it is a **user-visible behavior change** → own manual F5 pass + CHANGELOG entry. |
| Risk | 2/10 | The existing brute-force offset test proves the scan is right at every other position; only the EOF boundary moves. |

---

## Design Decisions (already made — do not re-litigate)

1. **Delete the guard; do not clamp.** The issue's fix sketch offers two options
   (`offset <= sectionEnd` on the final boundary, or clamp `offset` to
   `textLength - 1`). Take neither literally — **just remove the early return and
   let the scan run.** The scan already returns "the last section starting at or
   before the offset", which at `offset === textLength` is the last section: the
   correct answer, with no new special case. Clamping reaches the same result by
   adding a second branch *and* needs its own `textLength > 0` guard to avoid
   clamping to `-1`.

2. **Drop the `textLength` parameter entirely.** Once the guard is gone nothing
   reads it, and `noUnusedParameters` is commented out in `tsconfig.json` — the
   compiler will not flag it, so this is a deliberate call. New signature:

   ```typescript
   getCurrentSection(offset: number, sections: readonly SectionMatch[])
   ```

   Secondary benefit: it removes `document.getText().length` from
   `cursorSync.ts:52`, which materialized the entire document as a string on
   every debounced sync pass just to read a number. After this, the only
   `getText()` left in the extension is the one inside `sectionIndex.ts`, which
   is memoized per document version.

3. **Do not add a bounds check to replace the one removed.** Callers pass
   `document.offsetAt(pos)`, which VS Code already clamps to the document. An
   out-of-range offset now resolves to the last section, which is a harmless
   answer, not a crash.

4. **Empty documents stay `undefined` for free.** No text means no sections, so
   the scan finds nothing. No special case needed — but assert it (Step 3).

5. **Independent of #50 and #51.** Different files, different root cause. See the
   note under Step 4 about what this does and does not make observable.

---

## Implementation Steps

### Step 1: Fix the function

**Location:** `src/utils/getCurrentSection.ts`

- Delete the `if (offset >= textLength) { return undefined; }` block.
- Remove the `textLength` parameter.
- Rewrite the **third** doc-comment paragraph (the one beginning
  `**EOF returns undefined**`). It currently documents the bug as intentional;
  replace it with the new rule — a cursor at `offset === textLength` resolves to
  the last section, because the last section runs to the end of the text.
- The second paragraph mentions callers passing `document.getText().length` —
  update it, keeping the explanation of *why* the function takes a plain number
  instead of a `Position`/`TextDocument` (that reason is the vscode-free rule and
  is unchanged).

Leave the "why the last section at or before the offset is the deepest containing
one" paragraph alone — that derivation is still exactly what the scan does.

### Step 2: Update the call site

**Location:** `src/cursorSync.ts:50-54`. Drop the `document.getText().length`
argument. No other logic in `syncPass()` changes.

### Step 3: Update and extend the tests

**Location:** `src/test/getCurrentSection.test.ts`

Two edits are mandatory, and the second is easy to miss:

- **Flip the EOF test** (`'Should return undefined at the very end of the text'`).
  Rename it to something like *'Should return the last section at the very end of
  the text'*, assert `'Second'`, and replace the PRE-EXISTING QUIRK comment with a
  one-liner on the new rule. Keep the `text.length - 1` assertion below it.
- **Fix the brute-force cross-check oracle** in the last test. Its reference model
  encodes the old boundary and will now contradict the implementation:
  - loop bound `offset < text.length` → `offset <= text.length`
  - `const end = next ? next.index : text.length;` → `text.length + 1`

  Without the second change the oracle computes `undefined` at EOF and the test
  fails — and it fails for the *right* reason, so do not "fix" it by narrowing
  the loop back.

Then add coverage for the cases the removed guard used to short-circuit:

- EOF in a document with **no sections at all** → `undefined`.
- EOF in a document whose **only section starts at offset 0** → that section.
- The **empty string** (`''`, no sections) at offset 0 → `undefined`.

Every other call in the file drops its `text.length` / `plain.length` argument.

### Step 4: Verify

```
npm run compile      # type-check + lint + dev bundle
npm run test         # full suite
```

Then `F5` → open any `assets/test-files/*` fixture → put the cursor on the very
last character and confirm the **section highlight stays on** instead of clearing.

> **What you can and cannot observe under F5.** The highlight is the testable
> half. The TreeView reveal at EOF will still not fire — not because of this fix,
> but because #50 makes reveal miss on any pass that refreshed. Do not treat a
> non-revealing sidebar as this fix failing, and do not chase it into
> `cursorSync`; it resolves when #50 lands.

### Step 5: Docs

- `src/utils/CLAUDE.md` — the **`getCurrentSection` contract** section. Update the
  signature line (`getCurrentSection(offset, textLength, sections)` → two args),
  the sentence about callers passing `document.getText().length`, and rewrite the
  second bullet (`A cursor at offset === textLength returns undefined ...`) into
  the new rule. Drop the "Do not 'fix' it here" guardrail — it has been honored
  and is now stale.
- `src/test/CLAUDE.md` — the paragraph on `getCurrentSection.test.ts` ends with
  *"It also pins the EOF quirk (`offset === textLength` → `undefined`) so nobody
  quietly 'fixes' it mid-refactor."* Replace it; the suite now pins the opposite.
- `CHANGELOG.md` — add under the existing `## [Unreleased]` → `### Fixed`
  (the heading already exists, `CHANGELOG.md:19`). Do **not** bump the version;
  that happens at release time per `.context/workflow.md`.
- `.context/refactors/src-refactor-3.md` §3 ("EOF edge case") — optional one-line
  "resolved by #52" note. It is a historical record; do not rewrite it.
- `README.md` — no change. No user-facing feature surface.
- Repo-root `CLAUDE.md` — no change. It describes `getCurrentSection.ts` by role,
  not by signature.

---

## Acceptance Criteria

- [ ] Cursor at `offset === textLength` resolves to the last section
- [ ] `textLength` parameter removed; `cursorSync.ts` no longer calls `document.getText()`
- [ ] Empty document and no-sections document still return `undefined`
- [ ] Brute-force cross-check test extended to `offset <= text.length` and passing
- [ ] All pre-existing suites pass unchanged
- [ ] `npm run compile` clean (type-check + lint — the only automated gate)
- [ ] F5: highlight persists with the cursor on the last character of a file
- [ ] `src/utils/CLAUDE.md` and `src/test/CLAUDE.md` no longer describe the quirk as intended
- [ ] `CHANGELOG.md` entry under `## [Unreleased]` → `### Fixed`

## Out of Scope

- **#50 / #51** — the `treeItemCache` reveal bugs. Different file, different cause.
- Any change to how a section's *end* is computed elsewhere; `sectionRange()` and
  the providers are untouched.
- Highlighting a cursor that sits *before* the first section (correctly
  `undefined` today, and not part of this issue).

---

## Workflow Notes (for the implementing agent)

- Branch: `feature/52-eof-edge-case` (pattern from `CLAUDE.md` §4 —
  `feature/[issue-number]-[description]`).
- Reference #52 in the commit/PR.
- Code-only change; release/publish steps follow `.context/workflow.md` — do not
  bump the version or publish from this task unless explicitly asked.
- On merge, delete this file (repo convention — a `TODO__issue_xx.md` on disk
  means planned-but-unshipped) and tick #52's **Dev** box in `_TODO.md`.
