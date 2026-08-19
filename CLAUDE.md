# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`code-organizer` is a VS Code extension (publisher `ran-codes`) that turns comment
patterns like `# Section Name ----` into a navigable outline. Written in TypeScript,
bundled with esbuild.

## Commands

| Task | Command |
| --- | --- |
| Type-check + lint + dev bundle | `npm run compile` |
| Watch mode (esbuild + tsc in parallel) | `npm run watch` |
| Production bundle | `npm run package` |
| Type-check only | `npm run check-types` |
| Lint | `npm run lint` |
| Full test run | `npm run test` |
| Package a `.vsix` | `vsce package` |

Interactive testing: press `F5` to launch the Extension Development Host.

`npm run test` runs `pretest` first, which compiles tests to `out/` via
`tsc -p . --outDir out`, then runs the dev bundle and lint. `.vscode-test.mjs`
points `@vscode/test-cli` at `out/test/**/*.test.js`.

**Running a single test file:** there is no per-file npm script. Two options —
both need the tests compiled to `out/` first (`npm run compile-tests`), since
`vscode-test` runs the JS in `out/`, not the TS in `src/`:

- Narrow the `files` glob in `.vscode-test.mjs` to one file, e.g.
  `files: 'out/test/hash-comments.test.js'`, then `npx vscode-test`. Revert after.
- Add Mocha `.only()` to a `suite`/`test` in the `src/test/*.ts` file, then recompile.

## Architecture

Everything flows from a single parser. `src/utils/findSections.ts` exports
`findSections(text, languageId)`, which returns a flat, document-ordered
`SectionMatch[]`. Both consumers call it independently — there is no shared
state between them, so a parser change propagates to the whole extension:

- **`src/documentSymbolProvider.ts`** — feeds VS Code's built-in Outline,
  breadcrumbs, and Go to Symbol (`Ctrl+Shift+O`).
- **`src/treeDataProvider.ts`** — backs the custom Activity Bar TreeView
  (`codeOrganizerOutlineActivity`).

Key parser details:

- **Flat list, not a tree.** Hierarchy is expressed via `depth` (1–4, capped) and
  `parentName`, which despite its name holds the parent's **`uniqueId`**, not its
  display name. Parent resolution scans backwards for the nearest smaller depth.
- **`uniqueId` is `` `${name}_${index}` ``** — this is what makes duplicate section
  names addressable. Do not assume names are unique.
- **Markdown/Quarto take a different code path.** For `markdown`/`quarto`/`md`/
  `qmd`/`rmd`, native headers (`# Header`) are matched *without* requiring `----`,
  and matches inside ``` fences are excluded. Every other language uses the
  four dash-terminated comment regexes (`#`, `//`, `--`, JSX `{/* // ... ---- */}`).
- **Regexes are `/gm` and module-level per call** — `pattern.regex.lastIndex = 0`
  is reset after each pattern loop. Preserve that if you add a pattern.

`src/extension.ts` wires this together and owns the cursor→outline sync: a
150 ms debounced `onDidChangeTextEditorSelection` handler resolves the deepest
containing section, applies the editor decoration (`src/decorations.ts`), and
calls `treeViewActivity.reveal()`.

**`reveal()` requires cached TreeItem instances.** `CodeOrganizerTreeDataProvider`
keeps a `Map` of `uniqueId → TreeItem`; `reveal()` silently fails against freshly
constructed items. If you touch the tree provider, keep that cache intact.

## Workflow

Releases are **fully manual — there is no CI/CD** in this repo. `.github/` contains
only an issue template; there are no GitHub Actions.

The loop, in short:

1. **Develop** — branch as `feature/[issue-number]-[description]`, edit `src/`,
   `npm run compile`, `F5` to verify, add tests, `npm run test`.
2. **Metadata** — bump `version` in `package.json` (full semver — `0.1.1`, never `0.1`),
   update `CHANGELOG.md`, update `README.md` if features or screenshots changed.
3. **Local test** — `vsce package`, install the `.vsix` locally, check it by hand.
4. **GitHub** — merge the feature PRs, cut a release tagged `v[version]`.
5. **Publish** — `vsce publish` to the VS Marketplace, then confirm on Open VSX.

Each release gets a tracking issue opened from `.github/ISSUE_TEMPLATE/release.md`,
titled `[Release] v[version]`, with the checklist ticked off and the test log pasted
in as a comment. Past examples: #19, #21, #33.

Note that `vsce publish` triggers `vscode:prepublish` → `npm run package`
(`check-types` + `lint` + production esbuild). That is the **only** automated gate
in the project — a type error or lint failure blocks a publish.

**`.context/workflow.md` is the source of truth for the full checklist.** Read it
before cutting a release; the summary above is deliberately abbreviated.

## Sources of Truth

Canonical location for each fact about this project. When a fact here conflicts
with something stated elsewhere (including this file), the listed file wins.

| File | Summary | Label |
| --- | --- | --- |
| `.context/workflow.md` | End-to-end manual release checklist: develop → metadata → local test → GitHub release → publish to VS Marketplace and Open VSX. Mirrored per release as an issue from `.github/ISSUE_TEMPLATE/release.md`. | Developer workflow |
