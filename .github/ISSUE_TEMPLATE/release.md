---
name: Release
about: Tracking checklist for cutting and publishing a new version
title: "[Release] v0.0.0"
labels: []
assignees: ran-codes
---

## Context

<!-- What is in this release? Link the feature issues. -->

## Action Items

- [ ] Develop features
    - [ ] #
- [ ] Metadata
    - [ ] Bump `version` in `package.json` (semver — `0.1.1`, not `0.1`)
    - [ ] Update `CHANGELOG.md`
    - [ ] Update `README.md` if features or screenshots changed
- [ ] Local tests
    - [ ] `npm run test` — paste the test log as a comment below
    - [ ] `npx vsce package`
    - [ ] Secret scan — `unzip -l code-organizer-0.0.0.vsix | grep -iE '\.env|secret|credential'` (no output = pass)
    - [ ] `code --install-extension ./code-organizer-0.0.0.vsix`
    - [ ] Check locally
- [ ] GitHub housekeeping
    - [ ] Merge feature PRs into `master`
    - [ ] Release — create tag `v0.0.0` (all three semver parts) and link it here
- [ ] Preflight (both registries use different credentials)
    - [ ] `npx vsce ls-publishers` → `ran-codes` listed, else `npx vsce login ran-codes` (own terminal, Azure DevOps PAT)
    - [ ] `npx ovsx verify-pat ran-codes` → `🚀 PAT valid`, else `npx ovsx login ran-codes` (own terminal, Open VSX token)
- [ ] Publish on VS Marketplace
    - [ ] `npx vsce publish`
    - [ ] Confirm verified on [marketplace](https://marketplace.visualstudio.com/manage/publishers/ran-codes/extensions/code-organizer/hub?_a=acquisition)
- [ ] Publish on Open VSX (no auto-sync from the Marketplace — this must be run)
    - [ ] `npx ovsx publish code-organizer-0.0.0.vsix` → `🚀 Published`
    - [ ] Review status at [your Open VSX extensions](https://open-vsx.org/user-settings/extensions)
    - [ ] Confirm on [Open VSX Registry](https://open-vsx.org/extension/ran-codes/code-organizer) — the API 404s for a few minutes first; Positron's `p3m.dev` mirror lags hours behind and does not block the release
- [ ] Announce (optional) — post with demo GIF, link it here

<!-- Full process notes: .context/workflow.md -->
