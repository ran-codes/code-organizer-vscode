Release process for this extension. Everything is manual — there is no CI/CD.

| What | Where |
| --- | --- |
| Worked examples — past release issues, with this checklist ticked off and test logs pasted in | v0.0.4 → https://github.com/ran-codes/code-organizer-vscode/issues/19 <br> v0.0.5 → https://github.com/ran-codes/code-organizer-vscode/issues/21 <br> v0.1 + v0.1.1 → https://github.com/ran-codes/code-organizer-vscode/issues/33 |

For each release, open a tracking issue from the `Release` issue template
(`.github/ISSUE_TEMPLATE/release.md`) titled `[Release] v[version]` and check the
boxes off there.

`vsce` and `ovsx` are both `devDependencies` — always invoke them as `npx vsce` /
`npx ovsx` so they resolve to the pinned local copies. A bare `vsce` picks up
whatever is on `PATH`, and plain `npx vsce` without the local dep would fetch the
**deprecated** `vsce` package (abandoned at 2.x) instead of `@vscode/vsce`.

**Development:**
- [ ] `git checkout -b feature/[issue-number]-[description]`
- [ ] Research and store research in context
    - [ ] https://code.visualstudio.com/api/references/vscode-api
- [ ] Update code in `src/`
- [ ] `npm run compile`
- [ ] Press `F5` to test in Extension Development Host
- [ ] Add tests in `test/`
- [ ] `npm run test`

**Metadata:**
- [ ] Bump `version` in `package.json` (semver — `0.1.1`, not `0.1`)
- [ ] Add the release entry to `CHANGELOG.md`
- [ ] Update `README.md` if features or screenshots changed

**Local Testing:**
- [ ] `npm run test` — paste the test log into the release issue
- [ ] `npx vsce package`
- [ ] Secret-scan the built `.vsix` — see [Pre-publish secret scan](#pre-publish-secret-scan)
- [ ] `code --install-extension ./code-organizer-[version].vsix`
- [ ] Check locally

**GitHub Housekeeping:**
- [ ] Merge the feature PRs into `master`
- [ ] Create GitHub release with tag `v[version]` — always all three semver
      parts (`v0.1.0`, not `v0.1`), and one tag per published version
- [ ] Link the release URL in the release issue

**Preflight — run before either publish:**
- [ ] `npx vsce ls-publishers` → `ran-codes` is listed. If not, run
      `npx vsce login ran-codes` **in your own terminal** (Azure DevOps PAT — see
      [Two registries, two different tokens](#two-registries-two-different-tokens))
- [ ] `npx ovsx verify-pat ran-codes` → expect `🚀 PAT valid`. If not, run
      `npx ovsx login ran-codes` **in your own terminal** (Open VSX token — a
      *different* credential from the Marketplace PAT)
- [ ] [Pre-publish secret scan](#pre-publish-secret-scan) is clean

**Publish to VS Marketplace:**
- [ ] `npx vsce publish`
- [ ] Confirm verified on [VS Marketplace](https://marketplace.visualstudio.com/manage/publishers/ran-codes/extensions/code-organizer/hub?_a=acquisition)

**Publish to Open VSX:**

Open VSX does **not** auto-sync from the Marketplace. Without the publish command
below, VSCodium / Cursor / Gitpod users silently stay on the old version.

- [ ] `npx ovsx publish code-organizer-[version].vsix` → expect `🚀 Published`
- [ ] Check review status at https://open-vsx.org/user-settings/extensions
- [ ] Confirm on the [Open VSX Registry](https://open-vsx.org/extension/ran-codes/code-organizer).
      The version API `404`s for a few minutes after publishing before it goes
      `200` — that lag is normal, not a failure.

Open VSX is the **terminal** verification step. Positron does not read
open-vsx.org directly: its default gallery is Posit Public Package Manager
(`p3m.dev`), which *mirrors* Open VSX on a delay of a few hours.

```
npx ovsx publish  →  open-vsx.org  →  p3m.dev/repos/openvsx  →  Positron
                     (404 for mins)    (mirror lag: hours)
```

Do not block the release on p3m, and do not read "not in Positron yet" as a
failed publish. (Users who want the un-mirrored source can point
`positron.extensions.gallerySource` at Open VSX directly.)

**Announce (optional):**
- [ ] Post to r/vscode or similar, with demo GIF
- [ ] Link the post in the release issue

Note: `npx vsce publish` runs `vscode:prepublish` → `npm run package`, which runs
`check-types` + `lint` + a production esbuild. That is the only automated gate —
type errors and lint failures will block a publish.

---

## Reference

### Two registries, two different tokens

The two publishes use **separate credentials from separate accounts**. Being
logged in to one says nothing about the other; this assumption was gotten wrong
during the v0.2.1 release.

| Registry | Token | Source |
| --- | --- | --- |
| VS Marketplace | Azure DevOps PAT | https://dev.azure.com → PATs (All accessible organizations, Marketplace → Manage) |
| Open VSX | Open VSX access token | https://open-vsx.org/user-settings/tokens |

### Token hygiene

- Login commands (`vsce login`, `ovsx login`) run in your **own terminal**, never
  `!`-prefixed inside a Claude Code session — the `!` prefix pipes output into the
  conversation, which would put the PAT in the transcript. `npx vsce publish` and
  `npx ovsx publish` are fine to run with `!`; they do not echo credentials.
- On a leak: **revoke and rotate first**, then republish. Never republish while a
  compromised token is still live.
- Prefer the `OVSX_PAT` environment variable (`$env:OVSX_PAT` in PowerShell) over
  `-p <token>` on the command line, so the token stays out of shell history.

### Pre-publish secret scan

The v0.2.0 upload was rejected by the Marketplace secret scanner because a
gitignored `.env` holding an Azure DevOps PAT had been bundled into the `.vsix`.
That rejection **burned the version number** (see
[Burned-version recovery](#burned-version-recovery)). Scan before every publish.

Against the file list, before packaging:

```bash
npx vsce ls | grep -iE '\.env|secret|credential'      # expect NO output
```

Against the built package:

```bash
unzip -l code-organizer-[version].vsix | grep -iE '\.env|secret|credential'
```

PowerShell equivalents (no `unzip` on Windows by default):

```powershell
npx vsce ls | Select-String -Pattern '\.env|secret|credential'

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path .\code-organizer-[version].vsix))
$zip.Entries.FullName | Select-String -Pattern '\.env|secret|credential'
$zip.Dispose()
```

**Empty output is the pass state.** `grep` exits `1` when it matches nothing, so a
clean scan looks like a failed command — judge it by the absence of output, not by
the exit code.

### `.vscodeignore` does not inherit from `.gitignore`

`vsce` falls back to `.gitignore` **only when `.vscodeignore` is absent**. This
repo has a `.vscodeignore`, so anything gitignored must be repeated there or it
ships inside the `.vsix`.

A correctly-gitignored `.env` shipped anyway for exactly this reason. The rule is
also noted in a comment in `.vscodeignore` next to the `**/.env*` pattern — keep
both in sync, and keep that pattern.

### Burned-version recovery

**A rejected upload permanently consumes the version number.** Retrying the same
version after fixing the problem fails with:

```
ERROR  ran-codes.code-organizer v0.2.0 already exists.
```

Recovery, as performed for v0.2.0 → v0.2.1:

1. Bump `version` in `package.json` and retitle the `CHANGELOG.md` entry to the
   new version.
2. Delete the orphaned tag and GitHub release —
   `gh release delete v[burned] --cleanup-tag`. This checklist requires one tag per
   *published* version, and a tag that can never ship contradicts that.
3. Re-cut the release at the new version (repackage, scan, re-verify locally).
4. Note the skipped version in `CHANGELOG.md` so the gap is not a mystery later.
