# Issue #29: Editor � Outline Synchronization

## Feasibility:  YES

The codebase is well-structured with all necessary foundations in place.

## Difficulty: 🟡 MEDIUM

### Why Medium Difficulty?

**Easy aspects:**
- ✅ Section parsing already implemented and working
- ✅ Existing data structures support the feature
- ✅ Clear VS Code API patterns to follow
- ✅ No complex algorithms or state management needed

**Challenging aspects:**
- ⚠️ Multiple new VS Code APIs to learn (TreeView, decorations, events)
- ⚠️ Cursor position tracking and section boundary logic
- ⚠️ Coordinating between TreeView reveal and editor decorations
- ⚠️ Performance optimization (debouncing, caching) required
- ⚠️ Edge case handling (nested sections, multiple editors, etc.)

**Not Hard because:**
- ❌ No complex data transformations
- ❌ No async/await complexity beyond basic TreeView.reveal()
- ❌ No external dependencies needed
- ❌ No architectural changes to existing codebase

## Context

- Currently the extension supports outline � editor navigation (clicking a section scrolls to that code), but lacks editor � outline synchronization like VS Code's default outline view.
- Requested behavior: When navigating in the editor:
    - Highlight the current section in the outline view (darker background or similar visual indicator)
    - Auto-scroll the outline to keep the active section visible
    - Update highlighting as cursor moves between sections

## Current Implementation Analysis

**Existing Strengths:**
-  Section parsing logic in [findSections.ts](../../src/utils/findSections.ts)
-  DocumentSymbolProvider working in [documentSymbolProvider.ts](../../src/documentSymbolProvider.ts)
-  Character offset � Position conversion capability
-  Hierarchical section data structure (`SectionMatch` interface)

**Current Limitation:**
- L `DocumentSymbolProvider` API does NOT support programmatic highlighting of outline items
- L No `reveal()` method available on built-in Outline view
- L No event listeners for cursor position tracking

## Approach: Hybrid (Custom TreeView + Editor Decorations)

Add custom TreeView with full highlighting control alongside existing DocumentSymbolProvider.

### Why This Approach?
1. **Custom TreeView** provides `reveal()` method for outline highlighting/scrolling
2. **Editor Decorations** provide in-editor visual feedback
3. **Keep DocumentSymbolProvider** for users who prefer built-in Outline view
4. Users get both options - best of both worlds

---

## Implementation Plan

### Step 1: Update package.json (~5 min)

Add view contribution and command:

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "codeOrganizerOutline",
          "name": "Code Organizer",
          "when": "resourceLangId"
        }
      ]
    },
    "commands": [
      {
        "command": "codeOrganizer.goToSection",
        "title": "Go to Section"
      }
    ]
  }
}
```

---

### Step 2: Create src/treeDataProvider.ts (~30 min)

Implement custom TreeView data provider:

```typescript
import * as vscode from 'vscode';
import { SectionMatch, findSections } from './utils/findSections';

export class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly section: SectionMatch,
    private allSections: SectionMatch[],
    public readonly document: vscode.TextDocument
  ) {
    const hasChildren = allSections.some(s => s.parentName === section.uniqueId);
    super(
      section.name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = section.name;
    this.iconPath = new vscode.ThemeIcon(
      section.depth === 1 ? 'symbol-module' : 'symbol-method'
    );

    // Command to jump to section
    this.command = {
      command: 'codeOrganizer.goToSection',
      title: 'Go to Section',
      arguments: [section, document]
    };

    this.contextValue = 'sectionItem';
  }
}

export class CodeOrganizerTreeDataProvider implements vscode.TreeDataProvider<SectionTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SectionTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private sections: SectionMatch[] = [];
  private currentDocument?: vscode.TextDocument;

  refresh(document: vscode.TextDocument): void {
    this.currentDocument = document;
    this.sections = findSections(document.getText(), document.languageId);
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SectionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SectionTreeItem): SectionTreeItem[] {
    if (!this.currentDocument) {
      return [];
    }

    if (!element) {
      // Root level - return depth 1 sections
      return this.sections
        .filter(s => s.depth === 1)
        .map(s => new SectionTreeItem(s, this.sections, this.currentDocument!));
    } else {
      // Return children of this section
      return this.sections
        .filter(s => s.parentName === element.section.uniqueId)
        .map(s => new SectionTreeItem(s, this.sections, this.currentDocument!));
    }
  }

  getSections(): SectionMatch[] {
    return this.sections;
  }

  getCurrentDocument(): vscode.TextDocument | undefined {
    return this.currentDocument;
  }
}
```

---

### Step 3: Create src/decorations.ts (~15 min)

Add editor highlighting for current section:

```typescript
import * as vscode from 'vscode';
import { SectionMatch } from './utils/findSections';

let currentSectionDecoration: vscode.TextEditorDecorationType | undefined;

export function initializeDecorations(): vscode.TextEditorDecorationType {
  if (!currentSectionDecoration) {
    currentSectionDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      borderColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
      overviewRulerLane: vscode.OverviewRulerLane.Left
    });
  }
  return currentSectionDecoration;
}

export function updateSectionHighlight(
  section: SectionMatch | undefined,
  editor: vscode.TextEditor,
  decoration: vscode.TextEditorDecorationType
): void {
  if (!section) {
    editor.setDecorations(decoration, []);
    return;
  }

  const startPos = editor.document.positionAt(section.index);
  const endPos = editor.document.positionAt(section.index + section.fullText.length);
  const range = new vscode.Range(startPos, endPos);

  const options: vscode.DecorationOptions[] = [{
    range: range,
    hoverMessage: `=� Current Section: **${section.name}**`
  }];

  editor.setDecorations(decoration, options);
}

export function disposeDecorations(): void {
  currentSectionDecoration?.dispose();
  currentSectionDecoration = undefined;
}
```

---

### Step 4: Update src/extension.ts (~30 min)

Add TreeView registration and cursor tracking:

```typescript
import * as vscode from 'vscode';
import { CodeOrganizerDocumentSymbolProvider } from './documentSymbolProvider';
import { CodeOrganizerTreeDataProvider, SectionTreeItem } from './treeDataProvider';
import { initializeDecorations, updateSectionHighlight, disposeDecorations } from './decorations';
import { SectionMatch, findSections } from './utils/findSections';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('Code Organizer extension activated!');

  const config = vscode.workspace.getConfiguration('codeOrganizer');
  const isEnabled = config.get<boolean>('enable', true);
  const supportedLanguages = config.get<string[]>('supportedLanguages', ['*']);

  if (!isEnabled) {
    return;
  }

  // Register existing DocumentSymbolProvider (keep for built-in Outline)
  const symbolProvider = new CodeOrganizerDocumentSymbolProvider();

  if (supportedLanguages.includes('*')) {
    context.subscriptions.push(
      vscode.languages.registerDocumentSymbolProvider('*', symbolProvider)
    );
  } else {
    supportedLanguages.forEach(language => {
      context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider({ language: language }, symbolProvider)
      );
    });
  }

  // NEW: Create custom TreeView for enhanced outline with highlighting
  const treeDataProvider = new CodeOrganizerTreeDataProvider();
  const treeView = vscode.window.createTreeView('codeOrganizerOutline', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  // NEW: Initialize editor decorations
  const decoration = initializeDecorations();
  context.subscriptions.push(decoration);

  // NEW: Register "Go to Section" command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codeOrganizer.goToSection',
      (section: SectionMatch, document: vscode.TextDocument) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
          const position = document.positionAt(section.index);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        }
      }
    )
  );

  // NEW: Function to find current section from cursor position
  function getCurrentSection(
    cursorPos: vscode.Position,
    document: vscode.TextDocument,
    sections: SectionMatch[]
  ): SectionMatch | undefined {
    const offset = document.offsetAt(cursorPos);
    let deepestSection: SectionMatch | undefined;

    for (const section of sections) {
      const sectionStart = section.index;
      // Find next section at same or higher level to determine end
      const nextSection = sections.find(
        s => s.index > section.index && s.depth <= section.depth
      );
      const sectionEnd = nextSection ? nextSection.index : document.getText().length;

      if (offset >= sectionStart && offset < sectionEnd) {
        if (!deepestSection || section.depth > deepestSection.depth) {
          deepestSection = section;
        }
      }
    }

    return deepestSection;
  }

  // NEW: Update highlight function
  let updateTimeout: NodeJS.Timeout | undefined;
  let lastDocument: vscode.TextDocument | undefined;

  async function updateHighlight() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;

    // Refresh tree if document changed
    if (document !== lastDocument) {
      treeDataProvider.refresh(document);
      lastDocument = document;
    }

    const cursorPos = editor.selection.active;
    const sections = treeDataProvider.getSections();
    const currentSection = getCurrentSection(cursorPos, document, sections);

    // Update editor decoration
    updateSectionHighlight(currentSection, editor, decoration);

    // Update tree view highlight
    if (currentSection) {
      const item = new SectionTreeItem(currentSection, sections, document);
      try {
        await treeView.reveal(item, {
          select: true,
          focus: false,
          expand: 1
        });
      } catch (error) {
        // Silently fail if reveal doesn't work (item might not be in tree yet)
      }
    }
  }

  // NEW: Listen for cursor changes (with debouncing)
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(updateHighlight, 150);
    })
  );

  // NEW: Listen for editor switches
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateHighlight();
    })
  );

  // NEW: Clear cache on document changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === lastDocument) {
        lastDocument = undefined;
      }
    })
  );

  // Initial highlight
  if (vscode.window.activeTextEditor) {
    updateHighlight();
  }
}

export function deactivate() {
  disposeDecorations();
}
```

---

### Step 5: Performance Optimizations (~10 min)

Already included in Step 4:
-  Debouncing cursor events (150ms)
-  Caching parsed sections per document
-  Clearing cache on document changes
-  Early return if no active editor
-  Silent error handling for reveal()

---

## Files to Create/Modify

### Create:
- **src/treeDataProvider.ts** - Custom TreeView implementation
- **src/decorations.ts** - Editor highlighting logic

### Modify:
- **src/extension.ts** - Add TreeView registration and cursor tracking
- **package.json** - Add view and command contributions

---

## Testing Checklist

### Functional Tests
- [ ] Cursor movement highlights correct section in tree view
- [ ] Cursor movement highlights correct section in editor
- [ ] Tree view auto-scrolls to keep current section visible
- [ ] Works with nested sections (depth 1-4)
- [ ] Clicking tree items jumps to correct location
- [ ] Handles multiple open editors correctly
- [ ] Updates when switching between editors
- [ ] Works when cursor is outside any section

### Language Support Tests
- [ ] JavaScript/TypeScript (`//` comments)
- [ ] Python/Ruby/Shell (`#` comments)
- [ ] SQL (`--` comments)
- [ ] JSX/TSX (`{/* */}` comments)
- [ ] Markdown (`#` headers)
- [ ] Quarto/RMarkdown (`.qmd`, `.rmd`)

### Edge Cases
- [ ] Empty files (no sections)
- [ ] Files with only one section
- [ ] Deeply nested sections (4 levels)
- [ ] Very large files (1000+ lines)
- [ ] Rapid cursor movement (performance)
- [ ] Document changes while cursor tracking

### Visual Tests
- [ ] Highlighting respects user theme (light/dark)
- [ ] Border color is visible but not distracting
- [ ] Hover message displays correctly
- [ ] Tree icons appropriate for section depth
- [ ] Overview ruler marks visible in scrollbar

---

## Configuration Options (Future Enhancement)

Consider adding these settings:

```json
{
  "codeOrganizer.highlightCurrentSection": {
    "type": "boolean",
    "default": true,
    "description": "Highlight current section in outline and editor"
  },
  "codeOrganizer.showEditorDecoration": {
    "type": "boolean",
    "default": true,
    "description": "Show current section decoration in editor"
  },
  "codeOrganizer.highlightDebounceMs": {
    "type": "number",
    "default": 150,
    "description": "Delay in milliseconds before updating highlight"
  }
}
```

---

## Estimated Time: 1-2 hours for complete implementation

## Related Documentation

- [window-events.md](../vs-code-api/window-events.md) - Cursor tracking APIs
- [tree-view.md](../vs-code-api/tree-view.md) - TreeView implementation details
- [document-symbols.md](../vs-code-api/document-symbols.md) - Current DocumentSymbolProvider
- [editor-decorations.md](../vs-code-api/editor-decorations.md) - Editor highlighting APIs
