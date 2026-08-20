# src/utils/

Pure logic plus one thin VS Code adapter. Everything the extension knows about
section syntax lives here.

| File | Imports `vscode`? | Purpose |
| --- | --- | --- |
| `findSections.ts` | **no** | THE parser. Text → `SectionMatch[]`. |
| `getCurrentSection.ts` | **no** | Cursor offset → the deepest containing section. |
| `sectionTree.ts` | **no** | `buildChildrenMap()` / `childrenOf()` — parent→children index. |
| `vscodeHelpers.ts` | yes | `sectionRange()` — `SectionMatch` → `vscode.Range`. |

**The vscode-free rule:** every file here except `vscodeHelpers.ts` must never
import `vscode`, so the test suites can call them directly. Anything needing the
API goes in `vscodeHelpers.ts` — that separation is the only reason that file
exists. Nothing in `utils/` may hold VS Code runtime state either: these are pure
functions over data, and caches keyed on a `TextDocument` belong in
`src/sectionIndex.ts` instead.

## `getCurrentSection` contract

`getCurrentSection(offset, textLength, sections)` takes plain numbers rather than
a `Position`/`TextDocument` precisely to stay on the vscode-free side of that
rule; callers pass `document.offsetAt(cursorPos)` and `document.getText().length`.

Two things it encodes:

- **The deepest containing section wins**, which reduces to *the last section
  starting at or before the offset* — nothing starts between that section and the
  cursor, and any shallower section would have terminated it before the cursor.
  That equivalence is what lets one scan replace a per-section boundary search;
  `getCurrentSection.test.ts` cross-checks it at every offset in a fixture.
- **A cursor at `offset === textLength` returns `undefined`**, because a section
  ends *before* its terminator and the last section's terminator is the end of the
  text. A known quirk (the highlight drops at the very end of a file), asserted on
  purpose. Do not "fix" it here without an issue and a changelog entry.

## `findSections` contract

Returns a **flat, document-ordered** `SectionMatch[]` — not a tree:

- `depth` — 1–4, capped.
- `parentId` — the parent's **`uniqueId`**. Resolved by scanning backwards for the
  nearest *strictly smaller* depth; `undefined` when none exists.
- `uniqueId` — `` `${name}_${index}` ``. This is what makes duplicate section names
  addressable; **do not assume names are unique.**

## Adding a comment style

Add **one entry** to `COMMENT_PATTERNS`: a regex `source` with exactly two capture
groups — (1) the **depth-bearing** symbols, (2) the section name — and a
`symbolUnit` (symbol characters per depth level). Depth comes from one shared
formula; there is no per-style branch to extend.

Three things the table encodes deliberately:

- **Group 1 is the symbol that carries depth, which is not always the comment
  token.** For `#`, `//`, `--` and JSX it is the token, repeated. For **Mermaid it
  is the hashes, not the `%%`** — `%% ## Name ----` is depth 2 with `symbolUnit: 1`.
  That is a house convention, not a language constraint (`%%%%` is a legal Mermaid
  comment, exactly as `////` is a legal JS one); the form comes from #43. Writing
  `(%%+)` with `symbolUnit: 2` instead compiles fine and yields depth 1 forever.
- **Token quantifiers differ and are spelled out per entry.** `#` is bounded
  (`#{1,4}`), `//` and `--` are not. Generating `(#+)` would consume the 5th `#` of
  `##### Level 5 ----`, changing the parsed name — `hash-comments.test.ts` asserts
  that name to lock it in. The Mermaid entry's hash ladder is bounded the same way
  and for the same reason; `mermaid-comments.test.ts` asserts its 5th-hash name too.
- **Intra-line whitespace inside an entry is `[ \t]*`, never `\s*`.** `\s` matches
  `\n`, so a `\s*` between two parts of a token lets the pattern span lines: a bare
  `%%` line would bind to a `#` header further down and emit a duplicate,
  newline-spanning section next to the hash pattern's own match for that header.
  `dashSource` already uses `[ \t]*` for its leading indent; match it.
- **The specs are module-level data; the `RegExp` objects are built per call.** The
  `/gm` regexes carry `lastIndex`, so hoisting the compiled objects would leak state
  across documents. Keep construction inside `findSections`.

Markdown/Quarto (`markdown`/`quarto`/`md`/`qmd`/`rmd`) take a **separate table**:
native `#` headers match without `----`, and matches inside ``` fences **or YAML
front matter** are excluded — both feed the same `excludedRanges` list, so there
is one exclusion check, not two.

Front matter is `---` on the *very first* line, closed by the next line that is
exactly `---` or `...` (Pandoc accepts both); `trimEnd()`, not `trim()`, because
an indented `---` is not a delimiter — and because `trimEnd()` is also what
strips the `\r` of a CRLF document.

**An unterminated block — `---` or ``` — excludes nothing.** Both scans make the
same call, and it is the rule that keeps a single miscounted delimiter from
emptying the outline: a lone top rule must not swallow every header in the file
(#44), and an unmatched fence must not swallow every header below it. The most
common unmatched fence is a user part-way through typing one, so extending it to
EOF blanks the outline mid-edit until the closing ``` lands. The trade-off is
accepted knowingly — headers below a genuinely unclosed fence show up as
sections even though Pandoc renders them as code, which beats showing nothing.

The two scans are ordered and each respects the other's territory:

- The closer search **stops at the first unindented ```** and reports no closer.
  A fence cannot open at column 0 inside real YAML, so a `---` past that point
  belongs to a code block. Without the stop, a line-1 horizontal rule plus any
  `---` inside a fence swallows every header in between. The stop is *only* at
  column 0, so a fence indented 1–3 spaces still slips a `---` through; the
  unterminated-block rule above is what bounds the damage to the known
  limitation instead of blanking the rest of the document.
- The fence scan **skips the front-matter range**. A ``` inside a block scalar
  (`desc: >`) is metadata; treating it as a fence opener pairs it with the next
  real fence in the body and excludes every header in between.

**Known limitation, asserted on purpose:** a line-1 `---` with a coincidental
later `---`/`...` is read as front matter even when both were meant as horizontal
rules, so headers between them vanish. Accepted rather than heuristically
patched — Pandoc/Quarto consume that same block as metadata, so the outline
matches what the file renders as, and a gate on "contains a `key:` line" would
both fork from Pandoc and stop excluding a comments-only block (the shape #44
actually reported). `quarto-comments.test.ts` pins it; don't "fix" it.
