# VS Code API: Window Events & Text Editor Selection

## Overview
This document covers the VS Code APIs needed for tracking cursor position and editor changes - essential for implementing editor → outline synchronization.

## Key APIs

### 1. `window.onDidChangeTextEditorSelection`

**Purpose:** Tracks when the cursor moves or selection changes in any editor.

**Signature:**
```typescript
onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>
```

**Usage Example:**
```typescript
vscode.window.onDidChangeTextEditorSelection((event) => {
  const cursorPosition = event.selections[0].active;
  console.log(`Cursor at line ${cursorPosition.line}, char ${cursorPosition.character}`);
});
```

**When it fires:**
- User moves cursor with keyboard/mouse
- Selection changes via drag or shift+arrow keys
- Programmatic selection changes via commands

---

### 2. `TextEditorSelectionChangeEvent`

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `textEditor` | `TextEditor` | The editor where selection changed |
| `selections` | `readonly Selection[]` | All current selections (array for multi-cursor) |
| `kind` | `TextEditorSelectionChangeKind?` | Reason: Keyboard, Mouse, or Command |

**Key insight:** `selections[0]` is the primary cursor/selection. Most users have single cursor.

---

### 3. `Selection` Class

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `active` | `Position` | **Current cursor position** (where cursor is now) |
| `anchor` | `Position` | Where selection started |
| `start` | `Position` | Min of anchor/active |
| `end` | `Position` | Max of anchor/active |
| `isEmpty` | `boolean` | True if no text selected (cursor only) |
| `isSingleLine` | `boolean` | True if selection on one line |

**For cursor tracking:** Use `selection.active` to get current cursor position.

---

### 4. `Position` Class

**Properties:**
- `line: number` - Zero-indexed line number (0 = first line)
- `character: number` - Zero-indexed character offset within the line

**Methods:**
- `isAfter(other: Position): boolean` - Compare positions
- `isBefore(other: Position): boolean`
- `isEqual(other: Position): boolean`
- `compareTo(other: Position): number` - Returns -1, 0, or 1

**Example:**
```typescript
const pos = new vscode.Position(5, 10); // Line 6, column 11 in editor UI
```

---

### 5. `window.activeTextEditor`

**Type:** `TextEditor | undefined`

**Purpose:** References the currently focused editor.

**Properties:**
- `document: TextDocument` - The file being edited
- `selection: Selection` - Primary selection
- `selections: Selection[]` - All selections (multi-cursor support)
- `visibleRanges: Range[]` - Currently visible portions of document

**Usage:**
```typescript
const editor = vscode.window.activeTextEditor;
if (editor) {
  const cursorPos = editor.selection.active;
  const currentLine = editor.document.lineAt(cursorPos.line);
}
```

---

### 6. `window.onDidChangeActiveTextEditor`

**Purpose:** Fires when user switches between open editors/tabs.

**Signature:**
```typescript
onDidChangeActiveTextEditor: Event<TextEditor | undefined>
```

**Usage:**
```typescript
vscode.window.onDidChangeActiveTextEditor((editor) => {
  if (editor) {
    console.log(`Switched to ${editor.document.fileName}`);
    // Update outline for new document
  }
});
```

**When it fires:**
- User clicks different tab
- User switches editor with keyboard shortcut
- All editors closed (editor will be `undefined`)

---

## Implementation Strategy for Editor → Outline Sync

### Step 1: Listen for cursor changes
```typescript
context.subscriptions.push(
  vscode.window.onDidChangeTextEditorSelection((event) => {
    const cursorPosition = event.selections[0].active;
    updateOutlineHighlight(cursorPosition);
  })
);
```

### Step 2: Listen for editor switches
```typescript
context.subscriptions.push(
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      const cursorPosition = editor.selection.active;
      updateOutlineHighlight(cursorPosition);
    }
  })
);
```

### Step 3: Find which section contains cursor
```typescript
function updateOutlineHighlight(cursorPosition: vscode.Position) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  // Convert Position to character offset
  const offset = editor.document.offsetAt(cursorPosition);

  // Find section that contains this offset
  const sections = findSections(editor.document.getText(), editor.document.languageId);
  const currentSection = sections.find(section =>
    section.index <= offset && offset < (section.index + section.fullText.length)
  );

  if (currentSection) {
    // Highlight this section in outline (see tree-view.md)
  }
}
```

---

## Converting Between Position and Offset

**Position → Character Offset:**
```typescript
const offset = document.offsetAt(position);
```

**Character Offset → Position:**
```typescript
const position = document.positionAt(offset);
```

**Why this matters:** Your `SectionMatch` interface uses `index: number` (character offset), but VS Code events use `Position` objects. You'll need to convert between them.

---

## Performance Considerations

1. **Debouncing:** Cursor change events fire very frequently. Consider debouncing:
```typescript
let timeout: NodeJS.Timeout | undefined;
vscode.window.onDidChangeTextEditorSelection((event) => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    updateOutlineHighlight(event.selections[0].active);
  }, 150); // Wait 150ms after last cursor move
});
```

2. **Only update on same document:** Check if the event is for the document your outline is showing:
```typescript
if (event.textEditor.document !== currentOutlineDocument) {
  return;
}
```

---

## Related APIs

- See [tree-view.md](tree-view.md) for highlighting items in the outline
- See [document-symbols.md](document-symbols.md) for retrieving section ranges
- See [editor-decorations.md](editor-decorations.md) for highlighting code in the editor
