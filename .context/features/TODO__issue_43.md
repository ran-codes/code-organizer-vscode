# Issue #43: Support Mermaid `%%` Comments

> **Status: TODO** — this is a ready-to-implement spec. An agent picking this up
> should read `src/CLAUDE.md`, `src/utils/CLAUDE.md`, and `src/test/CLAUDE.md`
> first, then follow the Implementation Steps below.

**Issue:** https://github.com/ran-codes/code-organizer-vscode/issues/43

---

## Problem Statement

Mermaid uses `%%` as its comment marker instead of `#` or `//`. Code Organizer's
parser recognizes none of the `%%` forms, so Mermaid files (`.mmd`) get no outline.

The reporter's requested syntax:

```
%% # Section Name ----
%% ## SubSection Name ----
```

**Goal:** `findSections()` recognizes `%% <hashes> Name ----` lines, with depth
driven by the hash count (`#` = 1 … `####` = 4), exactly like the existing hash
style but behind a `%%` prefix.

### Triage (done 2026-08-19)

| Scale | Score | Notes |
| --- | --- | --- |
| Ease | 8/10 | One `COMMENT_PATTERNS` table entry + one test suite. The parser is designed for this. |
| Blast radius | 2/10 | Pattern applies to all non-markdown languages, but the `----` terminator makes accidental matches near-zero. Erlang/LaTeX (`%%` comments) gain support for free — a bonus, not a bug. |
| Risk | 2/10 | Purely additive; existing patterns untouched; per-syntax suites lock in current behavior. |

---

## Design Decisions (already made — do not re-litigate)

1. **Depth comes from hashes, not repeated `%%`.** Mermaid does not nest comments
   by repeating `%%`, so model this as the reporter proposed: fixed `%%` prefix,
   then `#{1,4}` for depth. Do **not** model it like `//`/`--` (`(%%+)` with
   `symbolUnit: 2`).
2. **No language gating.** `COMMENT_PATTERNS` is not language-gated (the symbol
   provider registers for `*` plus specific languages — see `src/extension.ts`),
   and this entry follows suit. That is what makes it work for `.mmd` files even
   when no Mermaid language extension is installed (languageId `plaintext`).
3. **Hash bounded at 4, same as the hash style.** `#{1,4}` — on
   `%% ##### Level 5 ----` the 5th `#` becomes part of the name. This matches the
   documented behavior of the plain hash pattern (see the comment above
   `dashSource` in `findSections.ts`); assert it in tests to lock it in.
4. **Bare `%% Name ----` (no hashes) is out of scope.** Only the hash-prefixed
   form from the issue. If a follow-up wants depth-1-by-default for bare `%%`,
   that is a separate issue.

### Known limitation to state when closing the issue

This only helps **standalone `.mmd` files**. Mermaid blocks inside markdown
``` fences are deliberately excluded from parsing (the markdown code path skips
fenced blocks), and that does not change here.

---

## Implementation Steps

### Step 1: Add one entry to `COMMENT_PATTERNS`

**Location:** `src/utils/findSections.ts`, the `COMMENT_PATTERNS` array (after
the JSX entry).

```typescript
  // Mermaid comments: %% # Section Name ---- (depth from the hashes, not the %%)
  // Hand-written — fixed `%%` prefix, then the bounded hash ladder.
  { source: String.raw`^[ \t]*%%\s*(#{1,4})\s*(.+?)\s+[-]{4,}\s*$`, symbolUnit: 1 },
```

Contract check (per `src/utils/CLAUDE.md`): exactly two capture groups —
(1) comment symbols (the hashes), (2) section name — and `symbolUnit: 1` because
one `#` per depth level. No other code changes; depth, parent resolution, and
`uniqueId` all come from the shared machinery.

**Do not** hoist the compiled regex, and do not touch the existing entries.

### Step 2: Add the test suite

**Location:** new file `src/test/mermaid-comments.test.ts`.

Mirror `sql-comments.test.ts` / `hash-comments.test.ts` in shape. Per
`src/test/CLAUDE.md`, every syntax suite covers the same axes — cover all of
them, and **assert names as well as depths** (a depth-only assertion once let a
quantifier change slip through):

- **Basic detection** — `%% # One ----`, `%% ## Sub ----`, `%% # Two ----` →
  3 sections, correct names and depths (1, 2, 1).
- **Nesting/depth** — `%% #` through `%% ####` → depths 1–4; and
  `%% ##### Level 5 ----` → depth 4 with name `# Level 5` (the 5th hash joins
  the name — this locks in the `#{1,4}` bound; verify the exact expected name
  against `hash-comments.test.ts`'s equivalent assertion).
- **`uniqueId` / `parentId`** — child's `parentId === parent.uniqueId`.
- **Invalid patterns ignored** — `%% # Too Short --` (only 2 dashes),
  `%% # ----` (no name), `%% Name ----` (no hashes — out of scope, must NOT
  match), `# Plain hash ----` still matches via the existing hash pattern
  (they coexist; expect it as a separate section, not a duplicate).
- **Indentation** — leading spaces and tabs before `%%`.
- **Mermaid-realistic fixture** — a `flowchart TD` / `sequenceDiagram` body with
  `%% # ... ----` section lines interleaved; also assert that a Mermaid directive
  line `%%{init: {'theme':'dark'}}%%` does **not** match.

Note the existing hash pattern also matches lines like `# Foo ----` in the same
file — fine and expected; write fixtures so each assertion targets the `%%` form.

### Step 3: Add the committed sample file

**Location:** `assets/test-files/test.mmd` (new; joins the one-per-language set).

A small real Mermaid diagram (e.g. `flowchart TD`) with `%% # ... ----` and
`%% ## ... ----` sections and at least one `%%{init: ...}%%` directive. Keep it
in the same spirit as the other `assets/test-files/*` fixtures.

Optionally drop a scratch copy in `test-files/` for F5 eyeballing.

### Step 4: Verify

```
npm run compile      # type-check + lint + dev bundle
npm run test         # full suite — all existing syntax suites must still pass
```

Then `F5` → Extension Development Host → open `assets/test-files/test.mmd` →
confirm sections appear in both the built-in Outline **and** the Activity Bar
TreeView (both consumers call `findSections` independently; a parser-only change
should light up both with zero provider edits).

### Step 5: Docs

- `src/utils/CLAUDE.md` — no structural change needed, but if the "Adding a
  comment style" section's claims still hold (they should), leave it alone.
- `README.md` — add Mermaid to the supported-syntax list/table if one exists.
- `CHANGELOG.md` — entry under the next version (version bump happens at
  release time per `.context/workflow.md`, not necessarily in this PR).

---

## Acceptance Criteria

- [ ] `%% # Name ----` → depth-1 section; `%% ## Name ----` → depth-2; through depth 4
- [ ] `%% ##### Name ----` capped at depth 4, 5th `#` part of the name
- [ ] `%%{init: ...}%%` directives and plain `%% comment` lines produce no sections
- [ ] All pre-existing test suites pass unchanged
- [ ] `npm run compile` clean (type-check + lint — the only automated gate)
- [ ] Sections visible in Outline + TreeView for `assets/test-files/test.mmd` under F5
- [ ] New suite `src/test/mermaid-comments.test.ts` covers all standard axes with name+depth assertions

## Out of Scope

- Bare `%% Name ----` (no hashes) as an implicit depth-1 section
- Parsing Mermaid inside markdown fences
- Registering a `mermaid` language contribution or `.mmd` file association

---

## Workflow Notes (for the implementing agent)

- Branch: `feature/43-mermaid-comments` (pattern: `feature/[issue]-[description]`).
- Reference #43 in the commit/PR (e.g. `Add Mermaid %% comment support #43`).
- This is a code-only change; release/publish steps are separate and follow
  `.context/workflow.md` — do not bump the version or publish from this task
  unless explicitly asked.
