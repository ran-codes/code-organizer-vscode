# TODO — work order

Triaged 2026-08-20. One row per open item, in the order to do them.

## Checklist

- [x] **PR #49** `refactor-3` — merged 2026-08-20. Put `cursorSync.ts`,
      `sectionIndex.ts`, `log.ts` and `utils/getCurrentSection.ts` on `master`,
      unblocking #50/#51/#52.
- [x] **#44** YAML front matter — merged 2026-08-20 via PR #53, issue closed.
- [x] **#43** Mermaid `%%` comments — merged 2026-08-21 via PR #55. Spun off #56.
- [ ] **#52** `getCurrentSection` EOF edge case
  - [x] Fable planning — *deleted on merge*
  - [x] Dev — in review, see the table. F5 pass is the one box still open.
- [ ] **#50** reveal never fires on a refreshing sync pass
  - [x] Fable planning — `TODO__issue_50.md`
  - [ ] Dev
- [ ] **#51** sections under a collapsed parent never cached
  - [x] Fable planning — **folded into `TODO__issue_50.md`**; same root cause, expected
        to close with no extra code. Reproduce on `master` first, then verify.
  - [ ] Dev *(no separate PR — only if it survives #50's fix)*
- [ ] **#54** wrong parent in files that mix comment styles
  - [x] Triage / Fable planning — `TODO__issue_54.md`
  - [ ] Dev *(land after #43 / PR #55 — less churn, not a hard dependency)*

Every open item takes two passes: **Fable planning** produces the
`TODO__issue_xx.md` spec, then **dev** implements it. **Planning is done for
everything on the list** — every remaining box is dev. #51 rides along with #50,
so what is left is two PRs: #50+#51 and #54, with #52 in review.

**Not yet triaged:** [#56](https://github.com/ran-codes/code-organizer-vscode/issues/56)
(`dashSource`'s `\s*` name gap matches across newlines — spun out of #43's review)
and [#57](https://github.com/ran-codes/code-organizer-vscode/issues/57) (setting to
hide/customize the symbols before titles). Both need a planning pass before they
join the table.

Convention: a shipped item's `TODO__issue_xx.md` is deleted once the PR merges
(`TODO__issue_44.md` went with #53), so a plan doc on disk means planned-but-unshipped
work, and no doc means unplanned.

## Notes on ordering

The gate was PR #49 — #50/#51/#52 can only be fixed in `src/cursorSync.ts` and
`src/utils/getCurrentSection.ts`, which did not exist on `master` until it
merged. **That is now resolved; all three are unblocked.**

#43 was entirely inside `src/utils/findSections.ts` and never overlapped the bug
set, which is why it ran in parallel the whole time. It landed 2026-08-21.

**#50 and #51 are now one piece of work**, not an ordering — planning #50 found
that the same six-line change covers both, so they ship in one PR. #52 and #43
float anywhere.

## Order

| # | Issue | Type | Plan doc | Next action | Blocked by | Why here |
| --- | --- | --- | --- | --- | --- | --- |
| ~~1~~ | ~~[PR #49](https://github.com/ran-codes/code-organizer-vscode/pull/49) `refactor-3`~~ | Refactor | `.context/refactors/src-refactor-3.md` | — | — | **Done** — merged 2026-08-20. |
| ~~2~~ | ~~[#44](https://github.com/ran-codes/code-organizer-vscode/issues/44) YAML front matter~~ | Bug | *deleted on merge* | — | — | **Done** — PR #53, merged 2026-08-20. Grew past the original spec: front matter and fence scans now respect each other, and an unterminated block excludes nothing. See `src/utils/CLAUDE.md`. |
| ~~3~~ | ~~[#43](https://github.com/ran-codes/code-organizer-vscode/issues/43) Mermaid `%%`~~ | Feature | *deleted on merge* | — | — | **Done** — [PR #55](https://github.com/ran-codes/code-organizer-vscode/pull/55), merged 2026-08-21. One `COMMENT_PATTERNS` entry + `mermaid-comments.test.ts` (10 cases) + `assets/test-files/test.mmd`. Review found the shared `dashSource` name gap is `\s*` and so matches across newlines — contained for the Mermaid entry, rest filed as **#56**. |
| 4 | [#52](https://github.com/ran-codes/code-organizer-vscode/issues/52) EOF edge case | Bug | *deleted on merge* | **Review** — [PR #58](https://github.com/ran-codes/code-organizer-vscode/pull/58) | — | Implemented as specced: guard deleted rather than clamped, `textLength` parameter dropped (which also takes `document.getText()` out of the debounced sync pass). 105 tests passing, `npm run compile` clean. The brute-force oracle needed both its bounds widened, not just the flipped assertion. **F5 pass still outstanding** — the only unticked acceptance box. |
| 5 | [#50](https://github.com/ran-codes/code-organizer-vscode/issues/50) reveal never fires | Bug | `TODO__issue_50.md` | **Dev** | — | Biggest real-world impact (sidebar stops following the cursor while typing). Fix is ~6 lines — route the public lookup through the existing memoizing factory so items are built on miss — but it is a **visible behavior change** turning on a path that has never run, so the weight is in the 5-check F5 pass + CHANGELOG entry. No perf gate; see plan Decision 6. |
| 6 | [#51](https://github.com/ran-codes/code-organizer-vscode/issues/51) collapsed parents | Bug | *in* `TODO__issue_50.md` | **Dev with #50** | **#50** | Same root cause, other side of it: VS Code never calls `getChildren()` on a collapsed parent, so descendants are never cached. Create-on-miss covers it with no extra code. Never reproduced — repro on `master` first, then close in #50's PR, or close as not-a-bug. Own doc only if it survives the fix. |
| 7 | [#54](https://github.com/ran-codes/code-organizer-vscode/issues/54) wrong parent in mixed-syntax files | Bug | `TODO__issue_54.md` | **Dev** (after #43) | — | A `.tsx` mixing `//` and `{/* // */}` nests a subsection under a heading that appears *after* it — parents resolve inside the pattern-ordered loop, and the document-order sort happens last. Planning also found a **second, worse symptom**: reverse the styles and the child resolves to no parent at all, which makes it neither a root nor anyone's child — it disappears from the outline. Fix is to sort before resolving; single-syntax files are provably unaffected. Still unlabeled on GitHub — add `bug`. |

## Deliberately not on the list

**#40 and #42 are open but out of scope — do not pick them up.** Decision made
2026-08-20. They are left open on GitHub on purpose; their absence from the table
above is intentional, not an oversight, so do not "helpfully" re-add them.

- [#40](https://github.com/ran-codes/code-organizer-vscode/issues/40) — "[BUG]
  Cannot select lines containing section comments after latest updates."
- [#42](https://github.com/ran-codes/code-organizer-vscode/issues/42) — "Cannot
  make panel appear."

Revisit only if the maintainer says so.
