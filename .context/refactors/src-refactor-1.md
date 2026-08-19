# src-refactor-1: Parser table + shared utils (pure refactor)

**Branch:** `feature/[issue]-src-refactor-1-parser-utils` *(open the tracking issue first and fill in the number)*
**Order:** Must land **before** src-refactor-3 (which builds on the children-map util). Independent of src-refactor-2.

## PRD

### Goal
Remove the three duplication hotspots in `src/` with **zero behavior change**:
1. Depth logic and regexes in `findSections.ts` are copy-pasted per comment style.
2. Both consumers re-derive parent→child hierarchy with identical O(n²) `filter` scans.
3. `vscode.Range` construction from a `SectionMatch` is copy-pasted at 4 sites.

Also rename the misleading `SectionMatch.parentName` → `parentId` (it holds the parent's `uniqueId`, not its name — root `CLAUDE.md` §3 currently has to warn about this).

### Non-goals
- No behavior/output changes. Outline, TreeView, decorations must be byte-identical.
- Do NOT touch the dead-code guards in `documentSymbolProvider.addChildSymbols` (`processedIds`, `child.name === parentMatch.name`) — that is src-refactor-2's behavior change.
- No caching / extension.ts restructuring — that is src-refactor-3.

### Acceptance criteria
- `npm run compile` and `npm run test` pass with no test edits other than the `parentName` → `parentId` rename (plus, optionally, the added `name` assertion from §1 — no existing assertion changes).
- `parentName` no longer exists anywhere in `src/`.
- Adding a hypothetical new comment token would require only one new entry in the pattern table (no new depth branch, no hand-written regex duplication).
- Per-folder CLAUDE.md files exist (see "Folder documentation" below).

## Implementation plan

### 1. Pattern table in `src/utils/findSections.ts`
- The three dash-terminated regexes (`#`, `//`, `--` at lines ~70–76) differ in the comment token **and its quantifier** — they are NOT identical modulo token: `#` is bounded at 4 (`#{1,4}`), while `//` and `--` are unbounded (`\/\/+`, `--+`). So the table entry must carry the exact quantified token pattern; do not derive it as `token + '+'`:
  ```ts
  // each table entry carries its exact capture-group source:
  { tokenPattern: String.raw`(#{1,4})`,  symbolUnit: 1 },
  { tokenPattern: String.raw`(\/\/+)`,   symbolUnit: 2 },
  { tokenPattern: String.raw`(--+)`,     symbolUnit: 2 },

  const dashPattern = (tokenPattern: string) =>
    new RegExp(String.raw`^[ \t]*${tokenPattern}\s*(.+?)\s+[-]{4,}\s*$`, 'gm');
  ```
  Why this matters: on `##### Level 5 ----`, today's `#{1,4}` consumes four hashes and the fifth becomes part of the name (`# Level 5 ...`); a generated `(#+)` would consume all five and change the name. `src/test/hash-comments.test.ts:33` has exactly this input but asserts only `depth`, so `npm run test` would NOT catch the regression. (Optionally add a `name` assertion to that test to lock this in.)
  The JSX pattern (`{/* // ... ---- */}`) stays hand-written — its shape differs.
- Collapse the 4-branch depth if/else (lines ~92–108) into data on the pattern object. Only two real behaviors exist:
  - `#` and markdown: `depth = min(symbols.length, 4)` → `symbolUnit: 1`
  - `//`, `--`, jsx: `depth = clamp(floor(symbols.length / unit), 1, 4)` with `unit = 2` → `symbolUnit: 2`
  One formula covers both: `depth = min(max(1, floor(symbols.length / symbolUnit)), 4)`.
- **Table scope — decided:** hoist the pattern *spec table* (token patterns + `symbolUnit`, plain data) to module level; keep constructing the `RegExp` objects **inside `findSections` per call**, as the code does today (`patterns` is built at line ~65). This way the `/gm` regexes never carry `lastIndex` state across calls, matching current behavior exactly. The existing `pattern.regex.lastIndex = 0` reset (line ~143) is already redundant under this scheme — keep or delete it, but say which in the PR. Do NOT hoist the constructed `RegExp` objects themselves to module level.
- **Preserve:** `/gm` flags, markdown/quarto fence exclusion, empty-name validation, and the final sort by index.

### 2. Rename `parentName` → `parentId`
- In `SectionMatch` (findSections.ts), consumers (`documentSymbolProvider.ts:31`, `treeDataProvider.ts:10,70,76`), and all `src/test/*.ts` assertions.
- Also **delete the dead local `parentName` variable** in `findSections.ts:117-121` — it is assigned the parent's *display name* and never read (the value pushed into the match is `parentUniqueId`). Do not rename it; remove it.
- `treeDataProvider.ts:76` (`getParent`) only needs the property rename — its `find` by `uniqueId` is a *parent* lookup, not a children scan, so it is NOT replaced by `buildChildrenMap` in §3. It stays as-is.
- Update root `CLAUDE.md` §3: delete the "despite its name holds the parent's uniqueId" warning; state plainly that `parentId` holds the parent's `uniqueId`.

### 3. Shared children lookup — new `src/utils/sectionTree.ts`
- Export `buildChildrenMap(sections: SectionMatch[]): Map<string, SectionMatch[]>` keyed by `parentId` — **children only. Roots stay `depth === 1` filters** (`documentSymbolProvider.ts:72`, `treeDataProvider.ts:64-66`), unchanged. Do NOT key roots under `undefined`: `parentId === undefined` does not imply root. A file that *opens* with `### Foo ----` yields a depth-3 section with no parent — today it is excluded from both root lists; a `map.get(undefined)` root list would surface it. That's a behavior change and out of scope.
- The map must **preserve document order within each bucket** — today's `filter` over the sorted array guarantees it; a single forward pass over the (already sorted) input does too. This ordering is an invisible dependency of both consumers.
- Replace the children scans only:
  - `documentSymbolProvider.ts:31` (`allMatches.filter(item => item.parentName === ...)`)
  - `treeDataProvider.ts:10` (`hasChildren` in `SectionTreeItem` constructor)
  - `treeDataProvider.ts:69-71` (`getChildren` child branch; the root branch keeps its `depth === 1` filter)
- Scope note vs. the §Non-goals line: replacing the filter at `documentSymbolProvider.ts:31` means swapping `addChildSymbols`'s `allMatches` param for the children map — that param change IS in scope. "Do NOT touch `addChildSymbols`" means: leave the `processedIds` set and the `child.name === parentMatch.name` guard exactly as they are.
- In `CodeOrganizerTreeDataProvider`, build the map once in `refresh()` alongside `this.sections`; pass it (not `allSections`) into `SectionTreeItem`. In the symbol provider, build it once per `provideDocumentSymbols` call.
- **Preserve:** the `treeItemCache` Map and `getOrCreateTreeItem` flow — `reveal()` silently fails without cached instances (root CLAUDE.md §3).

### 4. Range helper — add to `src/utils/sectionTree.ts` (or a small `src/utils/vscodeHelpers.ts`)
- `sectionRange(section: SectionMatch, document: vscode.TextDocument): vscode.Range` — `positionAt(index)` to `positionAt(index + fullText.length)`.
- Replace at: `documentSymbolProvider.ts:43-45` and `:79-81`, and `decorations.ts:31-33`.
- `extension.ts:68-73` is **partial**: use `sectionRange(section, document).start` for the cursor position, but keep `revealRange` on an **empty range at that position** (`new vscode.Range(position, position)`), exactly as today. Passing the full range there would be a behavior change.
- Note: this util imports `vscode`, so keep it separate from `findSections.ts` (pure, vscode-free — keep it that way for testability).

### 5. Folder documentation
Create a `CLAUDE.md` in **`src/` itself and every folder under it** (`src/`, `src/utils/`, `src/test/` — three files), each describing that folder's purpose and organization, and **deferring to downstream folders' CLAUDE.md files for their details** rather than duplicating them:
- `src/CLAUDE.md` — top-level module map (extension.ts wiring, the two providers, decorations), the "everything flows from one parser" invariant, and pointers: "see `utils/CLAUDE.md` for parser/helpers, `test/CLAUDE.md` for the test layout."
- `src/utils/CLAUDE.md` — `findSections` contract (flat list, depth 1–4, `uniqueId` = `name_index`, `parentId`, markdown special path), the pattern-table extension point ("to add a comment style, add one table entry"), `sectionTree.ts` helpers, and the vscode-free rule for `findSections.ts`.
- `src/test/CLAUDE.md` — one suite per comment syntax, how they compile to `out/`, how to run a single file (mirror root CLAUDE.md §2).
Keep each under ~40 lines. Update root `CLAUDE.md` folder tree (§1) to mention the per-folder CLAUDE.md files exist.

### 6. Verify
- `npm run compile`, `npm run lint`, `npm run test` — all green.
- Manual: `F5`, open `assets/test-files/test.py`, `test.md`, `test.jsx` — Outline, Activity Bar tree, cursor-sync highlight all behave identically to `master`.
