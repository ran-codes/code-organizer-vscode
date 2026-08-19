# src-refactor-3: Extension wiring — cursor-sync module + shared parse cache

**Branch:** `feature/[issue]-src-refactor-3-wiring-cache`
**Order:** Requires **src-refactor-1** (uses `buildChildrenMap` / `sectionTree.ts` and the `parentId` rename). Independent of src-refactor-2.

## PRD

### Goal
1. `activate()` in `src/extension.ts` is ~200 lines and defines the entire cursor→outline sync inline (`getCurrentSection`, `updateHighlight`, debounce state). Extract it into a dedicated module and make the pure logic unit-testable.
2. Every document is parsed twice — VS Code calls `CodeOrganizerDocumentSymbolProvider.provideDocumentSymbols` (calls `findSections`) and `CodeOrganizerTreeDataProvider.refresh` calls `findSections` again on the same text. Add a small shared cache so both consumers share one parse.

### Non-goals
- No parser logic changes. No visible behavior change (same outline, same highlight, same 150 ms debounce).
- No new configuration options.

### Acceptance criteria
- `extension.ts` `activate()` is wiring only: read config, register providers/commands/listeners, delegate. Target well under 100 lines.
- `getCurrentSection` lives in `src/utils/` (vscode-type-light, unit-testable) with new unit tests covering: cursor before any section, inside a depth-1 section, inside a nested section (returns deepest), after the last section.
- One `findSections` call per (document URI, `document.version`) — verifiable by a temporary log or a spy in tests.
- `reveal()` still works: the `treeItemCache` invariant in `CodeOrganizerTreeDataProvider` is untouched (root CLAUDE.md §3 — reveal silently fails on non-cached instances).
- Per-folder CLAUDE.md files updated (see below).

## Implementation plan

### 1. Parse cache — new `src/sectionIndex.ts` (or extend `src/utils/sectionTree.ts` if it stays vscode-free; the cache needs `vscode.TextDocument`, so a separate top-level module is cleaner)
- Export a small class/module:
  ```ts
  getSections(document: vscode.TextDocument): SectionMatch[]
  getChildrenMap(document: vscode.TextDocument): Map<string | undefined, SectionMatch[]>
  ```
  Cache key: `document.uri.toString()`; invalidate when stored `document.version` differs. A single-entry or small Map cache is plenty — no eviction sophistication needed.
- Consumers:
  - `documentSymbolProvider.ts`: take the index via constructor; replace its direct `findSections` call.
  - `treeDataProvider.ts`: `refresh()` pulls `sections` + children map from the index instead of calling `findSections`. Keep firing `_onDidChangeTreeData` and clearing `treeItemCache` exactly as today.
- Note: the existing `onDidChangeTextDocument` listener in extension.ts only resets `lastDocument`; version-keyed caching makes staleness handling automatic, but keep the listener behavior equivalent.

### 2. Cursor-sync module — new `src/cursorSync.ts`
- Move from `extension.ts`: `updateHighlight`, the `updateTimeout`/`lastDocument` state, and the three listeners (`onDidChangeTextEditorSelection` with 150 ms debounce, `onDidChangeActiveTextEditor`, `onDidChangeTextDocument`).
- Shape: a `registerCursorSync(context, treeView, treeDataProvider, sectionIndex, decoration)` function (or small class) that pushes its own disposables onto `context.subscriptions`. `extension.ts` calls it once.
- Replace the scattered `console.log` calls with a single module-level `log()` helper (or a `vscode.OutputChannel` named "Code Organizer") so debug output has one on/off switch.

### 3. Pure logic — move `getCurrentSection` to `src/utils/getCurrentSection.ts`
- Signature change to make it vscode-free and testable: `getCurrentSection(offset: number, textLength: number, sections: SectionMatch[]): SectionMatch | undefined` — caller does `document.offsetAt(cursorPos)` / `getText().length`.
- While moving, fix the incidental O(n²): sections are sorted by index, so the "next section at same-or-smaller depth" boundary can be found with a forward scan from the current section's position instead of `sections.find` per section. Keep the "deepest containing section wins" semantics exactly.
- New unit test file `src/test/getCurrentSection.test.ts` covering the four cases in the acceptance criteria. These tests need no VS Code host if the function is pure — but they run under the same vscode-test harness as the rest, which is fine.

### 4. `src/extension.ts` after the dust settles
Remains: activation message (consider dropping the popup — an info toast on every startup is noisy; at minimum move it behind the debug log), config read + enable check, provider registrations, TreeView creation, decoration init, `goToSection` / `showView` / `activate` commands, config-change listener, one `registerCursorSync(...)` call, initial highlight kick.

### 5. Folder documentation
Update every per-folder CLAUDE.md created in src-refactor-1 (create them per `src-refactor-1.md` §5 if they don't exist — every folder under `src/` gets one, describing that folder's organization and deferring to downstream folders' CLAUDE.md for details):
- `src/CLAUDE.md` — new module map: `extension.ts` (wiring only) → `cursorSync.ts` (sync + debounce) → `sectionIndex.ts` (single shared parse, version-keyed) → providers → `utils/`. State the invariants: one parse per document version; `treeItemCache` required for `reveal()`.
- `src/utils/CLAUDE.md` — add `getCurrentSection.ts` (pure, deepest-containing-section rule) and the rule that nothing in `utils/` may hold vscode runtime state.
- `src/test/CLAUDE.md` — add the pure-logic unit test file and how it differs from the syntax suites.

### 6. Verify
- `npm run compile`, `npm run lint`, `npm run test` — green.
- Manual `F5` pass: open `assets/test-files/test.py` and `test.md`; confirm (a) outline + tree identical to master, (b) cursor movement still highlights and reveals with the same feel (150 ms debounce), (c) editing the document refreshes the tree, (d) switching editors re-syncs.
