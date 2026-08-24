# Issue #40 — reprex protocol

Selection is invisible on section comment lines. The text *is* selected — our
whole-line decoration (`src/decorations.ts`) paints an opaque band over it when the
theme's `editor.lineHighlightBackground` has no alpha. Dark Modern doesn't set that
color, which is why we never saw it.

Run before the fix (should fail) and after (should pass). ~2 min.

## Setup

- [ ] Extension running — install from Marketplace, or `F5` and use the
      **[Extension Development Host]** window
- [ ] **View → Command Palette…** → `settings json` → **Preferences: Open User Settings (JSON)**
- [ ] Add inside the outer `{ }`:
      `"workbench.colorCustomizations": { "editor.lineHighlightBackground": "#3e3d32" }`
- [ ] **File → Save**
- [ ] Open `assets/test-files/test.py`

## Checks

Double-click a word — a selection box should appear around it.

- [ ] **1.** Double-click `Configuration`, line 1 (section line)
      → before fix: **no box** · after fix: **box**
- [ ] **2.** Double-click `DATABASE_URL`, line 2 (ordinary line)
      → **box**, both before and after
- [ ] **3.** Change the value to `"#3e3d3260"`, save, redo check 1
      → **box**, both before and after

## Pass criteria (after the fix)

- [ ] All three checks show a box
- [ ] Check 3 no longer changes the outcome — alpha is irrelevant now
- [ ] The section highlight is still visible as a feature

## Cleanup

- [ ] Delete the `workbench.colorCustomizations` line and save

## Notes

- Baseline confirmed 2026-08-24 on v0.1.1 — all three checks failed as expected.
- Reported on One Dark Pro (`#2c313c`). Also broken on Monokai, Solarized Dark/Light,
  Quiet Light, Abyss, Kimbie Dark, Tomorrow Night Blue. Fine on Dark Modern, Dark+,
  Light, Red, Dracula.
- Don't test by switching themes — the picker previews on hover and reverts on `Esc`,
  so it looks like it passed when the theme never changed. Override the color instead.
- Interim workaround for users: `"codeOrganizer.enable": false` + reload. Kills the
  whole extension; no setting disables just the highlight.
