# src/

All extension TypeScript. Nothing outside this folder compiles into the product —
esbuild bundles from `extension.ts` into `dist/extension.js`, and that bundle *is*
the extension. A file not reachable from `extension.ts` does not exist at runtime.

## Layout

| Path | Role |
| --- | --- |
| `extension.ts` | `activate()` / `deactivate()`. **Wiring only** — read config, register providers/commands/TreeView, delegate. No sync logic. |
| `cursorSync.ts` | The cursor→outline sync: 150 ms debounce, highlight, TreeView reveal, and the three editor listeners. Owns its disposables. |
| `sectionIndex.ts` | One `findSections` call per (document URI, `document.version`, `document.languageId`), shared by both providers. |
| `documentSymbolProvider.ts` | Feeds VS Code's built-in Outline, breadcrumbs, and Go to Symbol. |
| `treeDataProvider.ts` | Backs the custom Activity Bar TreeView (`codeOrganizerOutlineActivity`). |
| `decorations.ts` | The current-section editor highlight (`TextEditorDecorationType`). |
| `log.ts` | `log()` → the "Code Organizer" Output Channel. |
| `utils/` | The parser and the pure helpers. See `utils/CLAUDE.md`. |
| `test/` | Mocha suites — one per comment syntax, plus one per non-parser module. See `test/CLAUDE.md`. |

Flow: `extension.ts` → `cursorSync.ts` → `sectionIndex.ts` → providers → `utils/`.

## The one invariant

**Everything flows from a single parser.** `utils/findSections.ts` exports
`findSections(text, languageId)`; the symbol provider and the tree provider both
read it through `sectionIndex.ts`, which parses once per document version *and*
language. The index is a memo, not a second source of truth — a parser change
still propagates to the whole extension at once, which is the point and the thing
to be careful about.

The index hands out `readonly SectionMatch[]` / `ReadonlyMap`, so the shared
snapshot cannot be mutated out from under the other consumer. Keep it that way;
the sharing is only safe because nobody can write to it.

Two shared helpers sit between the parser and its consumers:

- `utils/sectionTree.ts` — `buildChildrenMap()`, the parent→children index both
  consumers use instead of re-scanning the flat list.
- `utils/vscodeHelpers.ts` — `sectionRange()`, the one place a `SectionMatch`
  becomes a `vscode.Range`.

## Gotchas

- **`TreeView.reveal()` requires cached TreeItem instances.**
  `CodeOrganizerTreeDataProvider` keeps `treeItemCache` (`uniqueId` → `SectionTreeItem`);
  `reveal()` matches by object reference, so it silently fails against freshly
  constructed items — including anywhere up the `getParent()` chain, which reveal
  also walks. Keep that cache intact; `test/treeDataProvider.test.ts` locks it.
  The provider therefore **builds items on demand**: `getTreeItemForSection()`
  routes through the same memoizing factory `getChildren()` and `getParent()` use,
  so an item built before VS Code has asked for it *is* the object it will later
  hand back. That is what makes the reveal fire on a pass that refreshed (#50).
  It returns `undefined` for a section outside the current snapshot, and that
  guard is load-bearing: it is the only entry point that would key a cache write
  on a section the **caller** supplied rather than one the provider read out of
  its own `sections` / `childrenByParentId` (`getChildren()` and `getParent()`
  write to the cache too — they just cannot be handed a foreign section).
  `uniqueId` is unique only within a snapshot, so a colliding stale id would
  otherwise cache an item carrying a stale section and document. Do not turn the
  method back into a bare `Map.get`, and do not drop the snapshot check.
- **Collapsing a section does not evict anything — items default to `Expanded`.**
  `SectionTreeItem`'s constructor sets `TreeItemCollapsibleState.Expanded` for
  every section that has children, so VS Code fetches those children at render
  time and caches them before the user can collapse anything; collapsing clears
  neither VS Code's node map nor `treeItemCache`. This is almost certainly why
  #51 ("sections under a collapsed parent are never cached") never reproduced —
  the premise does not hold for this provider. Do not restate that premise as
  fact anywhere: it was written into three files during #50 and none of it was
  true. **What `refresh()` does to the user's collapse state is unverified — do
  not assert it either way without watching it in the Extension Development
  Host.** It clears the cache and fires the change event, so items are rebuilt as
  `Expanded`; but `SectionTreeItem` never sets `TreeItem.id`, and VS Code then
  derives an id from the label (`section.name`) and uses it "to preserve the
  selection and expansion state" — stable across a refresh that does not rename
  anything. So the plausible outcome is the opposite: collapse state survives an
  ordinary edit and breaks only when a section is renamed. Note also that the
  refresh is per *edit*, not per section change — `cursorSync` clears
  `lastDocument` on any `onDidChangeTextDocument`.
- **`cursorSync` resolves sections through `treeDataProvider.getSections()`, never
  `SectionIndex` directly.** It refreshes the tree and then reads back from it, so
  the `uniqueId`s it looks up belong to the same snapshot `treeItemCache` was built
  from. Reading the version-keyed index instead would let the sync sit a version
  ahead of the tree and quietly stop revealing.
- **Diagnostics go through `log()`, not `console.log`.** The Output Channel is
  readable by users in the field; the devtools console is not. The tree-item-miss
  branch in `cursorSync` logs deliberately rather than returning in silence.
- **`cursorSync` skips the reveal while the TreeView is hidden.** There is nothing
  to scroll, and `reveal()` is documented to show the view if it is not already
  visible — which would yank the sidebar off whatever the user has open. A
  `treeView.onDidChangeVisibility` listener re-syncs when it comes back (#50).
- **Roots are `depth === 1`, not "no parent."** A file opening with `### Foo ----`
  produces a depth-3 section with no parent that is deliberately *not* a root.
- **Section identity is `uniqueId`, never `name`.** Duplicate names are legal and
  expected. `documentSymbolProvider.addChildSymbols` builds its tree by plain
  recursion over the children map with no cycle guard — termination is guaranteed
  because parent chains strictly decrease in depth. A name-based guard used to live
  there and silently dropped whole subtrees (#47); don't reintroduce one.
- **`extension.ts` reveals an empty range** at the section start, so jumping to a
  section centers the line without selecting it. Do not pass the full section range.
- Cursor sync is debounced at 150 ms in `onDidChangeTextEditorSelection`.

See the repo-root `CLAUDE.md` for build commands and the release workflow.
