# VS Code API: DocumentSymbolProvider

## Overview
This document covers the `DocumentSymbolProvider` API, which your extension **currently uses** to populate VS Code's built-in Outline view.

## Current Implementation

Your extension in [documentSymbolProvider.ts](../src/documentSymbolProvider.ts) already implements this API:

```typescript
export class CodeOrganizerDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[]
}
```

Registered in [extension.ts](../src/extension.ts):
```typescript
vscode.languages.registerDocumentSymbolProvider('*', provider);
```

---

## DocumentSymbolProvider Interface

### Required Method

```typescript
provideDocumentSymbols(
  document: TextDocument,
  token: CancellationToken
): ProviderResult<DocumentSymbol[] | SymbolInformation[]>
```

**Parameters:**
- `document: TextDocument` - The document to analyze
- `token: CancellationToken` - Cancellation token for long operations

**Returns:**
- Array of `DocumentSymbol` (hierarchical, preferred) OR
- Array of `SymbolInformation` (flat list, legacy)

**When it's called:**
- When document is opened
- When document content changes (after debounce)
- When Outline view is opened
- When breadcrumbs need updating

---

## DocumentSymbol Class

Represents a symbol in a document with hierarchical children.

### Constructor

```typescript
new DocumentSymbol(
  name: string,
  detail: string,
  kind: SymbolKind,
  range: Range,
  selectionRange: Range
)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name in outline |
| `detail` | `string` | Extra info (type signature, etc.) |
| `kind` | `SymbolKind` | Icon/category (File, Function, etc.) |
| `range` | `Range` | **Full extent** of the symbol (entire block) |
| `selectionRange` | `Range` | **Name range** (where to jump when clicked) |
| `children` | `DocumentSymbol[]` | Nested symbols |
| `tags?` | `SymbolTag[]` | Deprecated tag, etc. |

### Range vs SelectionRange

**Important distinction:**

- `range`: The entire span of the symbol (e.g., entire function including body)
- `selectionRange`: Just the symbol's name/header (where cursor goes on click)

**Example:**
```typescript
// For this code section:
// ## Main Section ----
//   code here
//   more code

const range = new vscode.Range(
  document.positionAt(0),    // Start of "## Main Section ----"
  document.positionAt(50)    // End of section content
);

const selectionRange = new vscode.Range(
  document.positionAt(0),    // Start of "## Main Section ----"
  document.positionAt(20)    // End of header line
);
```

**In your current implementation:**
You use the same range for both:
```typescript
const range = new vscode.Range(
  document.positionAt(match.index),
  document.positionAt(match.index + match.fullText.length)
);
const symbol = new vscode.DocumentSymbol(
  sectionName, '',
  vscode.SymbolKind.File,
  range,  // Full range
  range   // Selection range (same)
);
```

**This works fine!** But you could improve it by:
- `selectionRange`: Just the section header line
- `range`: From header to start of next section

---

## SymbolKind Enum

Determines the icon shown in the outline:

| Value | Use Case | Icon |
|-------|----------|------|
| `File` | Top-level sections | 📄 |
| `Module` | Modules/namespaces | 📦 |
| `Namespace` | Namespaces | 📦 |
| `Package` | Packages | 📦 |
| `Class` | Classes | 🔷 |
| `Method` | Methods/functions | Ⓜ️ |
| `Property` | Properties | 🔹 |
| `Field` | Fields | 🔹 |
| `Constructor` | Constructors | 🔧 |
| `Enum` | Enumerations | 🔢 |
| `Interface` | Interfaces | 🔷 |
| `Function` | Functions | ƒ |
| `Variable` | Variables | 📊 |
| `Constant` | Constants | 📊 |
| `String` | Strings | " " |
| `Number` | Numbers | # |
| `Boolean` | Booleans | ✓ |
| `Array` | Arrays | [] |
| `Object` | Objects | {} |
| `Key` | Keys | 🔑 |
| `Null` | Null | ∅ |
| `Struct` | Structs | 📐 |
| `Event` | Events | ⚡ |
| `Operator` | Operators | + |
| `TypeParameter` | Type parameters | <T> |

**Your current usage:**
- Depth 1: `SymbolKind.File`
- Nested: `SymbolKind.Module`

**Suggestions:**
- Depth 1: `SymbolKind.Module` (better for top-level sections)
- Depth 2: `SymbolKind.Class`
- Depth 3: `SymbolKind.Method`
- Depth 4: `SymbolKind.Property`

---

## Range and Position Classes

### Position

Represents a line/character location:

```typescript
class Position {
  line: number;       // Zero-based line number
  character: number;  // Zero-based character offset in line

  isAfter(other: Position): boolean;
  isBefore(other: Position): boolean;
  isEqual(other: Position): boolean;
  compareTo(other: Position): number;
}
```

### Range

Represents a span between two positions:

```typescript
class Range {
  start: Position;
  end: Position;

  isEmpty: boolean;         // start === end
  isSingleLine: boolean;    // start.line === end.line

  contains(positionOrRange): boolean;
  intersection(range): Range | undefined;
  union(other: Range): Range;
  with(start?, end?): Range;
}
```

### Converting Between Position and Offset

**Your `SectionMatch` uses character offset (`index: number`):**
```typescript
interface SectionMatch {
  index: number;  // Character offset in document
  // ...
}
```

**VS Code APIs use `Position` (line/character):**
```typescript
// Offset → Position
const position = document.positionAt(offset);

// Position → Offset
const offset = document.offsetAt(position);
```

**Example:**
```typescript
// Your current code:
const range = new vscode.Range(
  document.positionAt(match.index),
  document.positionAt(match.index + match.fullText.length)
);
```

---

## Retrieving Symbols from Document

To get the symbols for the current document:

```typescript
// Method 1: Execute command (returns all providers' symbols)
const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
  'vscode.executeDocumentSymbolProvider',
  document.uri
);

// Method 2: Keep reference to your sections
// Store sections when provideDocumentSymbols is called
private lastSections: SectionMatch[] = [];

public provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  const text = document.getText();
  this.lastSections = findSections(text, document.languageId);
  // ... build symbols
}
```

---

## Limitations for Editor → Outline Sync

**DocumentSymbolProvider cannot:**
- ❌ Highlight/select items in the Outline view programmatically
- ❌ Scroll outline to specific items
- ❌ Listen to outline selection events
- ❌ Customize outline item appearance beyond icons
- ❌ Control outline visibility

**DocumentSymbolProvider CAN:**
- ✅ Define section structure and hierarchy
- ✅ Set click behavior via `selectionRange`
- ✅ Update automatically when document changes
- ✅ Integrate with breadcrumbs and Go to Symbol

**For full editor → outline sync, you need:**
1. Keep DocumentSymbolProvider for basic outline
2. Add custom TreeView with `reveal()` support (see [tree-view.md](tree-view.md))
3. Or use alternative highlighting (editor decorations, status bar)

---

## Best Practices

### 1. Cache parsed sections

```typescript
private sectionCache = new Map<string, SectionMatch[]>();

public provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  const key = document.uri.toString();

  // Check cache
  if (this.sectionCache.has(key)) {
    return this.buildSymbols(this.sectionCache.get(key)!, document);
  }

  // Parse and cache
  const sections = findSections(document.getText(), document.languageId);
  this.sectionCache.set(key, sections);
  return this.buildSymbols(sections, document);
}

// Clear cache on document changes
vscode.workspace.onDidChangeTextDocument((event) => {
  this.sectionCache.delete(event.document.uri.toString());
});
```

### 2. Use cancellation tokens

```typescript
public provideDocumentSymbols(
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.DocumentSymbol[] {

  if (token.isCancellationRequested) {
    return [];
  }

  const sections = findSections(document.getText(), document.languageId);

  if (token.isCancellationRequested) {
    return [];
  }

  return this.buildSymbols(sections, document);
}
```

### 3. Optimize range calculations

Instead of recalculating every time:
```typescript
// Store ranges in SectionMatch
export interface SectionMatch {
  name: string;
  index: number;
  fullText: string;
  depth: number;
  parentName?: string;
  uniqueId: string;
  range?: vscode.Range;          // Cache the range
  selectionRange?: vscode.Range; // Cache selection range
}
```

---

## Integration with Your Current Code

### Current flow:
1. `extension.ts` registers `CodeOrganizerDocumentSymbolProvider`
2. VS Code calls `provideDocumentSymbols()` when needed
3. Your provider calls `findSections()` from [findSections.ts](../src/utils/findSections.ts)
4. Provider builds `DocumentSymbol[]` hierarchy
5. Symbols appear in Outline view

### For editor → outline sync, add:
1. Listen to `window.onDidChangeTextEditorSelection` (see [window-events.md](window-events.md))
2. Get cursor position → convert to offset
3. Find which `SectionMatch` contains that offset
4. **Problem:** Cannot highlight that section in Outline view
5. **Solution:** Create custom TreeView (see [tree-view.md](tree-view.md)) OR use editor decorations (see [editor-decorations.md](editor-decorations.md))

---

## Example: Finding Current Section

```typescript
function getCurrentSection(
  cursorPosition: vscode.Position,
  document: vscode.TextDocument
): SectionMatch | undefined {

  // Convert position to offset
  const offset = document.offsetAt(cursorPosition);

  // Get all sections
  const sections = findSections(document.getText(), document.languageId);

  // Find section containing cursor
  let currentSection: SectionMatch | undefined;

  for (const section of sections) {
    const sectionStart = section.index;
    const sectionEnd = section.index + section.fullText.length;

    if (offset >= sectionStart && offset < sectionEnd) {
      // Found a match, but keep looking for deeper nested section
      if (!currentSection || section.depth > currentSection.depth) {
        currentSection = section;
      }
    }
  }

  return currentSection;
}
```

**Challenge:** Sections don't have explicit end positions. You need to either:
1. Assume section ends at next section of same/lower depth
2. Assume section extends to next section start
3. Add section end position to `SectionMatch` interface

---

## Alternative: SymbolInformation (Legacy)

For flat symbol lists without hierarchy:

```typescript
interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  location: Location;
  containerName?: string;
  tags?: SymbolTag[];
}
```

**Don't use this** - `DocumentSymbol` is better for hierarchical outlines.

---

## Related APIs

- See [window-events.md](window-events.md) for tracking cursor position
- See [tree-view.md](tree-view.md) for custom tree view with highlighting
- See [editor-decorations.md](editor-decorations.md) for highlighting sections in editor
