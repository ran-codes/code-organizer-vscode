# src/test/

Mocha suites, **one file per comment syntax**. They test `findSections` directly —
which is possible only because it never imports `vscode`.

| File | Covers |
| --- | --- |
| `hash-comments.test.ts` | `# Section ----` (Python, R, shell) |
| `double-slash-comments.test.ts` | `// Section ----` (JS/TS, C-family, Go, Rust, Swift) |
| `sql-comments.test.ts` | `-- Section ----` |
| `jsx-comments.test.ts` | `{/* // Section ---- */}` |
| `md-comments.test.ts` · `quarto-comments.test.ts` | Native `#` headers, fence exclusion |

Each suite covers the same axes for its syntax: basic detection, nesting/depth,
`uniqueId` generation, invalid patterns that must be ignored, and indentation
(spaces, tabs, mixed).

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
