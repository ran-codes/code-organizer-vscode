# src-refactor-2: Remove dead defensive code in symbol provider (behavior change)

**Issue:** [#47](https://github.com/ran-codes/code-organizer-vscode/issues/47) — this PR closes it.
**Branch:** `feature/47-src-refactor-2-dead-guards`
**Order:** src-refactor-1 has already landed (PR #46), so the code uses `parentId` /
`childrenOf()` and the per-folder CLAUDE.md files exist. Locate code by symbol name,
not by line number.

## PRD

### Goal
Delete two guards in `CodeOrganizerDocumentSymbolProvider.addChildSymbols`
(`src/documentSymbolProvider.ts`) that protect against impossible cycles — one of
which is an actual bug that silently drops legitimate sections from the Outline.

### Why the cycles are impossible
Two independent reasons; either alone suffices:

1. `findSections` resolves a section's parent by scanning **backwards** for the
   nearest section with **strictly smaller depth**. Every parent chain strictly
   decreases in both depth and document index, so it must terminate. No cycle can
   exist in the flat list, so recursion over `parentId` links always bottoms out.
2. `processedIds` is dead even ignoring (1): it is copied per branch
   (`new Set(processedIds)` at the recursive call), and each section has exactly
   one parent, so a node is only ever reachable by one path. The set can never
   dedup anything.

### The bug being fixed
The `child.name === parentMatch.name` skip drops any child section that shares a
display name with its **direct parent**. Because the `continue` fires *before* both
the recursive descent and the `push`, the **entire subtree** under that child
vanishes — not just one node. Names are NOT unique — that's exactly why `uniqueId`
(`` `${name}_${index}` ``) exists — so this check discards valid sections from the
built-in Outline / breadcrumbs / `Ctrl+Shift+O`.

The custom TreeView (`treeDataProvider.ts`) has no such check, so today the two
views can disagree. Repro (from #47):

```python
# Setup ----
## Setup ----
### Details ----
#### Deep ----
```

Built-in Outline today shows only `Setup` (3 of 4 sections gone); the Activity Bar
TreeView shows all four. After this PR both show all four.

### Non-goals
- No other logic changes in the symbol provider. No parser changes. No changes to
  `treeDataProvider.ts` (it is already correct).

### Acceptance criteria
- [ ] `processedIds` parameter/logic and the name-equality skip are gone;
      `addChildSymbols` is a plain recursive build over the children lookup.
- [ ] New test proves a child sharing its parent's name — **and its descendants** —
      appears correctly nested in the symbol tree.
- [ ] Existing tests pass unmodified (`npm run test` green).
- [ ] `CHANGELOG.md` notes the fix.
- [ ] `src/CLAUDE.md` and `src/test/CLAUDE.md` updated (see §4).

## Implementation plan

### 1. `src/documentSymbolProvider.ts`
In `addChildSymbols`:

- Remove the `processedIds: Set<string> = new Set()` parameter. (The call site in
  `provideDocumentSymbols` never passes it, so it needs no edit.)
- Remove the `////// 1.1.1 Recursion Prevention ----` block entirely (the section
  comment header, the `if (processedIds.has(...))` early return, and the
  `processedIds.add(...)`). Renumber the remaining `1.1.x` section comments.
- Remove the `if (child.name === parentMatch.name) { continue; }` block and its
  "Additional safety check" comment.
- At the recursive call, drop the `new Set(processedIds)` argument.
- What remains: `childrenOf()` lookup → build `DocumentSymbol` → recurse → push.
  Add one comment stating the termination argument: *parent chains strictly
  decrease in depth, so recursion over the children map always terminates.*

### 2. Tests — new file `src/test/documentSymbolProvider.test.ts`
Do **not** add this to the hash-comments suite: the existing syntax suites are
deliberately vscode-free (they import only `src/utils/`). This test must exercise
`provideDocumentSymbols`, which needs `vscode`, so it gets its own file — tests run
inside the extension host via `@vscode/test-cli`, so `import * as vscode` works there.

Pattern:

```ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeOrganizerDocumentSymbolProvider } from '../documentSymbolProvider';

suite('Document Symbol Provider', () => {
  test('child sharing its parent name (and its subtree) appears in the symbol tree', async () => {
    const content = '# Setup ----\n## Setup ----\n### Details ----\n#### Deep ----\n';
    const doc = await vscode.workspace.openTextDocument({ content, language: 'python' });
    const provider = new CodeOrganizerDocumentSymbolProvider();
    const symbols = provider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token);

    // one root: Setup
    assert.strictEqual(symbols.length, 1);
    assert.strictEqual(symbols[0].name, 'Setup');
    // its child is also named Setup (the previously dropped node)...
    assert.strictEqual(symbols[0].children.length, 1);
    assert.strictEqual(symbols[0].children[0].name, 'Setup');
    // ...and the subtree under it survived
    assert.strictEqual(symbols[0].children[0].children[0].name, 'Details');
    assert.strictEqual(symbols[0].children[0].children[0].children[0].name, 'Deep');
  });
});
```

The distinct-`uniqueId` behavior for duplicate names is already covered by the
parser suites — no new parser test needed.

### 3. Metadata
`CHANGELOG.md` currently has no `Unreleased` section (newest entry is `[0.1.0]`;
`package.json` is at `0.1.1`). Add one at the top:

```md
## [Unreleased]

### Fixed

- Sections that share a name with their parent section no longer disappear
  (together with their entire subtree) from the built-in Outline, breadcrumbs,
  and Go to Symbol (#47)
```

Do **not** bump `package.json` version in this PR — that happens at release time
per `.context/workflow.md`.

### 4. Folder documentation
Both files exist (created in PR #46) — **update**, don't create:

- `src/CLAUDE.md` — in the Gotchas section, note: the symbol provider builds its
  tree by plain recursion over the children map (termination guaranteed by strictly
  decreasing depth); duplicate section names are legal and identity is always
  `uniqueId`, never `name`.
- `src/test/CLAUDE.md` — add `documentSymbolProvider.test.ts` to the file table
  (covers: symbol tree construction, duplicate-name fixture). Also amend the intro
  sentence claiming all suites are vscode-free: the syntax/util suites still are,
  but this suite imports `vscode` because it tests a provider.

### 5. Verify
- `npm run test` green (runs compile-tests + compile + lint first via `pretest`).
- Manual: `F5`, open a scratch file in `test-files/` with the repro fixture above,
  confirm the built-in Outline and the Activity Bar TreeView now show identical
  four-node trees.
