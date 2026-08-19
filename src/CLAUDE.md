# src/

All extension TypeScript. Nothing outside this folder compiles into the product —
esbuild bundles from `extension.ts` into `dist/extension.js`, and that bundle *is*
the extension. A file not reachable from `extension.ts` does not exist at runtime.

## Layout

| Path | Role |
| --- | --- |
| `extension.ts` | `activate()` / `deactivate()`. Registers the symbol provider, creates the Activity Bar TreeView, owns the cursor→outline sync. |
| `documentSymbolProvider.ts` | Feeds VS Code's built-in Outline, breadcrumbs, and Go to Symbol. |
| `treeDataProvider.ts` | Backs the custom Activity Bar TreeView (`codeOrganizerOutlineActivity`). |
| `decorations.ts` | The current-section editor highlight (`TextEditorDecorationType`). |
| `utils/` | The parser and the shared helpers. See `utils/CLAUDE.md`. |
| `test/` | Mocha suites, one per comment syntax. See `test/CLAUDE.md`. |

## The one invariant

**Everything flows from a single parser.** `utils/findSections.ts` exports
`findSections(text, languageId)`; the symbol provider and the tree provider each
call it independently and share no state. A parser change therefore propagates to
the whole extension at once — which is the point, and the thing to be careful about.

Two shared helpers sit between the parser and its consumers:

- `utils/sectionTree.ts` — `buildChildrenMap()`, the parent→children index both
  consumers use instead of re-scanning the flat list.
- `utils/vscodeHelpers.ts` — `sectionRange()`, the one place a `SectionMatch`
  becomes a `vscode.Range`.

## Gotchas

- **`TreeView.reveal()` requires cached TreeItem instances.**
  `CodeOrganizerTreeDataProvider` keeps `treeItemCache` (`uniqueId` → `SectionTreeItem`);
  `reveal()` silently fails against freshly constructed items. Keep that cache intact.
- **Roots are `depth === 1`, not "no parent."** A file opening with `### Foo ----`
  produces a depth-3 section with no parent that is deliberately *not* a root.
- **`extension.ts` reveals an empty range** at the section start, so jumping to a
  section centers the line without selecting it. Do not pass the full section range.
- Cursor sync is debounced at 150 ms in `onDidChangeTextEditorSelection`.

See the repo-root `CLAUDE.md` for build commands and the release workflow.
