# TODO — work order

Triaged 2026-08-20. One row per open item, in the order to do them.

## Checklist

- [x] **PR #49** `refactor-3` — merged 2026-08-20. Put `cursorSync.ts`,
      `sectionIndex.ts`, `log.ts` and `utils/getCurrentSection.ts` on `master`,
      unblocking #50/#51/#52.
- [x] **#44** YAML front matter — merged 2026-08-20 via PR #53, issue closed.
- [ ] **#43** Mermaid `%%` comments
  - [x] Fable planning — `TODO__issue_43.md`
  - [ ] Dev
- [ ] **#52** `getCurrentSection` EOF edge case
  - [ ] Fable planning → `TODO__issue_52.md`
  - [ ] Dev
- [ ] **#50** reveal never fires on a refreshing sync pass
  - [ ] Fable planning → `TODO__issue_50.md`
  - [ ] Dev
- [ ] **#51** sections under a collapsed parent never cached
  - [ ] Fable planning → `TODO__issue_51.md` *(may be folded into #50 — plan #50 first)*
  - [ ] Dev
- [ ] **#54** wrong parent in files that mix comment styles
  - [ ] Triage / Fable planning → `TODO__issue_54.md`
  - [ ] Dev

Every open item takes two passes: **Fable planning** produces the
`TODO__issue_xx.md` spec, then **dev** implements it. #43 is the only one already
planned, so it is the only one that can go straight to dev.

Convention: a shipped item's `TODO__issue_xx.md` is deleted once the PR merges
(`TODO__issue_44.md` went with #53), so a plan doc on disk means planned-but-unshipped
work, and no doc means unplanned.

## Notes on ordering

The gate was PR #49 — #50/#51/#52 can only be fixed in `src/cursorSync.ts` and
`src/utils/getCurrentSection.ts`, which did not exist on `master` until it
merged. **That is now resolved; all three are unblocked.**

#43 is entirely inside `src/utils/findSections.ts` and never overlapped the bug
set, which is why it could have run in parallel the whole time.

**The only mandatory ordering left is #50 → #51** (shared root cause). #52 and
#43 float anywhere.

## Order

| # | Issue | Type | Plan doc | Next action | Blocked by | Why here |
| --- | --- | --- | --- | --- | --- | --- |
| ~~1~~ | ~~[PR #49](https://github.com/ran-codes/code-organizer-vscode/pull/49) `refactor-3`~~ | Refactor | `.context/refactors/src-refactor-3.md` | — | — | **Done** — merged 2026-08-20. |
| ~~2~~ | ~~[#44](https://github.com/ran-codes/code-organizer-vscode/issues/44) YAML front matter~~ | Bug | *deleted on merge* | — | — | **Done** — PR #53, merged 2026-08-20. Grew past the original spec: front matter and fence scans now respect each other, and an unterminated block excludes nothing. See `src/utils/CLAUDE.md`. |
| 3 | [#43](https://github.com/ran-codes/code-organizer-vscode/issues/43) Mermaid `%%` | Feature | `TODO__issue_43.md` | **Dev** | — | One `COMMENT_PATTERNS` entry + one test suite. Purely additive, blast radius 2/10. Spec is ready to implement as written. |
| 4 | [#52](https://github.com/ran-codes/code-organizer-vscode/issues/52) EOF edge case | Bug | *none* | **Fable plan** | — | Cheapest on the list: one comparison in a pure function, plus flip the assertion in `getCurrentSection.test.ts` that was written to be flipped. Independent of #50/#51. |
| 5 | [#50](https://github.com/ran-codes/code-organizer-vscode/issues/50) reveal never fires | Bug | *none* | **Fable plan** | — | Biggest real-world impact (sidebar stops following the cursor while typing) and the most design work: three candidate approaches, needs a perf check, and it is a **visible behavior change** → own manual F5 pass + CHANGELOG entry. |
| 6 | [#51](https://github.com/ran-codes/code-organizer-vscode/issues/51) collapsed parents | Bug | *none* | **Fable plan** (after #50's) | **#50** | Same root cause as #50. #50's chosen approach may close it outright — verify before implementing. |
| 7 | [#54](https://github.com/ran-codes/code-organizer-vscode/issues/54) wrong parent in mixed-syntax files | Bug | *none* | **Triage** | — | Untriaged. Found while reviewing the #43 spec; repro verified on `master`. A `.tsx` mixing `//` and `{/* // */}` nests a subsection under a heading that appears *after* it, because parents resolve during the pattern-ordered loop and the document-order sort happens last. Parser-wide blast radius — own PR, explicitly out of scope for #43. |

## Deliberately not on the list

**#40 and #42 are open but out of scope — do not pick them up.** Decision made
2026-08-20. They are left open on GitHub on purpose; their absence from the table
above is intentional, not an oversight, so do not "helpfully" re-add them.

- [#40](https://github.com/ran-codes/code-organizer-vscode/issues/40) — "[BUG]
  Cannot select lines containing section comments after latest updates."
- [#42](https://github.com/ran-codes/code-organizer-vscode/issues/42) — "Cannot
  make panel appear."

Revisit only if the maintainer says so.
