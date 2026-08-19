# src/utils/

Pure logic plus one thin VS Code adapter. Everything the extension knows about
section syntax lives here.

| File | Imports `vscode`? | Purpose |
| --- | --- | --- |
| `findSections.ts` | **no** | THE parser. Text → `SectionMatch[]`. |
| `sectionTree.ts` | **no** | `buildChildrenMap()` / `childrenOf()` — parent→children index. |
| `vscodeHelpers.ts` | yes | `sectionRange()` — `SectionMatch` → `vscode.Range`. |

**The vscode-free rule:** `findSections.ts` and `sectionTree.ts` must never import
`vscode`, so the test suites can call them directly. Anything needing the API goes
in `vscodeHelpers.ts` — that separation is the only reason that file exists.

## `findSections` contract

Returns a **flat, document-ordered** `SectionMatch[]` — not a tree:

- `depth` — 1–4, capped.
- `parentId` — the parent's **`uniqueId`**. Resolved by scanning backwards for the
  nearest *strictly smaller* depth; `undefined` when none exists.
- `uniqueId` — `` `${name}_${index}` ``. This is what makes duplicate section names
  addressable; **do not assume names are unique.**

## Adding a comment style

Add **one entry** to `COMMENT_PATTERNS`: a regex `source` with exactly two capture
groups — (1) the comment symbols, (2) the section name — and a `symbolUnit` (symbol
characters per depth level). Depth comes from one shared formula; there is no
per-style branch to extend.

Two things the table encodes deliberately:

- **Token quantifiers differ and are spelled out per entry.** `#` is bounded
  (`#{1,4}`), `//` and `--` are not. Generating `(#+)` would consume the 5th `#` of
  `##### Level 5 ----`, changing the parsed name — `hash-comments.test.ts` asserts
  that name to lock it in.
- **The specs are module-level data; the `RegExp` objects are built per call.** The
  `/gm` regexes carry `lastIndex`, so hoisting the compiled objects would leak state
  across documents. Keep construction inside `findSections`.

Markdown/Quarto (`markdown`/`quarto`/`md`/`qmd`/`rmd`) take a **separate table**:
native `#` headers match without `----`, and matches inside ``` fences are excluded.
