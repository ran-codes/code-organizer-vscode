# src/test/

Mocha suites — **one file per comment syntax**, plus one per non-parser module. The
syntax and util suites call `src/utils/` directly, which is possible only because
those modules never import `vscode`. The provider suite is the exception: it imports
`vscode` and builds documents with `workspace.openTextDocument`, which works because
`vscode-test` runs everything inside the extension host.

| File | Covers |
| --- | --- |
| `hash-comments.test.ts` | `# Section ----` (Python, R, shell) |
| `double-slash-comments.test.ts` | `// Section ----` (JS/TS, C-family, Go, Rust, Swift) |
| `sql-comments.test.ts` | `-- Section ----` |
| `jsx-comments.test.ts` | `{/* // Section ---- */}` |
| `mermaid-comments.test.ts` | `%% # Section ----` — depth from the hashes, `%%{init:…}%%` ignored |
| `md-comments.test.ts` · `quarto-comments.test.ts` | Native `#` headers, fence exclusion |
| `sectionTree.test.ts` | `buildChildrenMap()` / `childrenOf()` — not a syntax suite |
| `getCurrentSection.test.ts` | Cursor offset → deepest containing section — pure logic, no host needed |
| `sectionIndex.test.ts` | The shared parse cache: one parse per document version *and* language |
| `documentSymbolProvider.test.ts` | Symbol-tree construction — nesting, roots, and the duplicate-name fixture from #47 |
| `treeDataProvider.test.ts` | TreeItem **instance identity** — the `reveal()` invariant, including items built on demand (#50/#51) |

Each syntax suite covers the same axes: basic detection, nesting/depth, `uniqueId`
generation, invalid patterns that must be ignored, and indentation (spaces, tabs,
mixed).

`sectionTree.test.ts` locks the two invariants the consumers depend on silently:
parentless sections never become map keys (`parentId === undefined` is not a root
marker), and sibling order within a bucket is document order — which holds only
because `findSections` sorts by index before returning.

`getCurrentSection.test.ts` is the pure-logic suite: no `vscode` import, no
documents, just offsets and a section list. It differs from the syntax suites in
what it covers rather than how it runs — those assert what the *parser* produces,
this asserts which section a *cursor* lands in. It pins the EOF rule
(`offset === textLength` → the **last section**, since that section runs to the end
of the text) from both directions: a dedicated test, and the brute-force oracle in
the last test, whose loop bound and final `end` both run one past `text.length` to
cover it. Those two bounds fail differently, and the difference is why the rule is
pinned twice. Narrowing the final `end` back to `text.length` is self-enforcing:
the oracle then disagrees with the implementation at EOF and the test fails loudly.
Narrowing the loop bound back to `offset < text.length` is **silent** — the EOF
assertion stops running and the oracle still passes, having quietly dropped the one
case it was widened for. The dedicated test is the backstop for that one.

## Identity assertions — use `strictEqual`, never `deepStrictEqual`

`treeDataProvider.test.ts` and `sectionIndex.test.ts` both assert **object
identity**, and for both the bug class *is* identity. `TreeView.reveal()` matches
elements by object reference, so a rebuilt TreeItem with identical field values is
exactly the failure mode — `deepStrictEqual` would pass against a broken refactor
and give false confidence. That is load-bearing twice over now: the provider builds
TreeItems on demand rather than waiting for `getChildren()` to refill the cache, and
the only thing making that safe is that the cache is the **single source** of
instances. The test asserting an on-demand item is `strictEqual` to what
`getChildren()` later returns is what pins it. Same for the parse cache: two structurally-equal arrays
are what a *missing* cache produces, so only `strictEqual` proves one parse
happened. Neither needs a spy or a module mock as a result.

Both invariants used to live only in prose. The general rule, worth applying past
these two: **an invariant that had to be written in prose because the type system
cannot enforce it needs a test.** TypeScript type-checks `new SectionTreeItem(...)`
identically to a cached lookup, so the compiler will never catch this class of
regression.

## Running

Tests compile to `out/` first — `vscode-test` runs the **JS in `out/`**, never the
TS in `src/`. `npm run test` handles this via `pretest`.

```
npm run test           # pretest (compile-tests + compile + lint) then vscode-test
npm run compile-tests  # tsc -p . --outDir out
```

**A single file** — there is no per-file npm script. Either narrow the `files` glob
in `.vscode-test.mjs` (e.g. `files: 'out/test/hash-comments.test.js'`) and run
`npx vscode-test`, reverting after; or add Mocha `.only()` to a `suite`/`test` and
recompile. Both require `npm run compile-tests` first.

## When adding tests

Assert **names as well as depths** for anything exercising token quantifiers — a
depth-only assertion let an `#{1,4}` → `#+` change slip through invisibly. Fixture
files for manual checks live in `assets/test-files/` (committed, one per language)
and `test-files/` (scratch, for F5).
