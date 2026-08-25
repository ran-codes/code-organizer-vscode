# Issue #42 — PRD + implementation plan

Branch `issue-42` · PR #63 · ships as **0.1.2**
Prior docs: `issue-42-reprex-protocol.md`, `issue-42-opus-evaluation.md` (both in this folder).

---

## PRD

### Problem

Issue #42: reporter (VSCodium 1.108, macOS) has the native Outline working but
the Code Organizer Activity Bar button missing in every workspace except one.
Palette commands (`Show Code Organizer`, `Activate`) do nothing; reinstall
doesn't help.

### What is established

1. **A real, demonstrable bug in this repo:** `"when": "resourceLangId"`
   (`package.json:139`) hides the only view in the `codeOrganizer` container
   whenever no editor is active, and VS Code then drops the container icon off
   the rail entirely. In that state `codeOrganizer.showView`
   (`extension.ts:77-80`) silently no-ops, and `codeOrganizer.activate`
   (`extension.ts:82-84`) says "already active and working!" regardless of
   anything. Reproducible: F5 → File → New Window → no button.
2. **That bug is NOT what the reporter hit.** The clause is a bare truthiness
   check — true whenever *any* editor is active, any language. The reporter's
   failing state has the native Outline populated, so an editor was active and
   the view was `when`-true. It never filtered by language and never fired in
   their scenario.
3. **Best guess for the reporter (unprovable from here):** per-workspace
   persisted view placement has the container hidden. Their fix is on their
   end — right-click the Activity Bar → check **Code Organizer**, or
   `View: Reset View Locations`. Only they can confirm.

### Goals

- The button is on the rail in every window/workspace from activation onward —
  fresh window, no editor, Settings tab.
- With no code file open, the pane shows a welcome message instead of the
  button vanishing.
- `Show Code Organizer` and `Activate` do something useful in every state.
- On #42: give the reporter the two recovery commands, ask them to confirm
  their installed version (they said 0.0.1, which Open VSX never carried), and
  present 0.1.2 as hardening — not as "your bug is fixed".

### Non-goals

- Reproducing the reporter's environment (VSCodium/macOS/per-workspace state).
- Any durable programmatic placement of the container — no API exists for that.
- Restricting the view to supported languages. The old clause never did this
  either; a dedicated container that is always present is the correct default.

### Risk

Low. Removing a gate cannot hide a currently-shown button. The only behavior
change is the button now showing in editor-less states, where the welcome
message makes that a feature. Users who dislike it can right-click the rail →
uncheck. `viewsWelcome` long predates `engines.vscode ^1.60.0`.

---

## Implementation plan

### 1. `package.json` — manifest

- **Delete** `"when": "resourceLangId"` from the
  `codeOrganizerOutlineActivity` view (`package.json:139`).
- **Add** a `viewsWelcome` contribution (none exists today):

  ```json
  "viewsWelcome": [
    {
      "view": "codeOrganizerOutlineActivity",
      "contents": "Open a code file to see its sections.\nSection comments like `# Section Name ----` build the outline."
    }
  ]
  ```

  Precondition already holds: `getChildren()` returns `[]` when no document is
  set (`treeDataProvider.ts:99-102`), so the welcome content renders.
- **Bump** `version` to `0.1.2`.

### 2. `src/extension.ts` — commands

- **`codeOrganizer.showView` (line 77-80):** replace
  `executeCommand('codeOrganizerOutlineActivity.focus')` with
  `executeCommand('workbench.view.extension.codeOrganizer')`. Targets the
  container, so it opens the pane even when the tree is empty or the icon was
  hidden. (This *is* the "add to Activity Bar" command the maintainer asked
  for — reveal, not placement.)
- **`codeOrganizer.activate` (line 82-84):** stop lying. Reveal the container
  (same command as above), then report real state:
  - active editor → `Code Organizer is active — N sections in the current file.`
    (`N` via `sectionIndex.getSections(editor.document).length`)
  - no editor → `Code Organizer is active. Open a code file to see its sections.`

### 3. Metadata

- `CHANGELOG.md` — 0.1.2 entry: button no longer disappears when no editor is
  open; welcome message in empty pane; `Show Code Organizer` works in every
  state; `Activate` reveals the pane and reports real state. Reference #42.
- `README.md` — only if screenshots show the old empty-pane state; otherwise
  no change.

### 4. Verification (manual — manifest changes have no unit-test surface)

`npm run compile` + `npm run test` must stay green (no parser/provider logic
changes, so no new tests). Then F5, against the pass criteria in
`issue-42-reprex-protocol.md`:

- [ ] Fresh window (File → New Window, no folder): button **present**, pane
      shows the welcome message. Compare `master` build: button absent.
- [ ] `View: Close All Editors`: button stays, welcome message shows.
- [ ] Open `assets/test-files/test.py`: tree replaces welcome; sections listed.
- [ ] `Code Organizer: Show Code Organizer` with no editor open: pane opens.
- [ ] `Code Organizer: Activate`: pane opens, message reports section count /
      no-editor state.
- [ ] Right-click rail → uncheck Code Organizer → run `Show Code Organizer`:
      confirm the pane still opens (this is the recovery path we're telling
      the reporter about).
- [ ] Native Outline, breadcrumbs, `Ctrl+Shift+O` unchanged.

### 5. Ship + comms

1. `vsce package`, install the `.vsix` locally, spot-check.
2. Merge PR #63; release per `.context/workflow.md` (tracking issue from
   `.github/ISSUE_TEMPLATE/release.md`, tag `v0.1.2`, `vsce publish`, confirm
   Open VSX).
3. Comment on #42, in this order:
   - Recovery steps to try now: right-click Activity Bar → check
     **Code Organizer**; else `View: Reset View Locations` in a failing
     workspace.
   - Ask: exact version from the Extensions pane (0.0.1 was never published),
     **Code Organizer** Output Channel contents, and whether any failing
     workspace is Remote-SSH / a dev container.
   - 0.1.2 note: fixed a way the button could vanish (no editor open) — may
     not be their case; please update and report back.
4. Reporter's confirmation closes #42; the code fix alone does not.

---

# Human framing

Plain-language version of the whole situation — the reporter's problem, the bug
we found, and why they are probably not the same thing.

## The reporter's problem (unexplained)

Their Code Organizer button shows up in exactly one workspace and no others,
even though the extension is clearly running (the built-in Outline works
everywhere). We could not reproduce this and cannot explain the one-workspace
asymmetry from our code. Best guess: VS Code remembers panel placement
per-workspace on their machine, and the button got hidden in that remembered
state. If so, only they can fix it — right-click the Activity Bar → check
**Code Organizer**, or run `View: Reset View Locations`.

## The bug we found while looking (real, but probably not theirs)

Our panel button had a visibility rule attached: *"only show this panel when a
file is open in the editor."* VS Code handles that rule aggressively — when the
panel has nothing to show, it doesn't display an empty panel, it **removes the
entire button from the sidebar**. Gone, as if the extension were never
installed.

So a window with no file open (fresh window, all tabs closed, Settings screen)
has no button at all, which looks exactly like a broken install. And both
rescue hatches are broken in that state: `Show Code Organizer` targets the
hidden panel and silently does nothing; `Activate` prints "already active and
working!" unconditionally without checking anything.

The kicker: the rule never did anything useful. It triggered on *any* open
file — even a `.txt` — so it never filtered "code files only." Its entire
real-world effect was creating this trap.

Why it's probably not the reporter's bug: their failing workspaces had a file
open (the built-in Outline was showing sections), and with a file open this
rule is satisfied and the button shows. Their button was missing in exactly the
state where our bug cannot fire.

## The fix: completely decouple button visibility from editor state

The entire coupling is **one line in `package.json`** — `"when":
"resourceLangId"`. Delete it and the button is always on the rail, in every
window, from activation onward. Removing a visibility gate can only ever show
the button more, never hide it, so there are no side effects beyond the button
now appearing in file-less windows.

Two small companions make it clean rather than just correct: a welcome message
("Open a code file to see its sections") so the now-always-present panel isn't
blank in an empty window, and repointing `Show Code Organizer` at the container
so the command works in every state. Anyone who preferred the button hidden can
right-click the rail and uncheck it — the standard VS Code way.

## How to talk about it on #42

"We couldn't reproduce your issue and can't yet explain the one-workspace
behavior. While investigating we found and fixed a real bug that makes the
button vanish in a related situation — it may not be yours. Please try the two
recovery steps and tell us your exact version." Fixing something ≠ fixing
their thing; the reporter's confirmation is what closes the issue.
