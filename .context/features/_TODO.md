# TODO — work order

Triaged 2026-08-20. One row per open item, in the order to do them.

## The gate

`#50`/`#51`/`#52` can only be fixed in files that exist **on the `refactor-3`
branch, not on `master`** — `src/cursorSync.ts` and
`src/utils/getCurrentSection.ts`. Those files are already written and committed;
merging PR #49 is what puts them on `master`. Nothing needs to be created.

`#43` and `#44` are entirely inside `src/utils/findSections.ts`, which PR #49
does not touch (`git diff master refactor-3 -- src/utils/findSections.ts` is
empty). **Zero file overlap between the bug set and the feature set** — so
"bugs before features" is not the constraint here; merging #49 is.

Note `#44` is a **bug**, not a feature upgrade, despite living in `features/`.
Only `#43` is a feature.

## Order

| # | Issue | Type | Plan doc | Blocked by | Why here |
| --- | --- | --- | --- | --- | --- |
| 1 | [PR #49](https://github.com/ran-codes/code-organizer-vscode/pull/49) `refactor-3` | Refactor | `.context/refactors/src-refactor-3.md` | — | The gate. Open, checks green. Puts `cursorSync.ts` + `getCurrentSection.ts` on `master` and carries both TODO docs below. Just review and merge. |
| 2 | [#44](https://github.com/ran-codes/code-organizer-vscode/issues/44) YAML front matter | Bug | `TODO__issue_44.md` | — | Bogus sections above the real ones in every `.qmd`/`.md` with YAML comments. ~15 lines, edge cases pre-decided, TDD-ready. Unblocked today. |
| 3 | [#43](https://github.com/ran-codes/code-organizer-vscode/issues/43) Mermaid `%%` | Feature | `TODO__issue_43.md` | — | One `COMMENT_PATTERNS` entry + one test suite. Purely additive. Same file as #44, different region — after it avoids a trivial conflict. |
| 4 | [#52](https://github.com/ran-codes/code-organizer-vscode/issues/52) EOF edge case | Bug | *pending Fable planning* | #49 | Cheapest on the list: one comparison in a pure function, plus flip the assertion in `getCurrentSection.test.ts` that was written to be flipped. Independent of #50/#51. |
| 5 | [#50](https://github.com/ran-codes/code-organizer-vscode/issues/50) reveal never fires | Bug | *pending Fable planning* | #49 | Biggest real-world impact (sidebar stops following the cursor while typing) and the most design work: three candidate approaches, needs a perf check, and it is a **visible behavior change** → own manual F5 pass + CHANGELOG entry. |
| 6 | [#51](https://github.com/ran-codes/code-organizer-vscode/issues/51) collapsed parents | Bug | *pending Fable planning* | **#50** | Same root cause as #50. #50's chosen approach may close it outright — verify before implementing. |

**Only ordering that is mandatory:** #50 → #51 (shared root cause). #52 floats
anywhere after #49.

If PR #49 stalls in review, start #44 off `master` in parallel — copy
`TODO__issue_44.md` out of `refactor-3` first, it does not exist on `master` yet.

## Not triaged

- [#40](https://github.com/ran-codes/code-organizer-vscode/issues/40) — "[BUG] Cannot
  select lines containing section comments after latest updates." Sounds like a
  regression with worse impact than #51/#52. Worth checking before committing to
  the order above. *Pending Fable planning.*
- [#42](https://github.com/ran-codes/code-organizer-vscode/issues/42) — "Cannot make
  panel appear." *Pending Fable planning.*
