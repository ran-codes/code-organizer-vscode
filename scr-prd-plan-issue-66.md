# Plan — ran-codes/code-organizer-vscode#66: release skill update

> Triage scorecard: impact 6 · difficulty 2 · blast radius 2 · risk 2 · testability 6
> Recommendation at triage: pick up — folds the owner comment's five additions into the
> original scope, with the `npx vsce` package-resolution correction.
> Issue: https://github.com/ran-codes/code-organizer-vscode/issues/66

## Problem

The release process (`.context/workflow.md`, `.claude/skills/release/SKILL.md`,
`.github/ISSUE_TEMPLATE/release.md`) has gaps that the v0.2.0/v0.2.1 cycle exposed:

1. **Open VSX is never actually published.** All three documents say only "Confirm on
   Open VSX", and the skill even says Open VSX "may lag behind the Marketplace" —
   implying an auto-sync that does not exist. Without an explicit `ovsx publish`,
   VSCodium/Cursor/Gitpod users silently stay on old versions.
2. **No preflight checks.** Nothing verifies Marketplace auth, Open VSX PAT
   (`npx ovsx verify-pat ran-codes`), or — the one that burned v0.2.0 — package
   contents. A gitignored `.env` holding an Azure DevOps PAT shipped inside the
   `.vsix` and was rejected by the Marketplace secret scanner.
3. **Wrong tooling assumption on this machine.** The docs say bare `vsce`, the issue
   says `npx vsce` — but neither `@vscode/vsce` nor `ovsx` is in `devDependencies`,
   so `npx vsce` would fetch the **deprecated** `vsce` npm package (abandoned at 2.x).
4. **Undocumented failure knowledge:** the `.vscodeignore` ≠ `.gitignore` rule lives
   only as a comment inside `.vscodeignore` (not in `workflow.md`); there is no
   burned-version recovery runbook; the two registries needing two *different*
   credentials (Azure DevOps PAT vs Open VSX token) is written nowhere; and the skill
   currently tells the user to run `! vsce login ran-codes` — putting the PAT flow in
   the session transcript, which the owner comment explicitly forbids.

## Approach

Docs-and-manifest change only; no `src/` code. Four files:

- **`package.json`** — add `@vscode/vsce` and `ovsx` to `devDependencies` (devDeps
  never ship in the `.vsix`). This makes `npx vsce` / `npx ovsx` resolve locally to
  the *correct, pinned* packages — the clean fix for the issue's "every command must
  be `npx vsce`" item. `@vscode/vsce`'s bin name is still `vsce`, so existing command
  text keeps working.
- **`.context/workflow.md`** (canonical) — add a **Preflight** section (auth checks
  for both registries + pre-publish secret scan), an explicit **Publish to Open VSX**
  command sequence, the `.vscodeignore` ≠ `.gitignore` rule, the two-tokens table,
  token-entry hygiene, and a **burned-version recovery** runbook.
- **`.claude/skills/release/SKILL.md`** — mirror the workflow changes into the stage
  structure: secret scan as an AGENT step in Stage 4 (after `vsce package`, against
  the built `.vsix`); Stage 6 gains Open VSX publish as HUMAN steps; the
  `! vsce login` instruction is rewritten (login in the user's own terminal, never
  `!`-prefixed; `! vsce publish` / `! npx ovsx publish` remain fine since they don't
  echo credentials); the "Open VSX may lag behind the Marketplace" wording is replaced
  with the real behavior (explicit publish, then the API 404s for a few minutes,
  and Positron's `p3m.dev` mirror of Open VSX lags a further few hours).
- **`.github/ISSUE_TEMPLATE/release.md`** — checklist mirrors the new steps.

No `CHANGELOG.md` entry: this is process docs plus devDependencies, with no change to
shipped extension behavior. The decision record is the PR and commit messages.

## Open decisions

None — the owner comment resolved the design forks (explicit Open VSX publish, scan
before publish, revoke-then-republish on leak).

## Implementation steps

1. `npm install --save-dev @vscode/vsce ovsx`; verify `npx vsce --version` and
   `npx ovsx --version` resolve locally (no fetch prompt) and that `package-lock.json`
   is updated. Confirm neither package appears in `npx vsce ls` output.
2. `.context/workflow.md`:
   - New **Preflight** section before "Publish to VS Marketplace":
     - `npx vsce ls-publishers` → `ran-codes` listed; else `npx vsce login ran-codes`
       **in the user's own terminal** (Azure DevOps PAT).
     - `npx ovsx verify-pat ran-codes` → expect `🚀 PAT valid`; else
       `npx ovsx login ran-codes` in the user's own terminal (Open VSX token —
       a *different* credential; include the two-tokens table from the issue comment).
     - Secret scan against the built package:
       `unzip -l code-organizer-<version>.vsix | grep -iE '\.env|secret|credential'`
       — expect **no output** (note: grep exits 1 when clean; that is the pass state).
   - Rewrite **Publish to Open VSX** as explicit steps:
     `npx ovsx publish code-organizer-<version>.vsix`, then check
     https://open-vsx.org/user-settings/extensions for review status, expecting the
     version API to 404 for a few minutes before going 200.
   - Note that Open VSX is the **terminal** verification step: Positron installs from
     the `p3m.dev` mirror of Open VSX, which syncs hours later — do not block the
     release on p3m, and do not read "not in Positron yet" as a failed publish.
   - Add the `.vscodeignore` ≠ `.gitignore` rule (vsce falls back to `.gitignore`
     only when `.vscodeignore` is absent), cross-referencing the comment already in
     `.vscodeignore`.
   - Add the **burned-version recovery** runbook: rejected uploads permanently
     consume the version → bump `package.json`, retitle the changelog entry,
     `gh release delete v<burned> --cleanup-tag`, re-cut, note the gap in the
     changelog (v0.2.0 → v0.2.1 as the worked example).
   - Add token hygiene: logins never `!`-prefixed; on a leak revoke and rotate
     *before* republishing; prefer `$env:OVSX_PAT` over `-p <token>`.
   - Switch all `vsce`/`ovsx` command text to `npx vsce` / `npx ovsx`.
3. `.claude/skills/release/SKILL.md`:
   - Stage 4: after `npx vsce package`, add the AGENT secret-scan step with the
     exit-code caveat spelled out (empty grep output + exit 1 = pass).
   - Stage 6: prepend both auth preflights; rewrite step 1 so `vsce login` is
     directed to the user's own terminal (no `!`); add HUMAN steps
     `! npx ovsx publish code-organizer-x.y.z.vsix` and the user-settings
     verification checkpoint; replace the "may lag" wording with the 404-lag note
     plus the p3m-mirror-lag note (Open VSX is where verification stops).
   - Update the header's `!`-prefix guidance so it excludes login commands.
   - Bump the frontmatter `version: 0.1.0` → `0.2.0` (the stage structure changes).
4. `.github/ISSUE_TEMPLATE/release.md`: add Preflight checkboxes, expand the
   Open VSX line into publish + verify sub-boxes, switch to `npx` command forms.
   Sub-box command text mirrors `workflow.md`, keeping the `0.0.0` placeholder the
   template already uses (`npx ovsx publish code-organizer-0.0.0.vsix`, then verify
   at open-vsx.org/user-settings/extensions).
5. Re-read all three docs side by side for drift — SKILL.md defers to workflow.md,
   so any disagreement introduced here defeats the point.

## Success spec

- `npx vsce --version` and `npx ovsx --version` run offline-fast from local
  `node_modules` (proves devDeps resolution; no deprecated-`vsce` fetch).
- `npx vsce ls | grep -iE '\.env|secret|credential'` produces no output on the
  current tree (grep exit 1 = clean).
- `npx vsce package` still succeeds and the `.vsix` contains no `.env`
  (`unzip -l` scan clean) and no `node_modules`.
- `grep -c "ovsx publish" .context/workflow.md .claude/skills/release/SKILL.md
  .github/ISSUE_TEMPLATE/release.md` ≥ 1 per file — the explicit Open VSX publish
  step exists everywhere the checklist lives.
- `grep -n '! vsce login' .claude/skills/release/SKILL.md` returns nothing — the
  transcript-leaking login instruction is gone.
- Full end-to-end proof lands with the next real release (`/release` run).

## Out of scope

- Any `src/` code, tests, or extension behavior.
- CI/CD automation — releases stay fully manual per repo policy.
- Rotating or auditing existing tokens (operational, already handled for v0.2.1).
- Marketplace/Open VSX account or namespace administration.
