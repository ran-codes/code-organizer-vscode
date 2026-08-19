Release process for this extension. Everything is manual — there is no CI/CD.

| What | Where |
| --- | --- |
| Worked examples — past release issues, with this checklist ticked off and test logs pasted in | v0.0.4 → https://github.com/ran-codes/code-organizer-vscode/issues/19 <br> v0.0.5 → https://github.com/ran-codes/code-organizer-vscode/issues/21 <br> v0.1 + v0.1.1 → https://github.com/ran-codes/code-organizer-vscode/issues/33 |

For each release, open a tracking issue from the `Release` issue template
(`.github/ISSUE_TEMPLATE/release.md`) titled `[Release] v[version]` and check the
boxes off there.

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
- [ ] `vsce package`
- [ ] `code --install-extension ./code-organizer-[version].vsix`
- [ ] Check locally

**GitHub Housekeeping:**
- [ ] Merge the feature PRs into `master`
- [ ] Create GitHub release with tag `v[version]` — always all three semver
      parts (`v0.1.0`, not `v0.1`), and one tag per published version
- [ ] Link the release URL in the release issue

**Publish to VS Marketplace:**
- [ ] `vsce ls-publishers` to check `ran-codes` is listed
- [ ] `vsce login ran-codes` (if needed)
- [ ] `vsce publish`
- [ ] Confirm verified on [VS Marketplace](https://marketplace.visualstudio.com/manage/publishers/ran-codes/extensions/code-organizer/hub?_a=acquisition)

**Publish to Open VSX:**
- [ ] Confirm on [Open VSX Registry](https://open-vsx.org/extension/ran-codes/code-organizer)

**Announce (optional):**
- [ ] Post to r/vscode or similar, with demo GIF
- [ ] Link the post in the release issue

Note: `vsce publish` runs `vscode:prepublish` → `npm run package`, which runs
`check-types` + `lint` + a production esbuild. That is the only automated gate —
type errors and lint failures will block a publish.
