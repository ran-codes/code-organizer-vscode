# Issue #44: YAML Front Matter Comments Parsed as Sections

> **Status: TODO** — this is a ready-to-implement spec. An agent picking this up
> should read `src/CLAUDE.md`, `src/utils/CLAUDE.md`, and `src/test/CLAUDE.md`
> first, then follow the Plan below.

**Issue:** https://github.com/ran-codes/code-organizer-vscode/issues/44

---

## PRD

### Problem Statement

In Quarto/markdown files, `#` lines inside the YAML front matter block are parsed
as section headers. The markdown/quarto code path in `findSections.ts` matches any
`^#{1,6} <text>$` line without requiring the `----` terminator, so YAML *comments*
in the front matter look identical to markdown H1 headers.

Repro from the issue (a `.qmd` file):

```
---
title: "harvard__pa_city_defined_nbhd_boundaries__v1"
...
# ccuh-metadata — repo SOT for the Notion tracking-page properties.
# Quarto/Pandoc ignore unknown front-matter keys, so this block is render-safe.
# Controlled fields (dataset-type, dataset-status, topic-tags, maintainers, project)
# must draw from the vocab in templates/notion-dataset-page.md — do not free-type.
ccuh-metadata:
  version: 1.0.0
...
---
```

The four YAML comment lines appear as four bogus top-level sections in both the
Outline and the Activity Bar TreeView, above the real sections (`1. Setup` …
`6. Access`).

**Goal:** the markdown/quarto path excludes matches inside the YAML front matter
block, exactly the way it already excludes matches inside ``` code fences.

### Triage (done 2026-08-19)

| Scale | Score | Notes |
| --- | --- | --- |
| Difficulty | 2/10 | The exclusion machinery already exists for fences (`findSections.ts:74-111`); front matter is one more excluded line range. ~15 lines. |
| Complexity | 3/10 | Logic is simple; the work is the edge-case decisions (all made below — first-line gating, `...` closer, unclosed block). |
| Blast radius | 3/10 | The parser feeds everything (single-parser invariant), but the change is gated to the markdown/quarto branch and only removes matches from a top-of-file range. Non-markdown languages and files without front matter are untouched. |
| Risk | 2/10 | One real failure mode — an unclosed opening `---` suppressing every header in the file — handled explicitly by decision 3 below. No `uniqueId`/parent changes; sections after the front matter keep the identities they'd have had. |
| Testability | 9/10 | `findSections` is vscode-free; every case is a direct unit assertion on an inline fixture. Fully TDD-able — write the failing fixtures first. |

### Acceptance Criteria

- [ ] The repro above (as `qmd`) yields **zero** sections from the front matter;
      headers after the closing `---` parse normally with unchanged names/depths
- [ ] Front matter closed with `...` (Pandoc alternative) is also excluded
- [ ] **Unclosed** `---` on line 1 with no closing delimiter → treated as *not*
      front matter; all headers in the file still parse (no whole-file swallowing)
- [ ] `---` lines *not* starting at line 1 (horizontal rules, setext underlines)
      do not create an excluded range
- [ ] A front-matter-only file yields zero sections
- [ ] Both existing md/quarto suites pass unchanged — including the quarto fixture
      that already opens with front matter (no `#` lines inside it, so it must
      still yield its 7 sections)
- [ ] All non-markdown syntax suites pass unchanged
- [ ] `npm run compile` clean (type-check + lint — the only automated gate)
- [ ] Under F5, the repro file shows only real sections in **both** the Outline
      and the Activity Bar TreeView (both consumers call `findSections`; a
      parser-only fix must light up both with zero provider edits)

### Out of Scope

- Mid-document Pandoc YAML metadata blocks (`---` blocks not at line 1)
- TOML (`+++`) or JSON front matter
- Front matter handling for non-markdown languages (the dash-terminated comment
  path never matched front matter lines in the first place — `# foo` without
  `----` doesn't match `COMMENT_PATTERNS`)
- Parsing front matter *content* (e.g. surfacing `title:` as a section)

---

## Plan

### Design Decisions (already made — do not re-litigate)

1. **Front matter = `---` as the very first line of the document** (trailing
   whitespace allowed, nothing else on the line). Not "first non-blank line" —
   Jekyll/Quarto both require line 1, and gating to line 1 is what keeps mid-file
   `---` (horizontal rules, setext H2 underlines) from ever being misread as an
   opening delimiter.
2. **The closing delimiter is the next line that is exactly `---` or `...`**
   (again trailing whitespace allowed). Pandoc accepts `...` as the terminator.
3. **Unclosed front matter is not front matter.** If line 1 is `---` but no
   closing delimiter exists, exclude *nothing*. This deliberately differs from
   the fence handling (which extends an unmatched fence to EOF): suppressing
   every header in the file is the worse failure, and a lone top `---` with no
   close is more plausibly a stray rule than a metadata block.
4. **All markdown/quarto languageIds get it** (`markdown`, `quarto`, `md`,
   `qmd`, `rmd`) — Jekyll/Hugo front matter in plain `.md` is common. No new
   language gating; reuse the existing `isMarkdownOrQuarto` check.
5. **Reuse the existing exclusion machinery, don't build a parallel one.** The
   front matter range is pushed into the same line-range list the fence scan
   builds, so the single `isInCodeBlock` check covers both. Rename the internals
   to match (`codeBlocks` → `excludedRanges`, `isInCodeBlock` → `isExcluded`) —
   they're function-local, so the rename leaks nowhere.

### Step 1: Failing tests first (TDD)

**Location:** extend `src/test/quarto-comments.test.ts` (primary — the issue is a
`.qmd`) and mirror the core case in `src/test/md-comments.test.ts` with
languageId `markdown`.

Fixtures, each as an inline template string (assert **names as well as depths**,
per `src/test/CLAUDE.md`):

- **The issue repro** — front matter containing 4 `#` comment lines and an
  indented `# full semver…`-style inline comment, followed by real headers
  `# 1. Setup` / `## 1.1 Sub` / `# 2. Import`. Assert exactly 3 sections with
  those names and depths (1, 2, 1) — nothing from the front matter.
- **`...` closer** — same shape, front matter terminated by `...`. Same assertions.
- **Unclosed `---`** — line 1 is `---`, no closer anywhere, `# Real Header`
  below. Assert the header IS found (decision 3).
- **Mid-file `---`** — content, then `---`, then `# Header`, then `---`. Assert
  the header IS found (rules are not delimiters — decision 1).
- **Front-matter-only file** — `---` / keys with `#` comments / `---`, nothing
  after. Assert zero sections.
- **Front matter + fence interaction** — front matter, then a real header, then a
  ``` fence containing `# ignored`. Assert both exclusions coexist.

Run `npm run compile-tests && npx vscode-test` (narrow the `files` glob in
`.vscode-test.mjs` to the quarto suite, revert after) and confirm the new tests
**fail** before touching the parser.

### Step 2: The fix in `findSections.ts`

**Location:** `src/utils/findSections.ts`, inside the `if (isMarkdownOrQuarto)`
block (lines 76–99) — before the fence scan, using the same `lines` array.

```typescript
// YAML front matter: `---` as the very first line, closed by the next
// `---` or `...` line. Unclosed → excluded as NOT front matter (a lone
// top rule must not swallow the file), unlike fences which extend to EOF.
if (lines.length > 0 && lines[0].trimEnd() === '---') {
  const closer = lines.findIndex(
    (line, i) => i > 0 && ['---', '...'].includes(line.trimEnd())
  );
  if (closer !== -1) {
    excludedRanges.push({ start: 0, end: closer });
  }
}
```

Plus the local rename from decision 5 (`codeBlocks` → `excludedRanges`,
`isInCodeBlock` → `isExcluded`, and the two comments that mention them). No
signature, type, or export changes; `SectionMatch`, depth, parent resolution,
and `uniqueId` are untouched. **Do not** touch `COMMENT_PATTERNS`,
`MARKDOWN_PATTERNS`, or the per-call regex construction.

Note `trimEnd()`, not `trim()` — an *indented* `---` is not a delimiter in
YAML/Jekyll/Quarto.

### Step 3: Verify

```
npm run compile      # type-check + lint + dev bundle
npm run test         # full suite — every pre-existing suite must pass unchanged
```

Then `F5` → Extension Development Host → open a scratch `.qmd` reproducing the
issue (drop one in `test-files/`, e.g. `test-files/frontmatter.qmd` — scratch
dir, not `assets/test-files/`) → confirm the front matter comments are gone from
both the Outline and the TreeView, and that cursor sync still highlights/reveals
the real sections.

### Step 4: Docs

- `src/utils/CLAUDE.md` — the last paragraph documents the markdown/quarto code
  path ("matches inside ``` fences are excluded"); extend it with the front
  matter exclusion in one sentence.
- Root `CLAUDE.md` §3 has the same sentence in the "Markdown/Quarto take a
  different code path" bullet — extend it identically.
- `CHANGELOG.md` — entry under the next version (version bump happens at release
  time per `.context/workflow.md`, not in this PR).
- `README.md` — no change; this is a bug fix, not a feature.

---

## Workflow Notes (for the implementing agent)

- Branch: `feature/44-frontmatter-exclusion` off `master` (pattern:
  `feature/[issue]-[description]`). Note: `refactor-3` has uncommitted work in
  flight — do not build on it.
- Reference #44 in the commit/PR (e.g. `Exclude YAML front matter from markdown parsing #44`).
- Code-only change; release/publish steps are separate and follow
  `.context/workflow.md` — do not bump the version or publish from this task
  unless explicitly asked.
