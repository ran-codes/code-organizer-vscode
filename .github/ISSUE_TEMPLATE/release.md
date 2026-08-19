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
    - [ ] `vsce package`
    - [ ] `code --install-extension ./code-organizer-0.0.0.vsix`
    - [ ] Check locally
- [ ] GitHub housekeeping
    - [ ] Merge feature PRs into `master`
    - [ ] Release — create tag `v0.0.0` (all three semver parts) and link it here
- [ ] Publish on VS Marketplace
    - [ ] `vsce ls-publishers` to check `ran-codes` is listed, if not then `vsce login ran-codes`
    - [ ] `vsce publish`
    - [ ] Confirm verified on [marketplace](https://marketplace.visualstudio.com/manage/publishers/ran-codes/extensions/code-organizer/hub?_a=acquisition)
- [ ] Publish on [Open VSX Registry](https://open-vsx.org/extension/ran-codes/code-organizer)
- [ ] Announce (optional) — post with demo GIF, link it here

<!-- Full process notes: .context/workflow.md -->
