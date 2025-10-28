**Development:**
- [ ] `git checkout -b feature/[issue-number]-[description]`
- [ ] Research and store research in context 
    - [ ] https://code.visualstudio.com/api/references/vscode-api
- [ ] Update code in `src/`
- [ ] `npm run compile`
- [ ] Press `F5` to test in Extension Development Host
- [ ] Add tests in `test/`
- [ ] `npm run test`

**Local Testing:**
- [ ] `vsce package`
- [ ] `code --install-extension ./code-organizer-[version].vsix`
- [ ] Check locally

**GitHub Housekeeping:**
- [ ] Create GitHub release with tag (e.g., `v0.0.4`)

**Publish:**
- [ ] `vsce ls-publishers` to check `ran-codes` is listed
- [ ] `vsce login ran-codes` (if needed)
- [ ] `vsce publish`
- [ ] Confirm verified on [VS Marketplace](https://marketplace.visualstudio.com/)
- [ ] Confirm on [Open VSX Registry](https://open-vsx.org/extension/ran-codes/code-organizer)