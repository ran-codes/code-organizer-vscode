# VS Code API: Editor Decorations and Text Highlighting

## Overview
This document covers APIs for highlighting text in the editor. While not directly related to outline highlighting, you may want to highlight the current section in the editor as an alternative or complement to outline synchronization.

## Use Cases for Your Extension

Since DocumentSymbolProvider doesn't support outline highlighting, you can:
1. **Highlight current section in the editor** (using decorations)
2. Show current section in status bar
3. Use breadcrumbs (automatically sync with cursor)

This document focuses on option 1: editor decorations.

---

## Core Workflow

### 1. Create Decoration Type

Define the visual style once:

```typescript
const currentSectionDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
  borderWidth: '0 0 0 3px',
  borderStyle: 'solid',
  borderColor: new vscode.ThemeColor('editorInfo.foreground'),
  isWholeLine: true
});
```

### 2. Apply Decorations to Ranges

Apply the style to specific lines/ranges:

```typescript
const editor = vscode.window.activeTextEditor;
if (editor) {
  const ranges = [new vscode.Range(5, 0, 10, 0)]; // Lines 5-10
  editor.setDecorations(currentSectionDecoration, ranges);
}
```

### 3. Clean Up

Dispose when done:

```typescript
currentSectionDecoration.dispose();
```

---

## TextEditorDecorationType

### Creating Decoration Types

```typescript
window.createTextEditorDecorationType(
  options: DecorationRenderOptions
): TextEditorDecorationType
```

**Returns:** A decoration type that can be applied to multiple editors and ranges.

**Important:** Decoration types are global and expensive to create. Create once and reuse!

```typescript
// ❌ Bad - creates new decoration every time
function highlightSection() {
  const decoration = vscode.window.createTextEditorDecorationType({...});
  editor.setDecorations(decoration, ranges);
}

// ✅ Good - create once, reuse
const decoration = vscode.window.createTextEditorDecorationType({...});

function highlightSection() {
  editor.setDecorations(decoration, ranges);
}
```

---

## DecorationRenderOptions

Defines the visual appearance of decorations.

### Common Properties

| Property | Type | Description |
|----------|------|-------------|
| `backgroundColor` | `string | ThemeColor` | Background color |
| `color` | `string | ThemeColor` | Text color |
| `border` | `string` | CSS border shorthand |
| `borderColor` | `string | ThemeColor` | Border color |
| `borderStyle` | `string` | Border style (solid, dashed, etc.) |
| `borderWidth` | `string` | Border width (CSS format) |
| `outline` | `string` | CSS outline shorthand |
| `outlineColor` | `string | ThemeColor` | Outline color |
| `outlineStyle` | `string` | Outline style |
| `outlineWidth` | `string` | Outline width |
| `textDecoration` | `string` | underline, line-through, etc. |
| `fontStyle` | `string` | normal, italic, oblique |
| `fontWeight` | `string` | normal, bold, 100-900 |
| `opacity` | `string` | Transparency (0.0-1.0) |
| `cursor` | `string` | Mouse cursor style |
| `isWholeLine` | `boolean` | Apply to entire line (ignoring char positions) |

### Gutter/Margin Decorations

| Property | Type | Description |
|----------|------|-------------|
| `gutterIconPath` | `string | Uri` | Icon in left gutter |
| `gutterIconSize` | `string` | Icon size (auto, contain, cover, or CSS) |
| `overviewRulerColor` | `string | ThemeColor` | Color in scrollbar overview ruler |
| `overviewRulerLane` | `OverviewRulerLane` | Position in overview ruler |

### Before/After Text

| Property | Type | Description |
|----------|------|-------------|
| `before` | `ThemableDecorationAttachmentRenderOptions` | Insert content before |
| `after` | `ThemableDecorationAttachmentRenderOptions` | Insert content after |

---

## ThemeColor Class

Use theme colors to respect user's color scheme:

```typescript
new vscode.ThemeColor('editor.selectionBackground')
```

### Useful Theme Colors

| Theme Color | Description |
|-------------|-------------|
| `editor.selectionBackground` | Selected text background |
| `editor.selectionHighlightBackground` | Matching selection background |
| `editor.lineHighlightBackground` | Current line highlight |
| `editor.wordHighlightBackground` | Word occurrence highlight |
| `editorInfo.foreground` | Info squiggle color |
| `editorWarning.foreground` | Warning squiggle color |
| `editorError.foreground` | Error squiggle color |
| `editorLineNumber.activeForeground` | Active line number |
| `list.activeSelectionBackground` | List selection (for outline-like feel) |
| `list.inactiveSelectionBackground` | List unfocused selection |

**Use theme colors instead of hardcoded colors** for better light/dark theme support!

```typescript
// ❌ Bad - doesn't adapt to theme
backgroundColor: '#3399ff'

// ✅ Good - adapts to theme
backgroundColor: new vscode.ThemeColor('editor.selectionBackground')
```

---

## Applying Decorations

### TextEditor.setDecorations()

```typescript
editor.setDecorations(
  decorationType: TextEditorDecorationType,
  rangesOrOptions: Range[] | DecorationOptions[]
): void
```

**Parameters:**
- `decorationType`: The style to apply (from `createTextEditorDecorationType()`)
- `rangesOrOptions`: Where to apply it

**Examples:**

```typescript
// Simple ranges
const ranges = [
  new vscode.Range(0, 0, 5, 0),  // Lines 0-5
  new vscode.Range(10, 5, 10, 15) // Line 10, chars 5-15
];
editor.setDecorations(decoration, ranges);

// Clear decorations
editor.setDecorations(decoration, []); // Empty array clears

// With options (hover messages, custom rendering per range)
const options: vscode.DecorationOptions[] = [
  {
    range: new vscode.Range(0, 0, 5, 0),
    hoverMessage: 'This is the current section'
  }
];
editor.setDecorations(decoration, options);
```

---

## DecorationOptions

For per-range customization:

```typescript
interface DecorationOptions {
  range: Range;
  hoverMessage?: string | MarkdownString | string[] | MarkdownString[];
  renderOptions?: DecorationInstanceRenderOptions;
}
```

**Example with hover:**
```typescript
const options: vscode.DecorationOptions[] = [
  {
    range: new vscode.Range(5, 0, 10, 0),
    hoverMessage: new vscode.MarkdownString('**Current Section:** Main Function')
  }
];
```

---

## Practical Examples for Your Extension

### Example 1: Highlight Current Section Header

Highlight just the section header line:

```typescript
let currentSectionDecoration: vscode.TextEditorDecorationType | undefined;

function highlightCurrentSection(section: SectionMatch, document: vscode.TextDocument) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== document) {
    return;
  }

  // Create decoration type if not exists
  if (!currentSectionDecoration) {
    currentSectionDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
      borderWidth: '0 0 0 4px',
      borderStyle: 'solid',
      borderColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Left
    });
  }

  // Get the range of the section header line
  const startPos = document.positionAt(section.index);
  const endPos = document.positionAt(section.index + section.fullText.length);
  const range = new vscode.Range(startPos, endPos);

  // Apply decoration with hover message
  const options: vscode.DecorationOptions[] = [{
    range: range,
    hoverMessage: `📍 Current Section: **${section.name}**`
  }];

  editor.setDecorations(currentSectionDecoration, options);
}
```

### Example 2: Highlight Entire Section Block

Highlight from header to next section:

```typescript
function highlightSectionBlock(
  section: SectionMatch,
  allSections: SectionMatch[],
  document: vscode.TextDocument
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== document) {
    return;
  }

  // Create decoration type
  const blockDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
    isWholeLine: true
  });

  // Find next section at same or higher level
  const nextSection = allSections.find(s =>
    s.index > section.index && s.depth <= section.depth
  );

  // Calculate range
  const startPos = document.positionAt(section.index);
  const endPos = nextSection
    ? document.positionAt(nextSection.index)
    : document.positionAt(document.getText().length);

  const range = new vscode.Range(startPos, endPos);

  editor.setDecorations(blockDecoration, [range]);
}
```

### Example 3: Gutter Icon for Current Section

Add icon in the gutter:

```typescript
const gutterDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconPath: context.asAbsolutePath('resources/section-icon.svg'),
  gutterIconSize: 'contain',
  overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
  overviewRulerLane: vscode.OverviewRulerLane.Left
});

// Apply to section header line
const startPos = document.positionAt(section.index);
const range = new vscode.Range(startPos.line, 0, startPos.line, 0);
editor.setDecorations(gutterDecoration, [range]);
```

---

## Integration with Cursor Tracking

Complete example combining cursor tracking with decorations:

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Create decoration type once
  const currentSectionDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
    borderWidth: '0 0 0 3px',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('editorInfo.foreground')
  });

  // Track cursor changes
  const updateHighlight = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const cursorPos = editor.selection.active;
    const offset = editor.document.offsetAt(cursorPos);

    // Find current section
    const sections = findSections(
      editor.document.getText(),
      editor.document.languageId
    );

    const currentSection = sections.find(s => {
      const nextSection = sections.find(next =>
        next.index > s.index && next.depth <= s.depth
      );
      const endOffset = nextSection ? nextSection.index : editor.document.getText().length;
      return offset >= s.index && offset < endOffset;
    });

    if (currentSection) {
      // Highlight the section header
      const startPos = editor.document.positionAt(currentSection.index);
      const endPos = editor.document.positionAt(
        currentSection.index + currentSection.fullText.length
      );
      editor.setDecorations(currentSectionDecoration, [
        new vscode.Range(startPos, endPos)
      ]);
    } else {
      // Clear decoration
      editor.setDecorations(currentSectionDecoration, []);
    }
  };

  // Listen to cursor changes (with debounce)
  let timeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(updateHighlight, 150);
    })
  );

  // Listen to editor switches
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateHighlight)
  );

  // Initial highlight
  updateHighlight();

  // Clean up
  context.subscriptions.push(currentSectionDecoration);
}
```

---

## Performance Best Practices

### 1. Reuse Decoration Types

```typescript
// ✅ Good - create once
const decoration = vscode.window.createTextEditorDecorationType({...});

// ❌ Bad - creates new type every call
function highlight() {
  const decoration = vscode.window.createTextEditorDecorationType({...});
}
```

### 2. Debounce Frequent Updates

```typescript
let timeout: NodeJS.Timeout | undefined;
vscode.window.onDidChangeTextEditorSelection(() => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(updateDecorations, 150);
});
```

### 3. Clear Decorations When Not Needed

```typescript
// When editor switches away
vscode.window.onDidChangeActiveTextEditor((editor) => {
  if (!editor || editor.document.languageId !== 'javascript') {
    // Clear decorations from previous editor
    previousEditor?.setDecorations(decoration, []);
  }
});
```

### 4. Limit Number of Decoration Types

Each decoration type consumes resources. Aim for:
- 1-2 decoration types for your extension
- Reuse the same type with different ranges

---

## OverviewRulerLane Enum

Position in the scrollbar minimap:

```typescript
enum OverviewRulerLane {
  Left = 1,
  Center = 2,
  Right = 4,
  Full = 7
}
```

**Example:**
```typescript
const decoration = vscode.window.createTextEditorDecorationType({
  overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
  overviewRulerLane: vscode.OverviewRulerLane.Left
});
```

This shows colored marks in the scrollbar, making it easy to see where sections are.

---

## Alternatives to Decorations

### 1. Status Bar Item

Show current section in status bar:

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);

vscode.window.onDidChangeTextEditorSelection(() => {
  const section = getCurrentSection();
  if (section) {
    statusBarItem.text = `$(symbol-namespace) ${section.name}`;
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
});
```

### 2. Breadcrumbs

Breadcrumbs automatically sync with DocumentSymbolProvider! If your symbols are correctly set up, breadcrumbs should already show current section.

No code needed - it's automatic with DocumentSymbolProvider.

### 3. Hover Provider

Show section info on hover:

```typescript
vscode.languages.registerHoverProvider('*', {
  provideHover(document, position) {
    const section = getCurrentSection(position, document);
    if (section) {
      return new vscode.Hover(`**Section:** ${section.name}`);
    }
  }
});
```

---

## Summary: Recommendation for Your Extension

Since DocumentSymbolProvider can't highlight outline items, **recommended approach:**

1. **Keep DocumentSymbolProvider** for basic outline functionality
2. **Add editor decorations** to highlight current section header in editor
3. **Add status bar item** to show current section name
4. **Optionally: Add custom TreeView** (see [tree-view.md](tree-view.md)) for full outline control

**Why editor decorations are good:**
- User sees highlighting right in their code (where they're looking)
- Works with existing DocumentSymbolProvider
- Easy to implement
- Respects user's theme

**Why custom TreeView may be better:**
- More direct "outline highlighting" (what user expects)
- Can scroll outline to keep current section visible
- Better for complex hierarchies

**Best of both:** Implement both editor decorations AND custom TreeView!

---

## Related APIs

- See [window-events.md](window-events.md) for tracking cursor position
- See [tree-view.md](tree-view.md) for custom tree view approach
- See [document-symbols.md](document-symbols.md) for your current implementation
