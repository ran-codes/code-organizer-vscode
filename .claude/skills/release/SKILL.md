---
name: release
version: 0.2.0
description: Cut and publish a release of the code-organizer VS Code extension. Use when the user says "release", "cut a release", "do a release", "publish", "ship a new version", or invokes /release. Walks the canonical checklist in .context/workflow.md — the agent does the mechanical steps (version bump, changelog, tests, package, pre-publish secret scan, GitHub release, tracking issue), asks the user every decision (which version) via AskUserQuestion, and hands the publish commands for both registries (VS Marketplace and Open VSX) to the human to run in their own terminal with yes/no "do you see it?" verification checkpoints.
---

# Release protocol — code-organizer

`.context/workflow.md` is **canonical**. Read it first, every run. If it disagrees
with this skill, workflow.md wins — follow it and tell the user about the drift so
this skill can be updated.

Division of labor, non-negotiable:

- **AGENT** steps: you do them. Report the result plainly.
- **ASK** steps: decisions are the user's — use AskUserQuestion. Never pick a
  version, push, or close an issue on your own initiative.
- **HUMAN** steps: authentication and publishing happen in the *user's* terminal,
  never yours. Give them the exact command and suggest they type it with the `!`
  prefix (e.g. `! npx vsce publish`) so its output lands in the conversation. Then
  verify with a yes/no "Do you see …?" question before moving on. **Never run
  `vsce login`, `ovsx login`, `vsce publish` or `ovsx publish` yourself.**

  **Exception — login commands are never `!`-prefixed.** `vsce login` and
  `ovsx login` prompt for a token, and `!` pipes the command's output into the
  conversation, which would put the PAT in the transcript. Tell the user to run
  those in their own terminal window, plain, with no `!`. The publish commands
  are fine with `!` — they do not echo credentials.

Every `vsce` / `ovsx` invocation is `npx vsce` / `npx ovsx`. Both are
`devDependencies`, so `npx` resolves the pinned local copy; a bare `vsce` takes
whatever is on `PATH`, and `npx vsce` without the local dep would fetch the
**deprecated** `vsce` package instead of `@vscode/vsce`.

Work the stages in order. Don't skip a verification checkpoint because the
previous command "looked fine".

## Stage 0 — Preflight (AGENT)

1. Read `.context/workflow.md`.
2. Gather state:
   - `git status` — must be clean, on `master`. If not, stop and tell the user.
   - Current `version` in `package.json`; latest tag (`git tag --sort=-v:refname`).
   - Commits since the last tag; the `[Unreleased]` section of `CHANGELOG.md`.
   - Whether an open `[Release] v…` tracking issue already exists
     (`gh issue list --search "[Release] in:title" --state open`) — if one does,
     resume it instead of opening a duplicate.
3. Summarize for the user: what's shipping (Added/Fixed items with issue numbers),
   current version, last tag.

## Stage 1 — Version (ASK)

AskUserQuestion: bump to what? Offer the computed patch / minor / major values
(e.g. from `0.1.1`: `0.1.2` / `0.2.0` / `1.0.0`). Recommend minor if the
changelog has an `Added` section, patch if fixes only. Full semver always —
`0.2.0`, never `0.2`.

## Stage 2 — Metadata (AGENT)

1. Set `version` in `package.json` to the chosen value.
2. In `CHANGELOG.md`, retitle `## [Unreleased]` → `## [x.y.z] - YYYY-MM-DD`
   (today's date).
3. Ask the user whether `README.md` needs updates (features/screenshots changed?).
   If yes, make them or wait while they do.
4. Commit on `master` (e.g. `Bump version to x.y.z for release`) and push —
   **confirm with the user before pushing**.

## Stage 3 — Tracking issue (AGENT)

Create the issue from `.github/ISSUE_TEMPLATE/release.md` via `gh issue create`:

- Title `[Release] vx.y.z`; assignee `ran-codes`.
- Body = the template body with every `0.0.0` placeholder replaced by the real
  version, and the Context section filled with the feature/fix issues from the
  changelog (link them as `#NN`).
- Tick the boxes that are already true (features developed, PRs merged, metadata).

Keep this issue current: as each later stage completes, edit the body to tick its
boxes (`gh issue edit --body`). Give the user the issue URL.

## Stage 4 — Local testing (AGENT, then HUMAN check)

1. AGENT: `npm run test`. If it fails, stop — fix or report; do not proceed.
2. AGENT: paste the test log as a comment on the release issue
   (`gh issue comment`).
3. AGENT: `npx vsce package` → produces `code-organizer-x.y.z.vsix`.
4. AGENT: **secret-scan the built package.** This is the step that would have
   caught the v0.2.0 failure — a gitignored `.env` holding a PAT shipped inside
   the `.vsix` and the Marketplace secret scanner rejected the upload, burning
   the version number.

   ```bash
   unzip -l code-organizer-x.y.z.vsix | grep -iE '\.env|secret|credential'
   ```

   No `unzip` on Windows outside Git Bash — `.context/workflow.md` carries the
   PowerShell equivalent, plus an `npx vsce ls` form that scans the file list
   without a built package.

   **No output is the pass state.** `grep` exits `1` when nothing matches, so a
   clean scan looks like a failed command — judge it by the absence of matching
   lines, not by the exit code. If anything *does* match: stop, do not publish,
   add the pattern to `.vscodeignore` (which does **not** inherit from
   `.gitignore`), repackage, and rescan.
5. AGENT: `code --install-extension ./code-organizer-x.y.z.vsix`.
6. HUMAN checkpoint — AskUserQuestion (yes/no):
   "Reload VS Code and open a test file (e.g. `assets/test-files/test.py`).
   Do you see the sections in the Outline and the Code Organizer view?"
   On **no**: stop, debug together. On **yes**: tick the Local tests boxes.

## Stage 5 — GitHub release (AGENT)

1. `gh release create vx.y.z --title "vx.y.z" --notes <changelog section>` —
   tag with all three semver parts, notes taken from this version's CHANGELOG
   entry.
2. Comment the release URL on the tracking issue and tick the GitHub
   housekeeping boxes.

## Stage 6 — Publish (HUMAN)

This whole stage runs in the user's terminal — feed commands, verify, repeat.
Two registries, **two different credentials from separate accounts**: the
Marketplace takes an Azure DevOps PAT (dev.azure.com → PATs), Open VSX takes an
Open VSX access token (open-vsx.org/user-settings/tokens). Being logged in to one
says nothing about the other — this was gotten wrong during v0.2.1.

**Auth preflight — both registries, before publishing anything:**

1. Tell the user to run `! npx vsce ls-publishers`.
   - If `ran-codes` is listed → continue.
   - If not → tell them to run `npx vsce login ran-codes` **in their own terminal,
     with no `!` prefix** (it prompts for the Azure DevOps PAT, which must not
     land in the transcript). You cannot do this for them.
2. Tell the user to run `! npx ovsx verify-pat ran-codes`.
   - Expect `🚀 PAT valid`.
   - If not → tell them to run `npx ovsx login ran-codes` **in their own terminal,
     with no `!` prefix** (Open VSX access token — a *different* credential from
     the one in step 1).

**Publish to VS Marketplace:**

3. Tell the user to run `! npx vsce publish`.
   - Note for them: this triggers `vscode:prepublish` → `npm run package`
     (check-types + lint + production esbuild) — the only automated gate. A type
     or lint error here aborts the publish; if that happens, stop and fix.
   - If the upload is **rejected** (e.g. the secret scanner), stop: that version
     number is permanently burned and cannot be republished. Follow the
     burned-version recovery runbook in `.context/workflow.md`.
4. AskUserQuestion (yes/no): "Open the
   [Marketplace hub](https://marketplace.visualstudio.com/manage/publishers/ran-codes/extensions/code-organizer/hub?_a=acquisition)
   — do you see vx.y.z verified?" (Verification can take a few minutes — offer
   to wait.)

**Publish to Open VSX:**

Open VSX does **not** auto-sync from the Marketplace. Skipping this leaves
VSCodium / Cursor / Gitpod users silently on the old version.

5. Tell the user to run `! npx ovsx publish code-organizer-x.y.z.vsix` — expect
   `🚀 Published`.
6. AskUserQuestion (yes/no): "Open
   [your Open VSX extensions](https://open-vsx.org/user-settings/extensions) —
   does vx.y.z show there?"
7. AskUserQuestion (yes/no): "Check
   [Open VSX](https://open-vsx.org/extension/ran-codes/code-organizer) — do you
   see vx.y.z there?" The version API `404`s for a few minutes after publishing
   before it goes `200`; that lag is normal, so offer to wait rather than
   treating the first `404` as a failed publish.

   Open VSX is the **terminal** verification step. Positron installs from the
   `p3m.dev` mirror of Open VSX, which syncs a few hours later — do not block the
   release on p3m, and do not read "not in Positron yet" as a failed publish.
8. Tick both Publish boxes on the tracking issue as each is confirmed.

## Stage 7 — Wrap up (ASK, then AGENT)

1. AskUserQuestion: announce this release (r/vscode post with demo GIF)? If yes,
   the post is theirs to write — link it on the issue when they share it;
   optional, skippable.
2. Confirm every box on the tracking issue is ticked, then ask the user:
   close the issue? On yes, `gh issue close`.
3. Final summary: version, tag, release URL, issue URL, both registry links.
