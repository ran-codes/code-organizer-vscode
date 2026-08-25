# Issue #42 — Opus evaluation

**For review by Fable.** Written after drafting a reprex protocol for #42 and
failing to reproduce the bug. This records what is verified, what is inferred,
what we could not reproduce, and the proposed way forward. Verdict wanted on
whether to ship the fix without a reproduction.

Branch `issue-42` · PR #63 · current version `0.1.1` · `engines.vscode ^1.60.0`

---

## 1. The report

> Installed Code Organizer (v0.0.1) in VSCodium 1.108.10359 on macOS 26.2.
> Works in one workspace, the panel refuses to show up anywhere else. The
> extension itself appears to work — the items appear in the default *Outline*
> panel.

Reporter tried: moving the panel between the secondary and primary sidebar in
the workspace where it *is* visible; running `Code Organizer: Show Code
Organizer` and `Code Organizer: Activate`; disable/enable with reload;
uninstall/reinstall. No effect.

## 2. Terminology

Three things get called "the outline" in this repo. Fixing the names first,
because the bug turns on the distinction between the last two.

| Term | What the user sees | What it is in code |
| --- | --- | --- |
| **native outline** | VS Code's own *Outline* in the Explorer sidebar | we only feed it — `documentSymbolProvider.ts` |
| **custom button** | our 🗂️ icon on the Activity Bar rail | view **container** `codeOrganizer` (`package.json:128`) |
| **custom outline** | our tree, rendered inside the button's pane | **view** `codeOrganizerOutlineActivity` (`package.json:137`), fed by `treeDataProvider.ts` |

The reporter has the **native outline** working and the **custom button**
missing.

## 3. Verified in the code

Read this session, line numbers current on `issue-42`:

- `package.json:128` — container `codeOrganizer`, no `when` clause.
- `package.json:137` — view `codeOrganizerOutlineActivity`, the **only** view in
  that container.
- `package.json:139` — `"when": "resourceLangId"` on that view. Introduced by
  de890b5 (#29), never revisited.
- **No `viewsWelcome` contribution exists.** Grepped; zero hits.
- `extension.ts:22` — `codeOrganizer.enable` is checked *before* the symbol
  provider is registered. So if it were `false`, the native outline would be
  dead too. The report says it isn't. **`enable` is ruled out.**
- `extension.ts:48` — `createTreeView(...)` is unconditional, twelve lines after
  that check. So the custom outline **is registered** in the reporter's session.
- `extension.ts:79` — `showView` executes `codeOrganizerOutlineActivity.focus`,
  i.e. it targets the **view**, not the container.
- `extension.ts:83` — `activate` shows *"Code Organizer is already active and
  working!"* unconditionally. It asserts nothing and checks nothing.

Corollary: everything between `activate()` and "an icon on the rail" is
accounted for except (a) the `when` clause and (b) VS Code's persisted
placement of the container.

## 4. Asserted from VS Code behavior — NOT verified this session

Flagging these explicitly because the whole argument rests on them and none were
checked against docs or a running instance:

1. **VS Code removes a view container from the Activity Bar entirely when every
   view inside it is `when`-false** — not "shows an empty pane", but removes the
   icon. This is the load-bearing claim for hypothesis B below.
2. **`resourceLangId` is undefined when no editor is active.** It reflects the
   language of the resource in the Explorer *or* active editor, so an Explorer
   selection may keep it set even with all editors closed — which would matter
   for why the repro failed.
3. **There is no public API for an extension to place, pin, or un-hide its own
   view container.** Only `workbench.action.resetViewLocations` (global, resets
   every extension's placement).
4. **A `.focus` command is a no-op against a `when`-false view** — silent, no
   error. This is what would explain the reporter's "Show Code Organizer did
   nothing".

**Fable: 1 and 3 are the ones worth checking.** If 1 is wrong, hypothesis B
collapses. If 3 is wrong, the maintainer's preferred fix (§7) becomes buildable.

## 5. Hypothesis B — the `when` clause (original primary)

The `when` clause gates the **custom outline**, but VS Code drops the **custom
button** off the rail when the only view inside it is `when`-false. So with no
editor active the button vanishes rather than showing an empty pane — which
reads as a broken install, and leaves the user no way back, since every palette
command routes through a view that isn't there.

Predicted, testable: close all editors → button disappears from the rail;
reopen a code file → button returns.

## 6. The reprex — and the failure to reproduce

Protocol drafted at `.context/scratch/issue-42-reprex-protocol.md` (A: is the
button in this build; B: the `when` clause; C: persisted placement).

**Result: could not reproduce.** The maintainer reports the extension works
fine, and that *the custom button stays visible once dragged into the Activity
Bar.*

⚠️ **Open question for review:** it is not recorded whether protocol step B4
(`View: Close All Editors`, the exact predicted trigger) was run verbatim, or
whether "works fine" reflects general use. This matters — a failure to reproduce
is only evidence against B if B's precise trigger was exercised. Treat the
repro as *inconclusive*, not as *B disproved*. Other reasons the trigger could
miss: an Explorer selection keeping `resourceLangId` set (see §4.2), or VSCodium
1.108 differing from the maintainer's VS Code build.

### What the failure does tell us

The maintainer's observation and the reporter's are the same fact from two
sides: **container placement is persisted per workspace, and dragging pins it.**
The reporter's one working workspace is the one they'd dragged the pane in.
Every other workspace has default placement, where the `when` clause can leave
the button with nothing to render.

So B and C are not competing — **C explains the "one workspace works"
asymmetry that B alone cannot.** B explains why it can vanish; C explains why it
stays gone in some workspaces and not others.

## 7. Option evaluated and rejected: a "add to Activity Bar" command

The maintainer proposed shipping a Code Organizer command that puts the button
on the Activity Bar. Assessment: **not buildable**, per §4.3 — no API places or
un-hides a view container. The only lever is
`workbench.action.resetViewLocations`, which resets *every* extension's
container placement globally. Wrapping that in our own command trades our bug
for a worse one, and it is already reachable from the palette.

The instinct behind it — *make the button unconditional* — is right. It is just
reached by deleting a `when` clause, not by adding a command.

## 8. Proposed fix

1. Delete `"when": "resourceLangId"` (`package.json:139`). With no gate the view
   is never `when`-false, so VS Code has no reason to drop the button, and
   `showView` starts working in every state.
2. Add a `viewsWelcome` entry so the empty pane says something ("Open a code
   file to see its sections") instead of rendering blank. None exists today.
3. Point `showView` (`extension.ts:79`) at the container —
   `workbench.view.extension.codeOrganizer` — rather than the view's `.focus`.
   More robust regardless of 1.
4. Consider making `codeOrganizer.activate` (`extension.ts:83`) report real
   state instead of an unconditional "already active and working!". It is the
   single most misleading thing in the reporter's transcript.

Risk: low. Removing a gate cannot hide a button that is currently shown. The
plausible downside is the button now appearing for users who liked it
auto-hiding in non-code workspaces — a cosmetic regression with a known
mitigation (right-click the rail → uncheck), and arguably the correct default
for a dedicated container.

## 9. Proposed way forward — verify fix-forward, not bug-first

Since the bug will not reproduce locally, do not keep chasing it. The mechanism
is testable directly:

- [ ] Apply the §8 changes on `issue-42`
- [ ] `F5` → **File → New Window**, no folder, no editor open. Compare against a
      `master` build: **button absent before, present with a welcome message
      after.** That tests the mechanism without the reporter's environment.
- [ ] Ship as 0.1.2 (defensive fix), say so on #42, ask the reporter to confirm.
      They are the only one who can close the loop.
- [ ] Independently, ask the reporter for: exact version from the Extensions
      pane, **Code Organizer** Output Channel contents, whether a code file was
      open when they looked, and whether any failing workspace is Remote-SSH or
      a dev container.

Two loose threads on the report itself:
- **v0.0.1 is almost certainly wrong.** Open VSX has never carried 0.0.1 — its
  oldest is 0.0.3, latest 0.1.1. If they really are on a 0.0.x build there is no
  custom button in it at all, and this whole investigation is moot. Confirm
  before anything else.
- Extensions install per user, not per workspace, so a version difference cannot
  explain "one workspace works" **unless** one of those windows is remote. Our
  `extensionKind` resolves to `workspace`, so a Remote-SSH window installs and
  runs its own copy, which can be a different version.

## 10. Questions for the reviewer

1. Is §4.1 correct — does VS Code really drop the container icon, rather than
   show an empty pane, when all views are `when`-false? Version-dependent?
2. Is §4.3 correct — is there genuinely no API to reveal/place a container?
3. Is shipping a defensive fix with no reproduction the right call, or should
   this stay open pending the reporter's Output Channel dump?
4. Does removing the `when` clause outright risk anything not considered in §8,
   given `engines.vscode ^1.60.0` covers a wide range of hosts and VSCodium?
5. Should `codeOrganizer.activate` be fixed in the same PR or split out? It is a
   separate defect (a lying diagnostic) surfaced by the same report.
