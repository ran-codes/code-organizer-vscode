# VS Code API Documentation for Editor → Outline Synchronization

## Overview

This directory contains documentation for implementing editor → outline synchronization in the Code Organizer extension. The goal is to highlight the current section in the outline view and auto-scroll as the cursor moves in the editor.

## Documentation Files

1. **[window-events.md](window-events.md)** - Tracking cursor position and editor changes
   - `window.onDidChangeTextEditorSelection` - Detect cursor movements
   - `window.onDidChangeActiveTextEditor` - Detect editor switches
   - `Selection` and `Position` classes
   - Converting between Position and character offsets

2. **[tree-view.md](tree-view.md)** - Custom tree views for outline with highlighting support
   - `window.createTreeView()` - Create custom sidebar views
   - `TreeView.reveal()` - **Key method for highlighting and scrolling**
   - `TreeDataProvider` interface
   - Comparison with DocumentSymbolProvider

3. **[document-symbols.md](document-symbols.md)** - Understanding your current implementation
   - `DocumentSymbolProvider` interface (what you currently use)
   - `DocumentSymbol` class and hierarchy
   - Limitations for programmatic highlighting
   - Converting between offsets and positions

4. **[editor-decorations.md](editor-decorations.md)** - Highlighting sections in the editor
   - `TextEditorDecorationType` - Define visual styles
   - `TextEditor.setDecorations()` - Apply highlights to ranges
   - `ThemeColor` - Theme-aware colors
   - Alternative approach to outline highlighting

## Current Extension Architecture

```
Your Current Stack:
├── extension.ts
│   └── Registers DocumentSymbolProvider for all languages
├── documentSymbolProvider.ts
│   └── Implements provideDocumentSymbols()
│       └── Returns DocumentSymbol[] hierarchy
└── utils/findSections.ts
    └── Parses document for section markers
        └── Returns SectionMatch[] with positions

VS Code Integration:
└── DocumentSymbolProvider
    └── Populates built-in Outline view
        └── Automatic outline → editor navigation (click to jump)
        └── ❌ NO editor → outline sync (can't highlight items)
```

## Implementation Approaches

### Approach A: Custom TreeView (Recommended)

**Add a custom tree view alongside your existing DocumentSymbolProvider**

**Pros:**
- Full control over highlighting with `TreeView.reveal()`
- Can auto-scroll outline to current section
- Users keep both: built-in Outline + enhanced outline
- Most direct solution to the feature request

**Cons:**
- More code to maintain
- Duplicate section parsing (can be optimized)
- Another view in the sidebar

**Steps:**
1. Create `TreeDataProvider` implementation ([tree-view.md](tree-view.md))
2. Register tree view in `package.json` and `extension.ts`
3. Listen to cursor changes ([window-events.md](window-events.md))
4. Use `TreeView.reveal()` to highlight current section

**Key code:**
```typescript
// Listen for cursor changes
vscode.window.onDidChangeTextEditorSelection(async (event) => {
  const cursorPos = event.selections[0].active;
  const section = getCurrentSection(cursorPos, event.textEditor.document);

  if (section) {
    const item = new SectionItem(section, allSections);
    await treeView.reveal(item, {
      select: true,   // Highlight it!
      focus: false,   // Don't steal focus
      expand: 1       // Expand if needed
    });
  }
});
```

---

### Approach B: Editor Decorations

**Highlight the current section in the editor instead of the outline**

**Pros:**
- Simpler to implement
- Works with existing DocumentSymbolProvider
- Visual feedback right where user is looking (in editor)
- Can combine with status bar text

**Cons:**
- Doesn't directly address "outline highlighting" request
- May be visually noisy in some themes
- Requires finding section end positions

**Steps:**
1. Create decoration type ([editor-decorations.md](editor-decorations.md))
2. Listen to cursor changes ([window-events.md](window-events.md))
3. Apply decorations to current section header/block
4. Optionally add status bar item

**Key code:**
```typescript
const decoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
  borderWidth: '0 0 0 3px',
  borderStyle: 'solid',
  borderColor: new vscode.ThemeColor('editorInfo.foreground')
});

vscode.window.onDidChangeTextEditorSelection(() => {
  const section = getCurrentSection();
  if (section) {
    const range = getSectionHeaderRange(section);
    editor.setDecorations(decoration, [range]);
  }
});
```

---

### Approach C: Hybrid (Best of Both Worlds)

**Combine custom TreeView + editor decorations**

1. Add custom TreeView for outline highlighting
2. Add editor decorations for in-editor feedback
3. Keep existing DocumentSymbolProvider for built-in Outline
4. Add status bar item showing current section name

Users get maximum feedback about their location in the document!

---

## Implementation Checklist

Based on the workflow.md action items:

- [x] Research existing workflows ✅
- [x] Write documentation on associated VS Code extension API docs ✅
- [ ] Implement editor → outline synchronization
  - [ ] Choose approach (A, B, or C)
  - [ ] Implement cursor position tracking
  - [ ] Find current section from cursor position
  - [ ] Highlight current section (TreeView or decorations)
  - [ ] Handle edge cases (empty files, cursor outside sections, etc.)
- [ ] Test
  - [ ] Test with different file types (JavaScript, Python, Markdown, etc.)
  - [ ] Test with nested sections (depth 1-4)
  - [ ] Test cursor movement (keyboard, mouse, scrolling)
  - [ ] Test editor switching (multiple open files)
  - [ ] Test performance (large files, rapid cursor movement)

---

## Key Challenges to Address

### 1. Converting Positions and Offsets

Your `SectionMatch` uses character offsets:
```typescript
interface SectionMatch {
  index: number;  // Character offset
  // ...
}
```

VS Code events use `Position` (line/character):
```typescript
const cursorPos = event.selections[0].active; // Position object
```

**Solution:**
```typescript
// Position → Offset
const offset = document.offsetAt(cursorPos);

// Offset → Position
const position = document.positionAt(section.index);
```

See [window-events.md](window-events.md) for details.

---

### 2. Finding Section Boundaries

Sections have start positions but not explicit end positions. You need to determine where each section ends:

**Option 1:** Section ends at next section of same/lower depth
```typescript
function getSectionEnd(section: SectionMatch, allSections: SectionMatch[]): number {
  const nextSection = allSections.find(s =>
    s.index > section.index && s.depth <= section.depth
  );
  return nextSection ? nextSection.index : documentLength;
}
```

**Option 2:** Section includes only its header line
```typescript
const endPos = section.index + section.fullText.length;
```

See [document-symbols.md](document-symbols.md) for discussion.

---

### 3. Finding Deepest Matching Section

When cursor is in a nested section, you probably want to highlight the deepest (most specific) section:

```typescript
function getCurrentSection(
  cursorPos: vscode.Position,
  document: vscode.TextDocument,
  sections: SectionMatch[]
): SectionMatch | undefined {

  const offset = document.offsetAt(cursorPos);
  let deepestSection: SectionMatch | undefined;

  for (const section of sections) {
    const sectionStart = section.index;
    const sectionEnd = getSectionEnd(section, sections);

    if (offset >= sectionStart && offset < sectionEnd) {
      // Found a containing section
      if (!deepestSection || section.depth > deepestSection.depth) {
        deepestSection = section;
      }
    }
  }

  return deepestSection;
}
```

---

### 4. Performance Optimization

Cursor change events fire very frequently. Optimize:

1. **Debounce updates** (wait 100-200ms after cursor stops moving)
2. **Cache section parsing** (only reparse on document changes)
3. **Early return** if document hasn't changed
4. **Check if editor is visible** before updating

```typescript
let timeout: NodeJS.Timeout | undefined;
let lastDocument: vscode.TextDocument | undefined;
let cachedSections: SectionMatch[] | undefined;

vscode.window.onDidChangeTextEditorSelection((event) => {
  if (timeout) clearTimeout(timeout);

  timeout = setTimeout(() => {
    const doc = event.textEditor.document;

    // Reparse if document changed
    if (doc !== lastDocument) {
      cachedSections = findSections(doc.getText(), doc.languageId);
      lastDocument = doc;
    }

    updateHighlight(event.selections[0].active, doc, cachedSections!);
  }, 150);
});

// Clear cache on document changes
vscode.workspace.onDidChangeTextDocument((event) => {
  if (event.document === lastDocument) {
    cachedSections = undefined;
  }
});
```

---

## Quick Start: Minimal Implementation

Here's a minimal implementation using Approach B (editor decorations):

```typescript
// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  // ... existing DocumentSymbolProvider registration ...

  // Create decoration type
  const decoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
    borderWidth: '0 0 0 3px',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('editorInfo.foreground')
  });

  // Update function
  const updateHighlight = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const offset = editor.document.offsetAt(editor.selection.active);
    const sections = findSections(
      editor.document.getText(),
      editor.document.languageId
    );

    const current = sections.find(s => {
      const next = sections.find(n => n.index > s.index && n.depth <= s.depth);
      const end = next ? next.index : editor.document.getText().length;
      return offset >= s.index && offset < end;
    });

    if (current) {
      const start = editor.document.positionAt(current.index);
      const end = editor.document.positionAt(current.index + current.fullText.length);
      editor.setDecorations(decoration, [new vscode.Range(start, end)]);
    } else {
      editor.setDecorations(decoration, []);
    }
  };

  // Listen to events
  let timeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(updateHighlight, 150);
    }),
    vscode.window.onDidChangeActiveTextEditor(updateHighlight),
    decoration
  );

  updateHighlight();
}
```

---

## Next Steps

1. **Choose your approach** (A, B, or C above)
2. **Read the relevant API docs** in this directory
3. **Implement cursor tracking** using [window-events.md](window-events.md)
4. **Implement highlighting** using either:
   - [tree-view.md](tree-view.md) for outline highlighting, or
   - [editor-decorations.md](editor-decorations.md) for editor highlighting
5. **Test thoroughly** with different file types and edge cases
6. **Optimize performance** with caching and debouncing

Good luck! 🚀
