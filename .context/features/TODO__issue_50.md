# Issue #50: Reveal never fires on any sync pass that refreshes

> **Status: CODE DONE — awaiting the F5 pass.** Steps 1-3 and 5 are implemented on
> branch `issue-50`: 109 tests passing, `npm run compile` clean. What is left is
> **Step 4**, which needs a human at the Extension Development Host — it is written
> out as the [User Checklist](#-user-checklist--the-manual-steps) below. The
> original spec is kept below unchanged as the record of what was decided.

**Issue:** https://github.com/ran-codes/code-organizer-vscode/issues/50
**Also closes (expected):** https://github.com/ran-codes/code-organizer-vscode/issues/51 — see [Issue #51](#issue-51-collapsed-parents) below. **Do not open a second PR for #51 until this one is verified.**

---

## 👤 User Checklist — the manual steps

Everything else in this doc is automatable. These are not: they need the Extension
Development Host (`F5`), which only the maintainer can drive. **Two rounds**, and the
first one has to happen on `master` *before* judging the fix.

### Round 1 — on `master`, before the fix: reproduce #51

Why first: #51 has never been reproduced — it is a reading of the code. If it does
not reproduce, it gets closed as not-a-bug rather than quietly folded into this PR
(plan §"Issue #51", step 1).

1. `git checkout master`, then `F5`.
2. In the dev host, open `assets/test-files/test.py`.
3. **Establish the baseline first.** Without typing anything, click the cursor into a
   top-level section. The Activity Bar outline **should** follow it. (This is the
   no-refresh path — it is the only path that works on `master`.)
4. Now collapse a depth-1 section that has subsections, and — still without typing —
   click into one of those subsections in the editor.
5. Open **Output → "Code Organizer"** and look for
   `No cached tree item for "…" — reveal skipped`.

| What you see | Verdict |
| --- | --- |
| Step 3 revealed fine, step 4 logged a skip and the tree did not scroll | **#51 reproduced** — tell me, it gets fixed and closed in this PR |
| Both revealed fine | **Not a bug** — tell me, I close #51 as not-a-bug and drop it from the PR |
| Even step 3 logged a skip | You typed, or the doc refreshed — that is #50 masking #51. Reopen the file and retry without touching the keyboard |

6. `git checkout issue-50` when done.

### Round 2 — on `issue-50`, after the fix: the five acceptance checks

Same as Step 4 below. **I will tell you when the code is committed and ready.**

1. **The actual bug (#50).** Open `assets/test-files/test.py`, type continuously for
   ~10 s, watch the outline track the cursor. Output Channel: **no** `reveal skipped` lines.
2. **Sidebar hijack (Decision 4)** — *the one that settles an open question*. Switch the
   sidebar to **Explorer**, then move the cursor around a sectioned file. **The Explorer
   must stay put.** Record what you saw either way; it goes in the PR body.
3. **#51.** Collapse a depth-1 section, click into one of its subsections, confirm the
   tree expands and scrolls to it.
4. **Auto-expand feel — your call to make.** `reveal()` now runs with `expand: 1`, which
   has never had an observable effect before. If it feels like it is fighting you
   (sections popping open as you move), say so and I will switch it to `expand: false`
   **in this PR** plus a CHANGELOG note. Decide now, not later.
5. **Large file.** Open the biggest sectioned file you have; confirm no typing lag.

### What to report back

- Round 1 verdict (#51 reproduced / not-a-bug).
- Check 2: did the Explorer stay put? **Yes/no — this is going in the PR body verbatim.**
- Check 4: keep `expand: 1`, or switch to `expand: false`?
- Anything from 1, 3, 5 that looked wrong.

---

## Problem Statement

`refresh()` clears `treeItemCache`; only a later `getChildren()` refills it, and
VS Code schedules that asynchronously. `cursorSync.syncPass()` never awaits
between the two:

```ts
treeDataProvider.refresh(document);                            // clears treeItemCache
// ...all synchronous...
const item = treeDataProvider.findTreeItemBySection(section);  // always undefined
```

Not a race — **deterministic**. Every pass that refreshes reads an empty cache,
and `onDidChangeTextDocument` sets `lastDocument = undefined` on every edit, so
every pass refreshes while the user is typing. The sidebar stops following the
cursor for as long as anyone is actually editing. The editor highlight keeps
working (separate path), so the failure is silent apart from the
`No cached tree item for "…" — reveal skipped` line in the Output Channel.

`src/test/treeDataProvider.test.ts` already pins it: *"Should hold no cached items
between refresh and the first getChildren"* asserts `undefined` with no async gap.

### Triage (done 2026-08-20)

| Scale | Score | Notes |
| --- | --- | --- |
| Ease | 7/10 | The fix is ~6 lines. The care goes into *why* it is safe (identity) and into the second-order UX question in Decision 4. |
| Blast radius | 5/10 | One provider method, one call site — but it turns on a code path that has **never executed in production**, so everything downstream of `reveal()` is being exercised for the first time. |
| Risk | 4/10 | Visible behavior change. Needs its own F5 pass and a CHANGELOG entry — which is exactly why it was kept out of PR #49. |

---

## Design Decisions (already made — do not re-litigate)

### 1. Create on miss. Do not take any of the three candidates in the issue literally.

The issue lists: (1) eagerly seed the cache in `refresh()`, (2) await a scheduler
turn, (3) drive the reveal from `getChildren()`. **Take none of them.** There is a
simpler fix they all talk around:

> `getOrCreateTreeItem()` is already a private memoizing factory. `findTreeItemBySection()`
> is a bare `Map.get`. Make the public method go through the factory.

That is Option 1's predictability without its cost (it builds exactly the items
needed, on demand, instead of every depth-1 item plus ancestors on every refresh
of every open document), with none of Option 2's dependence on VS Code's internal
scheduling and none of Option 3's plumbing.

**Why identity still holds — this is the whole argument, read it before changing anything.**
`reveal()` matches by object reference. It resolves an element it does not know by
walking `getParent()` to build the ancestor chain, then calling `getChildren(parent)`
and looking for the element by `===`. Both of those already route through
`getOrCreateTreeItem`, and the cache is the **single source of `SectionTreeItem`
instances**. So an item built on demand *is* the object `getChildren()` will hand
back when VS Code gets around to asking. The invariant is maintained by the cache,
not by the ordering of calls into it — which is why the ordering never needed
fixing in the first place.

### 2. Rename the method to match what it now does.

`findTreeItemBySection` → **`getTreeItemForSection`**. A method named `find…` that
constructs is a trap for the next reader.

**Do not name it `resolveTreeItem`** — `TreeDataProvider.resolveTreeItem(item, element, token)`
is a real VS Code API member, and a same-named method on this class would read as
an implementation of it.

### 3. Guard on `currentDocument`; keep the precondition documented.

Return `undefined` when `currentDocument` is unset (before any refresh) rather
than letting `getOrCreateTreeItem`'s `this.currentDocument!` build an item around
`undefined`. Beyond that, **do not add a snapshot-membership check.** Callers pass
sections from `getSections()` by contract (that is why `cursorSync` reads through
the provider at all — see `src/CLAUDE.md`), and an `O(n)` `sections.includes` on
every sync pass buys nothing the contract does not already give.

### 4. Add a `treeView.visible` guard in `cursorSync` before revealing.

Cheap, and correct regardless of the open question below: if the view is not
visible there is nothing to scroll, so the reveal is pure waste.

> **Unverified risk this also covers — check it under F5 (Step 4).** The VS Code
> docs say reveal shows the tree view if it is not already visible. If that means
> `reveal()` *opens the Code Organizer container*, then without this guard every
> cursor move would yank the sidebar away from Explorer/Search — a far worse
> regression than the bug being fixed. This has never been observable because
> reveal has never fired. **This is a reading of the docs, not a confirmed
> behavior.** The guard makes it moot either way; verify anyway and record what
> you saw in the PR.

While you are there, re-sync when the view comes back:
`treeView.onDidChangeVisibility(e => { if (e.visible) { updateHighlight(); } })`,
pushed onto `context.subscriptions` with the other listeners.

### 5. Leave `lastDocument = undefined` on edit alone.

Refreshing on every pass while typing is *correct* — sections genuinely change as
the user types. It was only a problem because refresh broke the reveal. Once it
does not, the churn is the tree doing its job.

### 6. No benchmark gate.

The `_TODO.md` row says this "needs a perf check"; that was written against
Option 1's eager seeding. Create-on-miss costs, per **miss only**, one
`SectionTreeItem` construction per link in the ancestor chain — `O(depth)`, and
depth is capped at 4. The one real cost is `getParent()`'s `this.sections.find(…)`,
`O(n)` per link, so `O(n · depth)` per miss. At 500 sections that is ~2000
comparisons per 150 ms debounce tick. Ship it; do not build a benchmark harness.

*(Optional, only if F5 shows lag on a genuinely huge file: add a `uniqueId → SectionMatch`
map alongside `childrenByParentId`. Do not do this speculatively.)*

---

## Implementation Steps

### Step 1: `src/treeDataProvider.ts`

Replace `findTreeItemBySection` (`:98-100`) with:

```typescript
  /**
   * The TreeItem for `section`, built and cached now if VS Code has not asked
   * for it yet. `section` must come from `getSections()` — the snapshot this
   * provider was last refreshed with.
   *
   * **Creating on miss is what makes `reveal()` work at all.** `refresh()` clears
   * the cache and only a later `getChildren()` refills it, so a lookup-only
   * version returned `undefined` on every pass that refreshed (#50) and for every
   * section under a collapsed parent VS Code never expanded (#51). Identity is
   * not at risk: `getOrCreateTreeItem` is the single source of instances, so the
   * item returned here is the same object a later `getChildren()` hands back —
   * which is what `reveal()` compares against by reference.
   */
  getTreeItemForSection(section: SectionMatch): SectionTreeItem | undefined {
    if (!this.currentDocument) {
      return undefined;
    }
    return this.getOrCreateTreeItem(section);
  }
```

Nothing else in the class changes. Leave `getOrCreateTreeItem` private, leave its
`this.currentDocument!` (every path into it is now guarded), and leave `getParent`
exactly as it is — it already returns cached instances, which is why the ancestor
chain works.

### Step 2: `src/cursorSync.ts`

At `:62-80`:

- Rename the call to `getTreeItemForSection`.
- **Rewrite the 8-line comment block at `:64-71`.** It currently explains, at
  length, why the miss is expected and deterministic. That explanation is the bug.
  Replace with a short note that a miss now means the section is not in the
  provider's snapshot — a real inconsistency worth logging, not routine.
- Add the visibility guard before the `try`:

  ```typescript
    // Nothing to scroll if the view is hidden — and this keeps reveal from
    // pulling the sidebar away from whatever the user has open. See #50.
    if (!treeView.visible) {
      return;
    }
  ```

Add the `onDidChangeVisibility` listener from Decision 4 to the block at `:99-127`.

### Step 3: `src/test/treeDataProvider.test.ts`

**Delete** *"Should hold no cached items between refresh and the first getChildren"*
(`:83-100`) — it asserts the bug. Replace it with the test that proves the fix is
safe, which is the one that matters most in this whole change:

```typescript
	test('Should hand out the same instance getChildren later returns', async () => {
		// The load-bearing assertion for #50. Building an item before VS Code has
		// asked for it is only safe because the cache is the single source of
		// instances — reveal() matches by reference against what getChildren()
		// returns, so these two must be the same object.
		const document = await refreshedWith('# Root ----\n');
		const section = index.getSections(document)[0];

		const onDemand = provider.getTreeItemForSection(section);
		assert.ok(onDemand);
		assert.strictEqual(provider.getChildren()[0], onDemand);
	});
```

Then add:

- **The #51 case — a child under a parent VS Code never expanded.** Call
  `provider.getChildren()` (roots only), then `getTreeItemForSection(childSection)`,
  and assert both that `getChildren(root)[0]` is that same instance **and** that
  `getParent(child) === root`. That pair is the full reveal chain for a collapsed
  parent; if it passes, #51 is fixed.
- **Stability** — two `getTreeItemForSection` calls for one section are
  `strictEqual`.
- **Before any refresh** — returns `undefined` (Decision 3).

Rename the two existing `findTreeItemBySection` call sites (`:42`, `:79-80`). They
keep their teeth: `getChildren()` runs first in both, so a cache that failed to
store would return a fresh object and fail `strictEqual`.

Update the suite header comment (`:6-16`) — it describes the silent-skip failure
mode in the present tense.

**`strictEqual` only, never `deepStrictEqual`** — per `src/test/CLAUDE.md`, the bug
class *is* identity, so deep equality would pass against a broken fix.

### Step 4: Verify

```
npm run compile      # type-check + lint + dev bundle
npm run test         # full suite
```

Then `F5` and work through all five by hand — this is the step the automated
gate cannot cover:

1. **The actual bug.** Open `assets/test-files/test.py`, type continuously for
   ~10 s, watch the Activity Bar outline track the cursor. Output Channel should
   show no `reveal skipped` lines.
2. **The sidebar-hijack risk (Decision 4).** Switch the sidebar to Explorer, then
   move the cursor around a sectioned file. **The Explorer must stay put.** Record
   the result in the PR either way — it settles an open question in the issue.
3. **#51.** Collapse a depth-1 section, click into one of its subsections in the
   editor, confirm the tree expands and scrolls to it.
4. **Auto-expand feel.** `cursorSync` passes `expand: 1`, which has never had an
   observable effect. It will now expand the section the cursor sits in, and
   `SectionTreeItem` already defaults to `Expanded`. If it feels like it is
   fighting the user, change to `expand: false` **in this PR** and say so in the
   CHANGELOG — do not leave it for later.
5. **Large file.** Open the biggest sectioned file you have; confirm no typing lag
   (Decision 6).

### Step 5: Docs

- **`src/CLAUDE.md`** — the `reveal()` gotcha bullet (`:45-53`). Delete the
  **"Known broken today (#50)"** half; keep the identity invariant, and add that
  the provider builds items on demand so a miss now means a snapshot mismatch.
- **`src/test/CLAUDE.md`** — check the `treeDataProvider.test.ts` row and the
  "Identity assertions" section. The rule is unchanged; adjust only if the prose
  implies the cache is refilled solely by `getChildren()`.
- **`CHANGELOG.md`** — under `## [Unreleased]` → `### Fixed` (heading exists,
  `:19`). Write it for users: the outline now follows the cursor while typing and
  into collapsed sections. Mention #50 and #51. **Do not bump the version** — that
  happens at release time per `.context/workflow.md`.
- **`.context/features/_TODO.md`** — tick #50's Dev box; resolve #51 per below.
- Do **not** look for `.context/refactors/src-refactor-3.md`. That folder was
  deleted in `5582bad`; `_TODO.md` row 1 still links to it and is stale.

---

## Issue #51: collapsed parents

#51 is the same root cause — lazy refill plus a silent `if (item)` guard — seen
from the other side: VS Code never calls `getChildren()` for a collapsed parent,
so its descendants are never cached. Create-on-miss builds the child *and*, via
`getParent()`, its ancestor chain. **#51 should close with no additional code.**

Unlike #50, #51 was never reproduced — it was a reading of the code. So:

1. Reproduce it **first**, on `master`, using the issue's steps (collapse a
   depth-1 section, click into a subsection, watch for the cache-miss log line).
   If it does not reproduce, say so and close #51 as not-a-bug rather than
   quietly folding it in.
2. If it does, cover it with the Step 3 test and Step 4 check 3, and close it in
   this PR — referencing both issues in the PR body.
3. Only if it survives this fix does it need its own `TODO__issue_51.md`.

---

## Acceptance Criteria

- [x] `getTreeItemForSection` builds on miss; `findTreeItemBySection` is gone
- [ ] Reveal fires on a pass that refreshed — no `reveal skipped` lines while typing
- [x] Test proves an on-demand item is `strictEqual` to what `getChildren()` later returns
- [x] Test covers the collapsed-parent chain (child instance **and** `getParent`)
- [x] `getTreeItemForSection` returns `undefined` before any refresh
- [x] `treeView.visible` guard in place; visibility-change re-sync registered
- [x] All pre-existing suites pass; `strictEqual` used throughout the identity suite
- [x] `npm run compile` clean (type-check + lint — the only automated gate)
- [ ] F5: all five checks in Step 4 done, **including** the Explorer-stays-put result recorded in the PR
- [x] `src/CLAUDE.md` no longer says the reveal is known broken
- [x] `CHANGELOG.md` entry under `## [Unreleased]` → `### Fixed`, citing #50 and #51
- [ ] #51 reproduced on `master`, then verified fixed (or closed as not-a-bug)

## Out of Scope

- **#52** (EOF edge case) — different file, different cause. Shipped separately;
  its plan doc is gone per the delete-on-merge convention.
- **#54** (wrong parent in mixed-syntax files) — parser-side, unrelated.
- Reworking the `lastDocument` / refresh-on-edit flow (Decision 5).
- Any `uniqueId → SectionMatch` index, unless Step 4 check 5 shows real lag.
- Debounce tuning. 150 ms stays.

---

## Workflow Notes (for the implementing agent)

- Branch: `feature/50-reveal-on-refresh` (pattern from `CLAUDE.md` §4 —
  `feature/[issue-number]-[description]`).
- Reference #50 **and** #51 in the commit/PR.
- Code-only change; release/publish steps follow `.context/workflow.md` — do not
  bump the version or publish from this task unless explicitly asked.
- On merge, delete this file (repo convention — a `TODO__issue_xx.md` on disk means
  planned-but-unshipped) and tick the Dev boxes in `_TODO.md`.
