# Issue #42 — reprex protocol

## Terms

| Term | What the user sees | What it is in code |
| --- | --- | --- |
| **native outline** | VS Code's own *Outline* in the Explorer sidebar | we only feed it — `documentSymbolProvider.ts` |
| **custom button** | our 🗂️ icon on the Activity Bar rail | view container `codeOrganizer` (`package.json:128`) |
| **custom outline** | our tree, rendered inside the button's pane | view `codeOrganizerOutlineActivity` (`package.json:137`), fed by `treeDataProvider.ts` |

The reporter has the **native outline** working and the **custom button**
missing. Those are different features, so "it shows up in the default Outline
panel" is not evidence the button should be there. It only proves `activate()`
ran past the `enable` check — which also means `createTreeView(...)` ran, since
it is unconditional twelve lines later (`extension.ts:48`). The custom outline
*is* registered.

The one thing left between "registered" and "an icon on the rail": the
`"when": "resourceLangId"` clause sits on the **custom outline**
(`package.json:139`), but VS Code drops the **custom button** off the rail
entirely when every outline inside it is `when`-false — and `resourceLangId` is
undefined whenever no editor is active. So the button vanishes instead of
showing an empty pane, which reads as a broken install.

Run A first; it may end the investigation. ~5 min.

## Setup

- [ ] Extension running — install from Open VSX/Marketplace, or `F5` and use the
      **[Extension Development Host]** window
- [ ] A folder open with a code file in it — `assets/test-files/test.py` works
- [ ] **View → Output** → pick **Code Organizer** in the dropdown

## A. Does this build have the custom button at all?

- [ ] **1.** **Code → Settings → Extensions** (macOS) → find Code Organizer →
      read the installed version
      → **0.0.x: stop.** No custom button in that build — the native outline is
      all it ever had. Upgrade to 0.1.1 and re-check.
      → **0.1.x: continue to B.**
- [ ] **2.** Output channel shows `Activity bar TreeView created`
      → **absent:** the extension did not activate, or `codeOrganizer.enable` is
      `false` — a different bug; the native outline would be dead too

## B. The `when` clause (primary hypothesis)

- [ ] **3.** Open `test.py` → **custom button present** on the rail, custom
      outline lists sections. This is the working state.
- [ ] **4.** Command Palette → `View: Close All Editors`
      → **custom button disappears from the rail entirely** — not an empty pane,
      gone
- [ ] **5.** Still with no editor open, open **Settings** (the Settings UI has no
      `resourceLangId`) → button still absent
- [ ] **6.** Reopen `test.py` → button returns
- [ ] **7.** With no editor open, Command Palette →
      `Code Organizer: Show Code Organizer`
      → **nothing happens, no error.** `codeOrganizerOutlineActivity.focus` is a
      no-op against a `when`-false custom outline. This is what the reporter tried.
- [ ] **8.** With no editor open, Command Palette → `Code Organizer: Activate`
      → *"Code Organizer is already active and working!"* — true, and useless.
      This is the misleading part.
- [ ] **9.** **File → New Window** (no folder) → button absent though the
      extension is active; open any code file → button appears

If 4 and 6 flip the button on and off, the `when` clause is the cause and B is
the whole story.

## C. Persisted button placement (secondary)

Only if the button stays missing in check 3 — i.e. missing *with* a code file open.

- [ ] **10.** Right-click the Activity Bar → is **Code Organizer** listed and
      unchecked? Check it → does the button come back?
- [ ] **11.** Command Palette → `View: Reset View Locations` → does it come back?
      → **yes to either:** the button was hidden or moved, and that placement is
      remembered per workspace. Relevant — the reporter moved the pane between
      the primary and secondary sidebar in the workspace where it works.

## Pass criteria (after a fix)

- [ ] The **custom button** is on the rail in every window and workspace from
      activation onward — no editor open, fresh window, Settings tab
- [ ] With no code file open the **custom outline** shows an empty/welcome
      message instead of vanishing (`viewsWelcome` — we have no entry today)
- [ ] `Code Organizer: Show Code Organizer` reveals the pane in every state above
- [ ] **native outline**, breadcrumbs and Go to Symbol unchanged

## Cleanup

- [ ] Reopen whatever editors you closed; `View: Reset View Locations` if you
      moved the button

## Notes

- **Baseline not yet run.** Fill in the result here the way #40's protocol did.
- The `"when": "resourceLangId"` clause came in with de890b5 (#29) and has never
  been revisited. `resourceLangId` is the language of the resource in the
  *Explorer or active editor*; `editorLangId` is the narrower "active editor"
  key. Gating on either is questionable when it is the only outline in the
  button's container. Likely fix: drop the clause, add a `viewsWelcome` entry.
- **`codeOrganizer.enable` is ruled out by the report.** It is checked before the
  symbol provider is registered (`extension.ts:22`), so if it were `false` the
  native outline would be empty too. It isn't.
- Reporter says **v0.0.1** on VSCodium 1.108.10359 / macOS 26.2. Open VSX has
  never carried 0.0.1 — its oldest is 0.0.3, latest 0.1.1 — so confirm that
  version string before anything else.
- Extensions install per user, not per workspace, so a version difference cannot
  explain "one workspace works" **unless** one of those windows is Remote-SSH or
  a dev container. Our `extensionKind` resolves to `workspace`, so a remote
  window installs and runs its own copy, which can be a different version.
- Ask the reporter for: exact version from the Extensions pane, the **Code
  Organizer** Output Channel contents, whether a code file was open when they
  looked, and whether any failing workspace is remote.
