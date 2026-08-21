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

`getCurrentSection(offset, sections)` takes a plain number rather than a
`Position`/`TextDocument` precisely to stay on the vscode-free side of that rule;
callers pass `document.offsetAt(cursorPos)`.

Two things it encodes:

- **The deepest containing section wins**, which reduces to *the last section
  starting at or before the offset* — nothing starts between that section and the
  cursor, and any shallower section would have terminated it before the cursor.
  That equivalence is what lets one scan replace a per-section boundary search;
  `getCurrentSection.test.ts` cross-checks it at every offset in a fixture.
- **A cursor at `offset === textLength` returns the last section**, which runs to
  the end of the text and so contains the file's final position. This falls out of
  the scan with no special case, and the function deliberately carries **no bounds
  check** — callers pass `document.offsetAt(...)`, which VS Code already clamps, and
  an out-of-range offset resolving to the last section is a harmless answer rather
  than a crash. A negative offset resolves to `undefined` for the same reason: the
  scan breaks on the first section rather than throwing. Both directions are pinned
  in `getCurrentSection.test.ts`. It used to return `undefined` here, which dropped
  the highlight at the very end of a file; fixed in #52.

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

Four things the table encodes deliberately:

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
- **`\s` inside an entry spans lines — know which gaps use it.** `\s` matches `\n`,
  so any `\s` class between two parts of a pattern lets a match run past the end of
  its line. `"#\nName ----"` and `"# Name\n----"` are each one section today, and
  have been since before the table existed. `dashSource` has **three** such gaps —
  before the name, before the dash run, and after it — plus whatever a token
  pattern spells out itself. They are **not** all in the same state:
  - **By default all three stay `\s`**, so `#`, `//`, `--` and (via its
    hand-written literal) JSX all still span lines. Harmless only while no two
    entries can claim the same line, which stopped being true when Mermaid landed —
    **#56** tracks the class, with reproductions and the options.
  - **`dashSource(token, singleLine = true)` swaps all three for `[ \t]`**, and
    inside a token pattern write `[ \t]*` directly. The Mermaid entry does both,
    because `%%` is the first token that overlaps another entry's territory: left
    spanning lines, a `%%`-and-hashes line binds to a `#` header below it and
    either duplicates that header's section or swallows it.
  - `singleLine` is **not** what makes CRLF work — `$` under `/m` treats `\r` as a
    line terminator, so a trailing `[ \t]*` parses CRLF exactly as `\s*` did.
  - `mermaid-comments.test.ts` pins every direction, including the one case #56
    leaves open: a bare `#` line above a `%%` section, where it is the *hash*
    pattern reaching forward, so no change to the Mermaid entry can close it.
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
