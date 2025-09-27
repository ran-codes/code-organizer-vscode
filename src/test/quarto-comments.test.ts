import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Quarto Header Section Detection', () => {
  test('should detect realistic Quarto headers as sections', () => {
    const text = `
# 1. Project Documentation
This is a test markdown file for the Code Organizer extension.
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

## 1.1 Installation
Install the extension from VS Code marketplace.
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

### 1.1.1 Requirements
- VS Code 1.102.0 or higher
- No additional dependencies
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

## 1.2 Usage
Create sections using hash comments followed by 4+ dashes.
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

### 1.2.1 Basic Syntax
# Section Name
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

### 1.2.2 Nested Sections
Use multiple hash symbols for nesting:
# Main Section
## Sub Section
### Sub-Sub Section
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

# 2. Examples
Here are some examples of how to use the extension.
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code

## 2.1 Code Examples
The extension works with any file type that supports hash comments.
code
code
code
code
code
code
code
code
code
code
code
code
code
code
code
`;
    const sections = findSections(text, 'qmd');
    assert.strictEqual(sections.length, 12);
    assert.strictEqual(sections[0].name, '1. Project Documentation');
    assert.strictEqual(sections[0].depth, 1);
    assert.strictEqual(sections[1].name, '1.1 Installation');
    assert.strictEqual(sections[1].depth, 2);
    assert.strictEqual(sections[2].name, '1.1.1 Requirements');
    assert.strictEqual(sections[2].depth, 3);
    assert.strictEqual(sections[3].name, '1.2 Usage');
    assert.strictEqual(sections[3].depth, 2);
    assert.strictEqual(sections[4].name, '1.2.1 Basic Syntax');
    assert.strictEqual(sections[4].depth, 3);
    assert.strictEqual(sections[5].name, '1.2.2 Nested Sections');
    assert.strictEqual(sections[5].depth, 3);
    assert.strictEqual(sections[6].name, 'Main Section');
    assert.strictEqual(sections[6].depth, 1);
    assert.strictEqual(sections[7].name, 'Sub Section');
    assert.strictEqual(sections[7].depth, 2);
    assert.strictEqual(sections[8].name, 'Sub-Sub Section');
    assert.strictEqual(sections[8].depth, 3);
    assert.strictEqual(sections[9].name, '2. Examples');
    assert.strictEqual(sections[9].depth, 1);
    assert.strictEqual(sections[10].name, 'Section Name');
    assert.strictEqual(sections[10].depth, 1);
    assert.strictEqual(sections[11].name, '2.1 Code Examples');
    assert.strictEqual(sections[11].depth, 2);
  });
});
