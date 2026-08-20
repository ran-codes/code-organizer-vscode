# Issue #54: Sections nest under the wrong parent in mixed-syntax files

> **Status: TODO** — this is a ready-to-implement spec. An agent picking this up
> should read `src/utils/CLAUDE.md` (the `findSections` contract) and
> `src/test/CLAUDE.md` first, then follow the Implementation Steps below.

**Issue:** https://github.com/ran-codes/code-organizer-vscode/issues/54

---

## Problem Statement

`findSections` matches **one pattern at a time**, pushing into a single `matches`
array, and resolves each section's parent *inside that loop* (`findSections.ts:198-206`)
by scanning backwards for the nearest smaller depth. But `matches` is
**pattern-ordered, not document-ordered** — the sort happens only at the very end
(`:228`). So the backwards scan finds the last-pushed match of an earlier pattern
rather than the nearest preceding section.

In a `.tsx` file mixing `// Section ----` with `{/* // Section ---- */}` — a normal
way to write React:

```tsx
// Part A ----
const a = 1;

{/* //// Sub of A ---- */}
const b = 2;

// Part B ----
const c = 3;
```

`Sub of A` comes out parented to **`Part B`**, which starts after it.

### The second symptom the issue does not name: orphaned sections

Reverse the styles and it gets worse. `COMMENT_PATTERNS` order is hash → `//` →
`--` → JSX → Mermaid, so with a **JSX parent and a `//` child**:

```tsx
{/* // Part A ---- */}
//// Sub of A ----
```

the `//` pass runs first, finds `matches` empty, and resolves `Sub of A` to
`parentId: undefined`. After the sort it is a **depth-2 section with no parent** —
and per `src/CLAUDE.md`, *roots are `depth === 1`, not "no parent"*. So it is not a
root, and `buildChildrenMap` never makes a bucket for `undefined`, so it is
nobody's child either. **The section vanishes from the TreeView and the Outline
entirely** rather than merely showing up in the wrong place.

Same root cause, same fix. Test both.

### Why every existing suite passes

Within a single pattern pass, `exec` walks forward, so pushes are already in
document order and the backwards scan is correct. Only files mixing **two or more**
styles are affected. `src/test/jsx-comments.test.ts:141-151` does have a mixed
`//` + JSX fixture asserting `parentId` — it passes only because in that fixture
the correct parent happens to be the last one pushed.

### Triage (done 2026-08-20)

| Scale | Score | Notes |
| --- | --- | --- |
| Ease | 8/10 | Move an existing 8-line loop out of the match loop and run it after the sort. The algorithm does not change — only its input does. |
| Blast radius | 5/10 | The code sits on the path every language takes, but the **behavior** change is provably confined to multi-syntax files (see Decision 3). |
| Risk | 3/10 | No new algorithm, no new state. The invariant is directly assertable (Step 3). |

---

## Design Decisions (already made — do not re-litigate)

### 1. Sort first, resolve parents in a second pass. Do not try to fix the ordering of the match loop.

The issue's "suggested fix direction" offers sort-then-resolve *or* resolve-in-a-
second-pass. **They are the same thing** — take it: collect matches with no
`parentId`, sort by index, then run the resolution scan over the sorted array.

Do **not** instead try to make the match loop produce document order (merging
pattern results as you go, or running all regexes per line). That trades a 5-line
move for a restructure of the one function every feature in this extension depends
on, and buys nothing the sort does not already give.

### 2. Keep the O(n²) backwards scan. Do not replace it with a stack.

A depth-stack resolves this in O(n) and is a fine algorithm. **Not here.** The
value of this patch is that it is *provably the same computation on better input* —
a reviewer can see the loop is byte-for-byte the one that was there. A rewrite,
however elegant, has to be re-argued from scratch on a function with this much
downstream.

The cost is unchanged from today: same scan, same array length. At 500 sections
in the pathological all-same-depth case that is ~125k integer comparisons per
parse, and `SectionIndex` memoizes per document version. If it ever shows up in a
profile, the stack version is a self-contained follow-up.

### 3. Single-syntax files must produce byte-identical output — this is the safety argument.

For one pattern, `matches` is already in document order when the loop ends, so the
sort is the identity and the second-pass scan visits exactly the same predecessors
in the same order. **Markdown/Quarto included** — `MARKDOWN_PATTERNS` has exactly
one entry.

That is why **every existing per-syntax suite must pass completely unchanged.** If
any of them needs editing, the patch is wrong — stop and re-read it rather than
adjusting the test.

### 4. Preserve the two documented properties parent resolution carries.

- **Strictly decreasing depth.** A parent is always *strictly* shallower than its
  child. `documentSymbolProvider.addChildSymbols` recurses with **no cycle guard**
  and relies on this for termination (`src/CLAUDE.md`; a name-based guard was
  removed in #47). The new pass keeps it by construction — keep it that way.
- **A parentless non-root stays parentless.** A file opening with `### Foo ----`
  still yields a depth-3 section with `parentId: undefined`. That is deliberate and
  documented; this issue is not the place to change it.

### 5. Ties in the sort are a non-issue, but rely on stability rather than luck.

Two patterns cannot match at the same index today — each anchors at line start on a
distinct token — so ties should never arise. `Array.prototype.sort` is stable
(ES2019+), so if one ever does, it keeps `COMMENT_PATTERNS` order deterministically.
Do not add a tiebreaker comparator; do not assume ties are impossible in a comment.

---

## Implementation Steps

### Step 1: `src/utils/findSections.ts`

**Delete** the `3.2.2 Parent Resolution` block (`:198-206`) and drop `parentId`
from the object pushed at `:212-219` (the field is optional — omit it, do not set
`undefined`).

**Replace** section `3.3` (`:226-228`) with:

```typescript
  //// 3.3 Result Sorting ----
  // Sort into document order *before* resolving parents. The loop above runs one
  // pattern at a time, so `matches` is pattern-ordered until this point. Scanning
  // backwards through it mid-loop found the last-pushed match of an earlier
  // pattern instead of the nearest preceding section — in a file mixing two
  // comment styles that parented a subsection to a heading further down the
  // document, or to nothing at all when the child's pattern ran first (#54).
  matches.sort((a, b) => a.index - b.index);

  //// 3.4 Parent Resolution ----
  // The nearest preceding section with strictly smaller depth. Unchanged from the
  // scan this replaces — the fix is the input, not the algorithm.
  //
  // Depth strictly decreases from child to parent by construction. That is what
  // lets `documentSymbolProvider.addChildSymbols` recurse without a cycle guard;
  // preserve it if this is ever rewritten.
  for (let i = 0; i < matches.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (matches[j].depth < matches[i].depth) {
        matches[i].parentId = matches[j].uniqueId;
        break;
      }
    }
  }

  return matches;
```

Nothing else in the file changes. The pattern table, `depthFor`, the exclusion
logic, and per-call regex construction are all untouched.

### Step 2: Nothing downstream changes

`sectionTree.ts`, both providers, `sectionIndex.ts` and `cursorSync.ts` read
`parentId` and are already correct — they were being fed bad data. Confirm by
grep; do not "helpfully" adjust them.

### Step 3: New suite `src/test/mixed-syntax.test.ts`

This is the first suite that is not per-syntax, so say what it is for in a header
comment: it covers **interaction between** comment styles, which the per-syntax
suites structurally cannot reach.

Start with a shared invariant helper and run it over every fixture — it is
stronger than any single `parentId` assertion, and it is exactly what was violated:

```typescript
	// A parent must precede its child and be strictly shallower. The first half is
	// what #54 broke; the second is what keeps addChildSymbols' guard-free
	// recursion terminating.
	function assertParentsAreWellFormed(sections: SectionMatch[]) {
		for (const section of sections) {
			if (!section.parentId) { continue; }
			const parent = sections.find(s => s.uniqueId === section.parentId);
			assert.ok(parent, `dangling parentId on "${section.name}"`);
			assert.ok(parent.index < section.index, `parent of "${section.name}" starts after it`);
			assert.ok(parent.depth < section.depth, `parent of "${section.name}" is not shallower`);
		}
	}
```

Cases:

- **The issue's repro verbatim** — `//` parent, JSX child, `//` sibling after.
  Assert `Sub of A`'s `parentId === "Part A"`'s `uniqueId`, and explicitly assert
  it is **not** `Part B`'s.
- **Reversed order — the orphan case.** JSX parent, `//` child. Assert
  `parentId` is set, not `undefined`. Add a comment that this one used to make the
  section disappear from both consumers, not just misfile it.
- **Mermaid + hash** in one file (`%% # A ----` / `# B ----` / `%% ## C ----`).
  Mermaid is the **last** entry in `COMMENT_PATTERNS`, so it resolved against every
  hash match ever pushed — the same bug with the widest gap.
- **Three levels across three styles** — depth 1 / 2 / 3 each from a different
  pattern, asserting the full chain.
- **A single-syntax control fixture** — Decision 3 in test form: same file parsed
  with one style only, parents exactly as the per-syntax suites expect.

Assert **names and depths alongside `parentId`** (`src/test/CLAUDE.md`).

**Also strengthen `src/test/jsx-comments.test.ts:141-151`** — the mixed fixture that
passes by luck. Either reorder it so the correct parent is *not* the last pushed, or
add a one-line comment pointing at `mixed-syntax.test.ts`. Do not delete it.

### Step 4: Verify

```
npm run compile      # type-check + lint + dev bundle
npm run test         # full suite — every pre-existing suite must pass UNCHANGED
```

`F5` sanity check only — this needs no dedicated manual pass. Open `test-files/test.jsx`
(or drop the issue's repro into a scratch `.tsx`) and confirm the subsection sits
under the heading above it in both the built-in Outline and the Activity Bar view.

### Step 5: Docs

- **`src/utils/CLAUDE.md`** — the `findSections` contract, `parentId` bullet. It
  says *"Resolved by scanning backwards for the nearest strictly smaller depth."*
  Add **that this happens in a pass after the sort, over the document-ordered
  list**, and one clause on why: the match loop is pattern-ordered.
- **`src/utils/CLAUDE.md`, "Adding a comment style"** — worth a new line, because
  the fix buys a real guarantee: **adding a pattern can no longer change how other
  styles nest.** Before this, table position was load-bearing.
- **Repo-root `CLAUDE.md` §3** — same sentence appears there
  (*"Parent resolution scans backwards for the nearest strictly smaller depth"*).
  Keep the two in step.
- **`src/test/CLAUDE.md`** — add the `mixed-syntax.test.ts` row, and note in the
  surrounding prose that it is the one non-per-syntax parser suite.
- **`CHANGELOG.md`** — under `## [Unreleased]` → `### Fixed`. Write it for users:
  in files mixing two comment styles, subsections were filed under the wrong
  heading or dropped from the outline entirely (#54). **Do not bump the version**
  — that happens at release time per `.context/workflow.md`.
- **`.context/features/TODO__issue_43.md`** — *only if #43 has not merged yet.* Its
  Step 2 carries a blockquote warning the implementer off asserting `parentId` in
  mixed fixtures, pointing here. Once this lands that warning is wrong. If PR #55
  merged first the file is already deleted (repo convention) and there is nothing
  to do — check before editing.
- **`README.md`** — no change.

---

## Acceptance Criteria

- [ ] Parent resolution runs after the sort, over the document-ordered list
- [ ] Issue's repro: `Sub of A` parents to `Part A`, not `Part B`
- [ ] Reversed (JSX parent → `//` child) resolves a parent instead of orphaning
- [ ] Mermaid + hash mix parents correctly
- [ ] `assertParentsAreWellFormed` passes on every fixture in the new suite
- [ ] **Every pre-existing suite passes with zero edits** (Decision 3)
- [ ] `jsx-comments.test.ts` mixed fixture no longer passes by coincidence
- [ ] `npm run compile` clean (type-check + lint — the only automated gate)
- [ ] F5 sanity check on a `.tsx`/`.jsx` file
- [ ] `src/utils/CLAUDE.md` + repo-root `CLAUDE.md` describe the two-pass resolution
- [ ] `src/test/CLAUDE.md` has the new suite row
- [ ] `CHANGELOG.md` entry under `## [Unreleased]` → `### Fixed`

## Out of Scope

- Replacing the backwards scan with a depth stack (Decision 2).
- Making a parentless depth-2+ section a root. Still deliberate; still not this issue.
- Restructuring the match loop to emit in document order (Decision 1).
- **#50 / #51 / #52** — all outside the parser.

---

## Workflow Notes (for the implementing agent)

- Branch: `feature/54-mixed-syntax-parents` (pattern from `CLAUDE.md` §4 —
  `feature/[issue-number]-[description]`).
- Reference #54 in the commit/PR.
- **Land after #43 (PR #55)** if both are open — #43 adds the Mermaid pattern this
  suite tests against, and merging in the other order means editing #43's warning
  block only to delete the file later. Not a hard dependency; just less churn.
- The issue is currently **unlabeled** on GitHub. Add `bug`.
- Code-only change; release/publish steps follow `.context/workflow.md` — do not
  bump the version or publish from this task unless explicitly asked.
- On merge, delete this file (repo convention — a `TODO__issue_xx.md` on disk means
  planned-but-unshipped) and tick #54's Dev box in `_TODO.md`.
