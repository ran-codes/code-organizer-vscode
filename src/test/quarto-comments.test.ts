import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Quarto Header Section Detection', () => {
  test('should detect Quarto headers but ignore headers in code blocks', () => {
    const text = `---
title: "My Quarto Document"
format: html
---

# 1. Introduction
This is a Quarto document with code blocks.

## 1.1 Setup
Let's load some libraries:

\`\`\`{r}
# This header should be ignored
## This sub-header should also be ignored
library(ggplot2)
\`\`\`

### 1.1.1 Data Import
Here's how to import data:

\`\`\`python
# Another header to ignore
import pandas as pd
data = pd.read_csv("file.csv")
\`\`\`

## 1.2 Analysis
Now let's analyze the data.

### 1.2.1 Visualization
Creating plots:

\`\`\`{r}
#| echo: false
# Yet another header in code that should be ignored
ggplot(data) + geom_point()
\`\`\`

# 2. Results
Here are our findings.

## 2.1 Summary
The analysis shows interesting patterns.
`;
    const sections = findSections(text, 'qmd');
    
    // Should only detect the real document headers, not the ones inside code blocks
    assert.strictEqual(sections.length, 7);
    assert.strictEqual(sections[0].name, '1. Introduction');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, '1.1 Setup');
    assert.strictEqual(sections[1].depth, 2);
    assert.strictEqual(sections[2].name, '1.1.1 Data Import');
    assert.strictEqual(sections[2].depth, 3);
    assert.strictEqual(sections[3].name, '1.2 Analysis');
    assert.strictEqual(sections[3].depth, 2);
    assert.strictEqual(sections[4].name, '1.2.1 Visualization');
    assert.strictEqual(sections[4].depth, 3);
    assert.strictEqual(sections[5].name, '2. Results');
    assert.strictEqual(sections[5].depth, 1);
    assert.strictEqual(sections[6].name, '2.1 Summary');
    assert.strictEqual(sections[6].depth, 2);
  });

  test('should handle empty code blocks and nested blocks', () => {
    const text = `# Main Header

\`\`\`
# This should be ignored
\`\`\`

## Sub Header

\`\`\`python
# This should also be ignored
## And this too
\`\`\`

### Another Header
Content here.
`;
    const sections = findSections(text, 'qmd');
    assert.strictEqual(sections.length, 3);
    assert.strictEqual(sections[0].name, 'Main Header');
    assert.strictEqual(sections[1].name, 'Sub Header');
    assert.strictEqual(sections[2].name, 'Another Header');
  });
});

// YAML front matter exclusion (#44).
//
// The issue body abbreviated its front matter with `...` elision markers, but
// `...` is a legal Pandoc closing delimiter — a fixture that keeps them closes
// the block early and leaves the `#` comment lines outside the excluded range,
// so it would fail against a *correct* parser. The repro below is the expanded,
// real-YAML form; `...` gets its own tests instead.
suite('Quarto YAML Front Matter Exclusion', () => {
  test('should ignore # comment lines inside YAML front matter (issue #44 repro)', () => {
    const text = `---
title: "harvard__pa_city_defined_nbhd_boundaries__v1"
dataset-type: boundaries
# ccuh-metadata — repo SOT for the Notion tracking-page properties.
# Quarto/Pandoc ignore unknown front-matter keys, so this block is render-safe.
# Controlled fields (dataset-type, dataset-status, topic-tags, maintainers, project)
# must draw from the vocab in templates/notion-dataset-page.md — do not free-type.
ccuh-metadata:
  version: 1.0.0
  status: active
---

# 1. Setup
Load the libraries.

## 1.1 Sub
A nested section.

# 2. Import
Read the source data.
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 3);
    assert.strictEqual(sections[0].name, '1. Setup');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, '1.1 Sub');
    assert.strictEqual(sections[1].depth, 2);
    assert.strictEqual(sections[2].name, '2. Import');
    assert.strictEqual(sections[2].depth, 1);
  });

  test('should treat `...` as a closing delimiter (Pandoc alternative)', () => {
    const text = `---
title: "My Document"
# a YAML comment that must not become a section
key: value
...

# 1. Setup

## 1.1 Sub

# 2. Import
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 3);
    assert.strictEqual(sections[0].name, '1. Setup');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, '1.1 Sub');
    assert.strictEqual(sections[1].depth, 2);
    assert.strictEqual(sections[2].name, '2. Import');
    assert.strictEqual(sections[2].depth, 1);
  });

  test('should close the block at the FIRST `...`, not a later delimiter', () => {
    // The guard against the elided-repro trap: everything below the first
    // closer is document body, headers included.
    const text = `---
title: "x"
...
# After The Closer
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'After The Closer');
    assert.strictEqual(sections[0].depth, 1);
  });

  test('should NOT treat an unclosed leading `---` as front matter', () => {
    // A lone top rule with no closer must not swallow the whole file — this
    // deliberately differs from fence handling, which extends to EOF.
    const text = `---

# Real Header
Body text.

## Real Sub Header
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].name, 'Real Header');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, 'Real Sub Header');
    assert.strictEqual(sections[1].depth, 2);
  });

  test('should not treat mid-file `---` rules as front matter delimiters', () => {
    const text = `Some intro prose before anything else.

---

# Mid Doc Header
Body text.

---
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'Mid Doc Header');
    assert.strictEqual(sections[0].depth, 1);
  });

  test('treats a line-1 horizontal rule as front matter (known limitation, #44)', () => {
    // Deliberate, not a bug: a line-1 `---` with any later `---`/`...` is taken
    // as front matter even when both were meant as rules, because Pandoc/Quarto
    // read the same file the same way. Asserted so nobody "fixes" it.
    const text = `---
# Header A
---
# Header B
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'Header B');
    assert.strictEqual(sections[0].depth, 1);
  });

  test('should yield zero sections for a front-matter-only file', () => {
    const text = `---
title: "Metadata Only"
# a comment
# another comment
nested:
  key: value
---
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 0);
  });

  test('should exclude front matter and code fences together', () => {
    const text = `---
title: "Both Exclusions"
# front matter comment, must be ignored
---

# 1. Real Header

\`\`\`{r}
# ignored inside the fence
## also ignored
library(ggplot2)
\`\`\`

## 1.1 Second Real Header
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].name, '1. Real Header');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, '1.1 Second Real Header');
    assert.strictEqual(sections[1].depth, 2);
  });

  test('should not treat an indented `---` as a delimiter', () => {
    // trimEnd(), not trim(): an indented `---` is not a YAML/Jekyll delimiter.
    const text = `  ---
# Real Header
  ---
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'Real Header');
  });

  test('should not accept a `---` inside a code fence as the closing delimiter', () => {
    // A line-1 `---` meant as a horizontal rule, where the only later `---`
    // sits inside a fence. The closer search stops at the unindented ```, so
    // the block reads as unclosed and excludes nothing — `Header A` survives.
    const text = `---

# Header A

\`\`\`r
---
\`\`\`

# Header B
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].name, 'Header A');
    assert.strictEqual(sections[1].name, 'Header B');
  });

  test('should not let an indented fence bypass the closer-search stop', () => {
    // The stop only fires on a column-0 ```, so a fence indented 1-3 spaces
    // (still a valid CommonMark fence) lets the `---` inside it be taken as the
    // closer. `Header A` is then lost to the known limitation above — but the
    // fence scan must not *also* resume half a fence out of phase and swallow
    // `Header B`, which sits outside the block entirely.
    const text = `---

# Header A

  \`\`\`r
---
  \`\`\`

# Header B
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, 'Header B');
  });

  test('should not let an unmatched fence swallow the headers below it', () => {
    // The ordinary editing loop: the user has typed an opening fence and has
    // not closed it yet. Extending it to EOF blanks the rest of the outline on
    // every keystroke until the closing ``` lands.
    const text = `---
title: "x"
---

# 1. Setup

\`\`\`r
library(dplyr)

# 2. Analysis

# 3. Export
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 3);
    assert.strictEqual(sections[0].name, '1. Setup');
    assert.strictEqual(sections[1].name, '2. Analysis');
    assert.strictEqual(sections[2].name, '3. Export');
  });

  test('should not let a ``` inside front matter open a phantom fence', () => {
    // A fence marker in a YAML block scalar is metadata, not a fence opener.
    // Scanning it as one leaves an unmatched fence that runs to EOF and blanks
    // the whole outline, so the fence scan skips the front-matter range.
    const text = `---
title: "Block Scalar"
desc: >
  \`\`\`
---

# Real Header

## Real Sub Header
`;
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].name, 'Real Header');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, 'Real Sub Header');
    assert.strictEqual(sections[1].depth, 2);
  });

  test('should exclude front matter in a CRLF document', () => {
    // trimEnd() is what strips the `\r`. An exact `=== '---'` compare would
    // break every CRLF file on Windows and no other test would notice.
    const text = '---\r\ntitle: "x"\r\n# a YAML comment\r\n---\r\n\r\n# 1. Setup\r\n\r\n## 1.1 Sub\r\n';
    const sections = findSections(text, 'qmd');

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].name, '1. Setup');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, '1.1 Sub');
    assert.strictEqual(sections[1].depth, 2);
  });
});
