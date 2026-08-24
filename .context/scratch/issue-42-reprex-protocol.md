# Issue #42 — reprex protocol

The reporter has our **built-in Outline integration** working and our **own
Activity Bar pane** missing. Those are two different things:

| | Built-in Outline | Code Organizer pane |
| --- | --- | --- |
| Where | Explorer sidebar → *Outline* | Its own icon on the Activity Bar rail |
| Fed by | `documentSymbolProvider.ts` | `treeDataProvider.ts` |
| Contributed as | nothing — VS Code owns the view | `viewsContainers.activitybar` + `views.codeOrganizer` |
| Shipped in | v0.0.1 | **v0.1.0** (#22) |

So "the items appear in the default Outline panel" is not evidence the pane
should be there. It means `activate()` ran past the `enable` check and registered
the symbol provider — which also means `createTreeView(...)` ran, since it is
unconditional twelve lines later (`extension.ts:48`). The view *is* registered.
The only things left between "registered" and "an icon on the rail" are the
`"when": "resourceLangId"` clause on our one view (`package.json:139`) and VS
Code's persisted container placement. VS Code drops a container from the
Activity Bar entirely when every view in it is `when`-false — and
`resourceLangId` is undefined whenever no text editor is active.

Three candidate causes, in order. Run A first; it may end the investigation.
~5 min.

## Setup

- [ ] Extension running — install from Open VSX/Marketplace, or `F5` and use the
      **[Extension Development Host]** window
- [ ] A folder open with a code file in it — `assets/test-files/test.py` works
- [ ] **View → Output** → pick **Code Organizer** in the dropdown

## A. Is the pane in this build at all?

- [ ] **1.** **Code → Settings → Extensions** (macOS) → find Code Organizer →
      read the installed version
      → **0.0.x: stop.** There is no Activity Bar container in that build; the
      Outline is all it ever had. Upgrade to 0.1.1 and re-check.
      → **0.1.x: continue to B.**
- [ ] **2.** Output channel shows `Activity bar TreeView created`
      → **absent:** the extension did not activate, or `codeOrganizer.enable` is
      `false` — a different bug from this one; the Outline would be dead too

## B. The `when` clause (primary hypothesis)

- [ ] **3.** Open `test.py` → 🗂️ icon **present** on the Activity Bar, tree lists
      sections. This is the working state.
- [ ] **4.** **View → Command Palette…** → `View: Close All Editors`
      → the icon **disappears from the rail entirely** — not an empty pane, gone
- [ ] **5.** Still with no editor open, **Code → Settings → Settings** (the
      Settings UI has no `resourceLangId`)
      → icon still absent
- [ ] **6.** Reopen `test.py` → icon returns
- [ ] **7.** With no editor open, Command Palette → `Code Organizer: Show Code Organizer`
      → **nothing happens, no error.** `codeOrganizerOutlineActivity.focus` is a
      no-op against a `when`-false view. This is what the reporter tried.
- [ ] **8.** With no editor open, Command Palette → `Code Organizer: Activate`
      → *"Code Organizer is already active and working!"* — true, and useless.
      This is the misleading part.
- [ ] **9.** **File → New Window** (no folder) → icon absent though the extension
      is active; open any code file → icon appears

If 4 and 6 flip the icon on and off, the `when` clause is the cause and B is the
whole story.

## C. Persisted container placement (secondary)

Only if the icon stays missing in check 3 — i.e. missing *with* a code file open.

- [ ] **10.** Right-click the Activity Bar → is **Code Organizer** listed and
      unchecked? Check it → does it come back?
- [ ] **11.** Command Palette → `View: Reset View Locations` → does it come back?
      → **yes to either:** the container was hidden or relocated and the state is
      remembered per workspace. Relevant — the reporter moved the pane between
      the primary and secondary sidebar in the workspace where it works.

## Pass criteria (after a fix)

- [ ] The 🗂️ icon is on the Activity Bar in every window and workspace from
      activation onward — with no editor open, on a fresh window, on a Settings tab
- [ ] With no code file open the pane shows an empty/welcome message instead of
      vanishing (`viewsWelcome`)
- [ ] `Code Organizer: Show Code Organizer` reveals the pane in every state above
- [ ] Built-in Outline, breadcrumbs and Go to Symbol unchanged

## Cleanup

- [ ] Reopen whatever editors you closed; `View: Reset View Locations` if you
      moved the container

## Notes

- **Baseline not yet run.** Fill in the result here the way #40's protocol did.
- The `"when": "resourceLangId"` clause came in with de890b5 (#29) and has never
  been revisited. `resourceLangId` is the language of the resource in the
  *Explorer or active editor*; `editorLangId` is the narrower "active editor"
  key. Gating on either is questionable for a dedicated container — a pane that
  disappears reads as a broken install, which is exactly the report we got. The
  likely fix is to drop the clause and add a `viewsWelcome` entry.
- **`codeOrganizer.enable` is ruled out by the report.** It is checked before the
  symbol provider is registered (`extension.ts:22`), so if it were `false` the
  Outline would be empty too. It isn't.
- Reporter says **v0.0.1** on VSCodium 1.108.10359 / macOS 26.2. Open VSX has
  never carried 0.0.1 — its oldest is 0.0.3, latest 0.1.1 — so that version
  string is worth confirming before anything else.
- Extensions install per user, not per workspace, so a version difference cannot
  explain "one workspace works" **unless** one of those windows is Remote-SSH or
  a dev container. Our `extensionKind` resolves to `workspace`, so a remote
  window installs and runs its own copy, which can be a different version.
- Ask the reporter for: exact version from the Extensions pane, the **Code
  Organizer** Output Channel contents, whether a code file was open when they
  looked, and whether any of the failing workspaces are remote.
