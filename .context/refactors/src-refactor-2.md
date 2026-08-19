# src-refactor-2: Remove dead defensive code in symbol provider (behavior change)

**Branch:** `feature/[issue]-src-refactor-2-dead-guards`
**Order:** Independent — can land before or after src-refactor-1. If src-refactor-1 has landed, the field is named `parentId` and line numbers in `documentSymbolProvider.ts` will have shifted; locate by symbol name, not line.

## PRD

### Goal
Delete two guards in `CodeOrganizerDocumentSymbolProvider.addChildSymbols` that protect against impossible cycles — one of which is an actual bug that silently drops legitimate sections from the Outline.

### Why the cycles are impossible
`findSections` resolves a section's parent by scanning **backwards** for the nearest section with **strictly smaller depth**. So every parent chain strictly decreases in depth and strictly decreases in document index — it must terminate. No cycle can exist in the flat list, so recursion over `parentId` links always bottoms out.

### The bug being fixed
The `child.name === parentMatch.name` skip drops any child section that happens to share a display name with its parent (e.g. `# Setup ----` containing `## Setup ----`). Names are NOT unique — that's exactly why `uniqueId` exists — so this check discards valid sections from the built-in Outline / breadcrumbs / `Ctrl+Shift+O`. The custom TreeView does **not** have this check, so today the two views can disagree; after this PR they agree.

### Non-goals
- No other logic changes in the symbol provider. No parser changes.

### Acceptance criteria
- `processedIds` parameter/logic and the name-equality skip are gone; `addChildSymbols` is a plain recursive build over the children lookup.
- New test proves a child sharing its parent's name now appears in the symbol tree.
- Existing tests pass unmodified.
- `CHANGELOG.md` notes the fix (sections sharing a name with their parent no longer disappear from the Outline).
- Per-folder CLAUDE.md files updated (see below).

## Implementation plan

### 1. `src/documentSymbolProvider.ts`
- In `addChildSymbols`: remove the `processedIds: Set<string>` parameter, the early-return/add block, and the `new Set(processedIds)` copy at the recursive call.
- Remove the `if (child.name === parentMatch.name) { continue; }` block.
- What remains: filter (or `childrenMap` lookup, post-refactor-1) → build `DocumentSymbol` → recurse → push. Add one comment stating the termination argument (parent chains strictly decrease in depth, so recursion terminates).

### 2. Tests
- Add to the relevant suite in `src/test/` (hash-comments suite is fine) a fixture like:
  ```python
  # Setup ----
  ## Setup ----
  ### Setup ----
  ```
  Assert all three appear, correctly nested, in `provideDocumentSymbols` output (and that `findSections` gives them distinct `uniqueId`s — likely already covered).

### 3. Metadata
- `CHANGELOG.md`: add under Unreleased/next version — "Fixed: sections that share a name with their parent section no longer disappear from the built-in Outline."

### 4. Folder documentation
If the per-folder CLAUDE.md files from src-refactor-1 exist, **update** them; if this PR lands first, **create** them per the spec in `src-refactor-1.md` §5 (every folder under `src/` gets its own CLAUDE.md describing that folder's organization, deferring to downstream folders' CLAUDE.md for details). Specific to this PR:
- `src/CLAUDE.md` — note that the symbol provider builds the tree by straightforward recursion; duplicate names are legal and handled via `uniqueId`.
- `src/test/CLAUDE.md` — mention the duplicate-name fixture and which suite owns it.

### 5. Verify
- `npm run test` green.
- Manual: `F5`, create a file with the duplicate-name fixture above, confirm built-in Outline and the Activity Bar TreeView now show identical trees.
