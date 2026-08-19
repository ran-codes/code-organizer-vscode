# src-refactor-1: Parser table + shared utils (pure refactor)

**Branch:** `feature/[issue]-src-refactor-1-parser-utils`
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
- `npm run compile` and `npm run test` pass with no test edits other than the `parentName` → `parentId` rename.
- `parentName` no longer exists anywhere in `src/`.
- Adding a hypothetical new comment token would require only one new entry in the pattern table (no new depth branch, no hand-written regex duplication).
- Per-folder CLAUDE.md files exist (see "Folder documentation" below).

## Implementation plan

### 1. Pattern table in `src/utils/findSections.ts`
- The three dash-terminated regexes (`#`, `//`, `--` at lines ~70–76) differ only in the comment token. Generate them from a token list, e.g.:
  ```ts
  const dashPattern = (token: string) =>
    new RegExp(String.raw`^[ \t]*(${escapeRegex(token)}+)\s*(.+?)\s+[-]{4,}\s*$`, 'gm');
  ```
  The JSX pattern (`{/* // ... ---- */}`) stays hand-written — its shape differs.
- Collapse the 4-branch depth if/else (lines ~92–108) into data on the pattern object. Only two real behaviors exist:
  - `#` and markdown: `depth = min(symbols.length, 4)` → `symbolUnit: 1`
  - `//`, `--`, jsx: `depth = clamp(floor(symbols.length / unit), 1, 4)` with `unit = 2` → `symbolUnit: 2`
  One formula covers both: `depth = min(max(1, floor(symbols.length / symbolUnit)), 4)`.
- **Preserve:** `/gm` flags, `pattern.regex.lastIndex = 0` reset after each pattern loop (or construct fresh regexes per call, which makes the reset moot — either is fine, note which in the PR), markdown/quarto fence exclusion, empty-name validation, and the final sort by index.

### 2. Rename `parentName` → `parentId`
- In `SectionMatch` (findSections.ts), consumers (`documentSymbolProvider.ts:31`, `treeDataProvider.ts:10,70,76`), and all `src/test/*.ts` assertions.
- Update root `CLAUDE.md` §3: delete the "despite its name holds the parent's uniqueId" warning; state plainly that `parentId` holds the parent's `uniqueId`.

### 3. Shared children lookup — new `src/utils/sectionTree.ts`
- Export `buildChildrenMap(sections: SectionMatch[]): Map<string | undefined, SectionMatch[]>` keyed by `parentId` (`undefined` key = roots, i.e. what `depth === 1` filtering does today — verify equivalence: a depth-1 section always has `parentId === undefined` because parent resolution looks for *smaller* depth).
- Replace the scans:
  - `documentSymbolProvider.ts:31` (`allMatches.filter(item => item.parentName === ...)`)
  - `treeDataProvider.ts:10` (`hasChildren` in `SectionTreeItem` constructor)
  - `treeDataProvider.ts:64-71` (`getChildren` root + child branches)
- In `CodeOrganizerTreeDataProvider`, build the map once in `refresh()` alongside `this.sections`; pass it (not `allSections`) into `SectionTreeItem`. In the symbol provider, build it once per `provideDocumentSymbols` call.
- **Preserve:** the `treeItemCache` Map and `getOrCreateTreeItem` flow — `reveal()` silently fails without cached instances (root CLAUDE.md §3).

### 4. Range helper — add to `src/utils/sectionTree.ts` (or a small `src/utils/vscodeHelpers.ts`)
- `sectionRange(section: SectionMatch, document: vscode.TextDocument): vscode.Range` — `positionAt(index)` to `positionAt(index + fullText.length)`.
- Replace at: `documentSymbolProvider.ts:43-45` and `:79-81`, `decorations.ts:31-33`, and `extension.ts:68-73` (use `sectionRange(...).start` for the cursor position, the full range for `revealRange`).
- Note: this util imports `vscode`, so keep it separate from `findSections.ts` (pure, vscode-free — keep it that way for testability).

### 5. Folder documentation
Create a `CLAUDE.md` in **every folder under `src/`**, each describing that folder's purpose and organization, and **deferring to downstream folders' CLAUDE.md files for their details** rather than duplicating them:
- `src/CLAUDE.md` — top-level module map (extension.ts wiring, the two providers, decorations), the "everything flows from one parser" invariant, and pointers: "see `utils/CLAUDE.md` for parser/helpers, `test/CLAUDE.md` for the test layout."
- `src/utils/CLAUDE.md` — `findSections` contract (flat list, depth 1–4, `uniqueId` = `name_index`, `parentId`, markdown special path), the pattern-table extension point ("to add a comment style, add one table entry"), `sectionTree.ts` helpers, and the vscode-free rule for `findSections.ts`.
- `src/test/CLAUDE.md` — one suite per comment syntax, how they compile to `out/`, how to run a single file (mirror root CLAUDE.md §2).
Keep each under ~40 lines. Update root `CLAUDE.md` folder tree (§1) to mention the per-folder CLAUDE.md files exist.

### 6. Verify
- `npm run compile`, `npm run lint`, `npm run test` — all green.
- Manual: `F5`, open `assets/test-files/test.py`, `test.md`, `test.jsx` — Outline, Activity Bar tree, cursor-sync highlight all behave identically to `master`.
