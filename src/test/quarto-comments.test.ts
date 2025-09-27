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
