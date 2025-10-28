# VS Code API: ViewsContainers and Custom Activity Bar Views

## Overview

The `viewsContainers` contribution point allows extensions to create custom containers in VS Code's Activity Bar or Panel. This is how extensions like Todo Tree, GitLens, and others create their own dedicated tabs.

**Related to Issue #22:** This API enables creating a dedicated "Code Organizer" activity bar tab instead of sharing space in the Explorer.

---

## ViewsContainers Contribution Point

### Location in package.json

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "codeOrganizer",
          "title": "Code Organizer",
          "icon": "resources/code-organizer-icon.svg"
        }
      ]
    }
  }
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier for this container (used to reference in views) |
| `title` | `string` | ✅ | Display name shown in hover tooltip and view header |
| `icon` | `string` | ✅ | Path to icon file (relative to extension root) |

### Icon Guidelines

- **Size:** 24x24 pixels, centered in a 50x40 block
- **Format:** SVG preferred (scales better), but PNG/JPG also supported
- **Color:** Single color recommended (VS Code applies theme-based opacity)
- **States:**
  - 60% opacity when inactive
  - 100% opacity on hover or when active
  - Automatically inverted for light themes

**Example SVG icon:**
```xml
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="#C5C5C5" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
</svg>
```

---

## Container Locations

### Activity Bar (Left Sidebar)

```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "myContainer",
      "title": "My View",
      "icon": "resources/icon.svg"
    }
  ]
}
```

**Visual result:**
```
Activity Bar:
├─ 📁 EXPLORER
├─ 🔍 SEARCH
├─ 🗂️ MY VIEW      ← Your custom tab
├─ 🐛 DEBUG
└─ ⚙️ EXTENSIONS
```

**Pros:**
- Highly visible and accessible
- Dedicated space for your views
- Can contain multiple tree views
- Professional appearance

**Cons:**
- Takes up one of the limited activity bar slots
- Users may hide if they don't use it frequently
- More prominent commitment (should justify the space)

---

### Panel (Bottom Panel)

```json
"viewsContainers": {
  "panel": [
    {
      "id": "myPanel",
      "title": "My Panel",
      "icon": "resources/icon.svg"
    }
  ]
}
```

**Visual result:**
```
Bottom Panel:
├─ PROBLEMS
├─ OUTPUT
├─ MY PANEL      ← Your custom panel
└─ TERMINAL
```

**Use cases:**
- Tools that complement coding (output, logs, tests)
- Horizontal layout beneficial (wide data, tables)
- Less prominent than activity bar

---

## Registering Views in Your Container

Once you create a `viewsContainer`, you must register views inside it:

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "codeOrganizer",
          "title": "Code Organizer",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "codeOrganizer": [
        {
          "id": "codeOrganizerOutline",
          "name": "Outline"
        },
        {
          "id": "codeOrganizerStats",
          "name": "Statistics"
        }
      ]
    }
  }
}
```

**Result:** Clicking the Code Organizer icon in the activity bar shows a sidebar with two sections: "Outline" and "Statistics".

---

## Comparison: Explorer View vs Custom Activity Bar

### Option 1: View in Explorer (Current Approach)

**package.json:**
```json
"views": {
  "explorer": [
    {
      "id": "codeOrganizerOutline",
      "name": "Code Organizer"
    }
  ]
}
```

**Visual:**
```
EXPLORER
├─ OPEN EDITORS
├─ OUTLINE (built-in)
├─ CODE ORGANIZER      ← Your view
├─ TIMELINE
└─ NPM SCRIPTS
```

**Pros:**
- Familiar location (users expect outlines in Explorer)
- Minimal setup (no custom icon needed)
- Coexists with built-in Outline view
- Lower barrier to adoption

**Cons:**
- Shares space with other views (can get crowded)
- May be hidden if user collapses sections
- Less prominent

---

### Option 2: Custom Activity Bar Tab (Issue #22 Goal)

**package.json:**
```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "codeOrganizer",
      "title": "Code Organizer",
      "icon": "resources/icon.svg"
    }
  ]
},
"views": {
  "codeOrganizer": [
    {
      "id": "codeOrganizerOutline",
      "name": "Outline"
    }
  ]
}
```

**Visual:**
```
Activity Bar:
├─ 📁 EXPLORER
├─ 🔍 SEARCH
├─ 🗂️ CODE ORGANIZER   ← Your own tab
```

**Pros:**
- Dedicated, prominent location
- Won't conflict with built-in TypeScript/JS outlines
- Room to expand (add stats, settings, etc.)
- Professional appearance (like GitLens, Todo Tree)
- **Solves Issue #22:** No more competing with built-in outlines

**Cons:**
- Takes activity bar slot (limited real estate)
- Requires creating/maintaining an icon
- May be overkill if extension only has one view
- Users need to discover and enable it

---

## Complete Example: Todo Tree Pattern

Here's how Todo Tree creates its dedicated activity bar tab:

**package.json:**
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "todo-tree",
          "title": "TODOs",
          "icon": "resources/todo-tree.svg"
        }
      ]
    },
    "views": {
      "todo-tree": [
        {
          "id": "todo-tree-view",
          "name": "TODOs",
          "when": "todo-tree-has-todos"
        }
      ]
    }
  }
}
```

**extension.ts:**
```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Create tree data provider
  const treeDataProvider = new TodoTreeDataProvider();

  // Register tree view (matches "id" in package.json)
  const treeView = vscode.window.createTreeView('todo-tree-view', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true
  });

  context.subscriptions.push(treeView);
}
```

**Result:** Users see a "TODOs" icon in the activity bar. Clicking it opens a dedicated sidebar showing the todo tree.

---

## Implementation Checklist for Issue #22

To create a dedicated Code Organizer activity bar view:

### 1. Create Icon Asset

- [ ] Design 24x24 SVG icon
- [ ] Save as `resources/code-organizer-icon.svg`
- [ ] Test in both light and dark themes

**Suggested icon concepts:**
- Layered boxes/files (organization theme)
- Hierarchical tree structure
- Document with sections/dividers

---

### 2. Update package.json

- [ ] Add `viewsContainers` contribution
- [ ] Move `codeOrganizerOutline` view from `explorer` to your custom container
- [ ] Ensure `id` values match

**Before:**
```json
"views": {
  "explorer": [
    {
      "id": "codeOrganizerOutline",
      "name": "Code Organizer"
    }
  ]
}
```

**After:**
```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "codeOrganizer",
      "title": "Code Organizer",
      "icon": "resources/code-organizer-icon.svg"
    }
  ]
},
"views": {
  "codeOrganizer": [
    {
      "id": "codeOrganizerOutline",
      "name": "Outline"
    }
  ]
}
```

---

### 3. No Extension.ts Changes Needed

Your existing tree view registration should work as-is:
```typescript
const treeView = vscode.window.createTreeView('codeOrganizerOutline', {
  treeDataProvider: treeDataProvider
});
```

VS Code automatically places this view in your custom container based on the `package.json` configuration.

---

### 4. Test

- [ ] Reload extension
- [ ] Verify new icon appears in activity bar
- [ ] Click icon - sidebar should open with "Outline" section
- [ ] Test that all existing functionality works (cursor sync, navigation, etc.)
- [ ] Test in light and dark themes

---

## Configuration: Allow Users to Choose Location

You can let users decide where the view appears:

**package.json:**
```json
"configuration": {
  "properties": {
    "codeOrganizer.viewLocation": {
      "type": "string",
      "enum": ["activitybar", "explorer"],
      "default": "activitybar",
      "description": "Where to show the Code Organizer view"
    }
  }
}
```

**extension.ts:**
```typescript
const config = vscode.workspace.getConfiguration('codeOrganizer');
const viewLocation = config.get<string>('viewLocation', 'activitybar');

// Conditionally register view based on setting
// (Requires more complex setup with dynamic view registration)
```

**Note:** Dynamic view container switching is complex. Simpler approach: provide both locations and let users hide the one they don't want via VS Code's view settings.

---

## Alternative: Provide Both Options

**Recommended approach for maximum flexibility:**

1. Register dedicated activity bar view (for users who want prominence)
2. Keep built-in DocumentSymbolProvider (for users who prefer standard Outline)
3. Users can hide whichever they don't use via VS Code's view menu

**package.json:**
```json
{
  "viewsContainers": {
    "activitybar": [
      {
        "id": "codeOrganizer",
        "title": "Code Organizer",
        "icon": "resources/icon.svg"
      }
    ]
  },
  "views": {
    "codeOrganizer": [
      {
        "id": "codeOrganizerOutline",
        "name": "Sections"
      }
    ]
  }
}
```

**extension.ts:**
```typescript
// Register custom tree view (dedicated activity bar)
const treeView = vscode.window.createTreeView('codeOrganizerOutline', {
  treeDataProvider: treeDataProvider
});

// ALSO register DocumentSymbolProvider (built-in Outline)
vscode.languages.registerDocumentSymbolProvider('*', symbolProvider);
```

**Result:** Users get both options. They can:
- Use the dedicated Code Organizer tab (with highlighting/sync)
- Use the built-in Outline view (standard location)
- Hide whichever they don't want

---

## Related Documentation

- [tree-view.md](tree-view.md) - How to implement TreeView and TreeDataProvider
- [document-symbols.md](document-symbols.md) - Built-in Outline view approach
- [window-events.md](window-events.md) - Cursor tracking for view synchronization

---

## Real-World Examples

Extensions using custom activity bar views:

| Extension | Container ID | Purpose |
|-----------|--------------|---------|
| **GitLens** | `gitlens` | Git features, history, blame |
| **Todo Tree** | `todo-tree` | TODO comments across workspace |
| **Bookmarks** | `bookmarks` | Code bookmarks navigation |
| **Better Comments** | N/A | Uses explorer view |
| **Peacock** | N/A | Uses settings only |

**Key insight:** Extensions with rich, hierarchical data (like your section outlines) benefit from dedicated activity bar views. Extensions with simple functionality can stay in explorer or settings.

---

## Summary

**For Issue #22**, creating a custom activity bar view:

✅ **Solves the problem:** No more competing with TypeScript/built-in outlines
✅ **Provides prominence:** Dedicated, easily accessible location
✅ **Allows growth:** Room for future features (stats, settings, etc.)
✅ **Professional appearance:** Matches popular extensions like GitLens, Todo Tree

**Trade-off:** Takes an activity bar slot (but users can hide if they don't use it)

**Recommendation:** Implement custom activity bar view AND keep DocumentSymbolProvider for maximum flexibility.
