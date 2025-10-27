# VS Code API: TreeView and TreeDataProvider

## Overview
This document covers the APIs for creating custom tree views in VS Code sidebars. **However, your extension currently uses the built-in Document Outline view, not a custom tree view.**

## Current Implementation Note

Your extension uses `vscode.languages.registerDocumentSymbolProvider()`, which automatically populates VS Code's built-in **Outline** view. This is simpler than a custom TreeView but has limitations:

**Limitations of DocumentSymbolProvider:**
- No programmatic control over highlighting/selection
- No `reveal()` method to scroll outline to specific items
- No access to selection events
- Cannot customize appearance beyond symbol icons

**To implement editor → outline sync, you may need to:**
1. Continue using DocumentSymbolProvider for basic outline functionality, OR
2. Create a custom TreeView for full control over highlighting and scrolling

---

## Option 1: Custom TreeView Approach

### 1. Register TreeView in `package.json`

Add to your `contributes` section:

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "codeOrganizerOutline",
          "name": "Code Organizer Outline",
          "when": "resourceLangId"
        }
      ]
    }
  }
}
```

---

### 2. Create TreeView in `extension.ts`

```typescript
// Create tree data provider
const treeDataProvider = new CodeOrganizerTreeDataProvider();

// Create tree view
const treeView = vscode.window.createTreeView('codeOrganizerOutline', {
  treeDataProvider: treeDataProvider,
  showCollapseAll: true
});

context.subscriptions.push(treeView);
```

---

### 3. Implement `TreeDataProvider`

```typescript
export class CodeOrganizerTreeDataProvider implements vscode.TreeDataProvider<SectionItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<SectionItem | undefined | null> =
    new vscode.EventEmitter<SectionItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<SectionItem | undefined | null> =
    this._onDidChangeTreeData.event;

  private sections: SectionMatch[] = [];

  // Call this to refresh the tree
  refresh(sections: SectionMatch[]): void {
    this.sections = sections;
    this._onDidChangeTreeData.fire(undefined); // Refresh entire tree
  }

  getTreeItem(element: SectionItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SectionItem): SectionItem[] {
    if (!element) {
      // Root level - return depth 1 sections
      return this.sections
        .filter(s => s.depth === 1)
        .map(s => new SectionItem(s, this.sections));
    } else {
      // Return children of this section
      return this.sections
        .filter(s => s.parentName === element.section.uniqueId)
        .map(s => new SectionItem(s, this.sections));
    }
  }
}
```

---

### 4. Create `TreeItem` Wrapper Class

```typescript
export class SectionItem extends vscode.TreeItem {

  constructor(
    public readonly section: SectionMatch,
    private allSections: SectionMatch[]
  ) {
    super(
      section.name,
      // Determine if item has children
      allSections.some(s => s.parentName === section.uniqueId)
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    // Set tooltip
    this.tooltip = section.name;

    // Set icon based on depth
    this.iconPath = new vscode.ThemeIcon(
      section.depth === 1 ? 'symbol-file' : 'symbol-method'
    );

    // Set command to run when clicked
    this.command = {
      command: 'codeOrganizer.goToSection',
      title: 'Go to Section',
      arguments: [section]
    };
  }

  // Context value for when-clauses
  contextValue = 'sectionItem';
}
```

---

### 5. **Key Method: `TreeView.reveal()`**

This is the method you'll use to scroll and highlight items in the outline:

```typescript
treeView.reveal(item, {
  select: true,    // Highlight the item
  focus: false,    // Don't steal focus from editor
  expand: true     // Expand parent items if needed
});
```

**Full example for editor → outline sync:**

```typescript
async function highlightSectionInOutline(section: SectionMatch) {
  // Find the TreeItem corresponding to this section
  const item = new SectionItem(section, allSections);

  // Scroll to it and highlight it
  await treeView.reveal(item, {
    select: true,   // This highlights it!
    focus: false,   // Don't steal focus from editor
    expand: 1       // Expand one level if collapsed
  });
}
```

---

## TreeView API Reference

### `window.createTreeView<T>(viewId, options)`

**Parameters:**
- `viewId: string` - Must match ID in `package.json`
- `options: TreeViewOptions<T>`:
  - `treeDataProvider: TreeDataProvider<T>` - Your provider implementation
  - `showCollapseAll?: boolean` - Show collapse all button
  - `canSelectMany?: boolean` - Enable multi-selection

**Returns:** `TreeView<T>`

---

### `TreeView<T>` Interface

**Methods:**

| Method | Description |
|--------|-------------|
| `reveal(element: T, options?)` | **Scroll to and highlight item** |
| `dispose()` | Clean up resources |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `selection` | `readonly T[]` | Currently selected items |
| `visible` | `boolean` | Whether view is visible |
| `onDidChangeSelection` | `Event<TreeViewSelectionChangeEvent<T>>` | Fires when selection changes |
| `onDidChangeVisibility` | `Event<TreeViewVisibilityChangeEvent>` | Fires when visibility changes |
| `onDidExpandElement` | `Event<TreeViewExpansionEvent<T>>` | Fires when item expands |
| `onDidCollapseElement` | `Event<TreeViewExpansionEvent<T>>` | Fires when item collapses |
| `title?` | `string` | View title |
| `message?` | `string` | Message shown when empty |

---

### `TreeDataProvider<T>` Interface

**Required Methods:**

```typescript
interface TreeDataProvider<T> {
  // Return the visual representation of an element
  getTreeItem(element: T): TreeItem | Thenable<TreeItem>;

  // Return children of an element (or root items if element is undefined)
  getChildren(element?: T): ProviderResult<T[]>;

  // Optional: return parent of an element (for reveal() to work)
  getParent?(element: T): ProviderResult<T>;
}
```

**Optional Property:**

```typescript
// Event emitter to trigger tree refresh
onDidChangeTreeData?: Event<T | undefined | null | void>;
```

**Refresh pattern:**

```typescript
private _onDidChangeTreeData = new vscode.EventEmitter<T | undefined>();
readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

refresh(): void {
  this._onDidChangeTreeData.fire(undefined); // Refresh entire tree
}

refreshItem(item: T): void {
  this._onDidChangeTreeData.fire(item); // Refresh single item
}
```

---

### `TreeItem` Class

**Constructor:**
```typescript
new TreeItem(label: string, collapsibleState?: TreeItemCollapsibleState)
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string | TreeItemLabel` | Display text |
| `description` | `string` | Right-side text |
| `tooltip` | `string | MarkdownString` | Hover text |
| `iconPath` | `string | Uri | ThemeIcon` | Icon to display |
| `command` | `Command` | Command to run on click |
| `contextValue` | `string` | For `when` clauses in package.json |
| `collapsibleState` | `TreeItemCollapsibleState` | None, Collapsed, or Expanded |
| `resourceUri` | `Uri` | Associated file (for default icons) |

---

### `TreeItemCollapsibleState` Enum

```typescript
enum TreeItemCollapsibleState {
  None = 0,       // No children, can't expand
  Collapsed = 1,  // Has children, currently collapsed
  Expanded = 2    // Has children, currently expanded
}
```

---

## Option 2: Keep Using DocumentSymbolProvider

**Advantages:**
- Simpler implementation
- Appears in built-in Outline view (familiar to users)
- Automatic symbol hierarchy

**Disadvantages:**
- **Cannot programmatically highlight items** (no `reveal()` method)
- Cannot customize appearance
- No control over selection

**Workaround for highlighting:**
Instead of highlighting outline items, you could:
1. Add editor decorations to highlight the current section in the editor itself
2. Show current section name in status bar
3. Use breadcrumbs (they automatically sync with cursor position)

---

## Recommendation for Your Use Case

**For editor → outline sync, you have two paths:**

### Path A: Hybrid Approach (Recommended)
1. Keep `DocumentSymbolProvider` for built-in Outline view
2. Add a **custom TreeView** in the explorer sidebar for your enhanced outline
3. The custom TreeView can highlight and auto-scroll based on cursor position
4. Users get both: standard outline + enhanced outline with sync

### Path B: TreeView Only
1. Remove `DocumentSymbolProvider`
2. Replace entirely with custom TreeView
3. More control but lose integration with built-in Outline view

**Suggested implementation:** Path A - add custom TreeView alongside existing DocumentSymbolProvider.

---

## Example: Complete TreeView with Highlighting

```typescript
// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new CodeOrganizerTreeDataProvider();
  const treeView = vscode.window.createTreeView('codeOrganizerOutline', {
    treeDataProvider: treeDataProvider
  });

  // Listen for cursor changes
  vscode.window.onDidChangeTextEditorSelection(async (event) => {
    const cursorPos = event.selections[0].active;
    const offset = event.textEditor.document.offsetAt(cursorPos);

    // Find current section
    const sections = findSections(
      event.textEditor.document.getText(),
      event.textEditor.document.languageId
    );
    const currentSection = sections.find(s =>
      s.index <= offset && offset < (s.index + s.fullText.length)
    );

    if (currentSection) {
      // Highlight in tree
      const item = new SectionItem(currentSection, sections);
      await treeView.reveal(item, { select: true, focus: false });
    }
  });

  context.subscriptions.push(treeView);
}
```

---

## Related APIs

- See [window-events.md](window-events.md) for tracking cursor position
- See [document-symbols.md](document-symbols.md) for DocumentSymbolProvider approach
- See [editor-decorations.md](editor-decorations.md) for highlighting code in editor
