# VS Code API: Focusing and Revealing Views

## Overview
This document covers how to programmatically open, focus, and reveal custom view containers and tree views in VS Code extensions.

---

## Auto-Generated View Commands

### Key Insight: VS Code Creates Commands Automatically ✨

When you register a TreeView or custom view, **VS Code automatically generates commands** for it. You don't need to define these in `package.json`!

### Auto-Generated Command Pattern

For a view with ID `"myViewId"`, VS Code automatically creates:

```
<viewId>.focus                                    // Focus the view
workbench.actions.treeView.<viewId>.refresh       // Refresh tree
workbench.actions.treeView.<viewId>.collapseAll   // Collapse all
workbench.view.extension.<containerId>            // Focus container
```

**Example:** If your view ID is `codeOrganizerOutlineActivity`:
- `codeOrganizerOutlineActivity.focus` - Opens and focuses your view
- `workbench.actions.treeView.codeOrganizerOutlineActivity.refresh` - Refreshes tree
- `workbench.view.extension.codeOrganizer` - Opens your container

---

## Focusing a View Programmatically

### Method 1: Use the Auto-Generated `.focus` Command ✅ **Recommended**

```typescript
// Focus your tree view (opens container if needed)
await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
```

**What this does:**
- ✅ Opens the activity bar container if closed
- ✅ Focuses the specific view
- ✅ Switches to your tab if another tab is active
- ✅ Works reliably across VS Code versions

**Important:** Do NOT define this command in `package.json` - it's automatically created!

---

### Method 2: Focus the View Container

```typescript
// Opens the entire view container (activity bar tab)
await vscode.commands.executeCommand('workbench.view.extension.codeOrganizer');
```

**What this does:**
- Opens your custom activity bar tab
- Doesn't focus a specific view (just shows the container)

---

### Method 3: Use TreeView.reveal() with Root Item

```typescript
// Reveal a specific item (opens view if needed)
const treeDataProvider = new CodeOrganizerTreeDataProvider();
const treeView = vscode.window.createTreeView('codeOrganizerOutlineActivity', {
  treeDataProvider: treeDataProvider
});

// Get root or any item
const sections = treeDataProvider.getSections();
if (sections.length > 0) {
  const firstItem = new SectionTreeItem(sections[0], sections, document);
  await treeView.reveal(firstItem, {
    focus: true,    // Focus the view
    select: false,  // Don't select the item
    expand: false   // Don't expand
  });
}
```

**What this does:**
- Reveals a specific tree item
- Opens the view container if closed
- Can focus and select the item

**Limitations:**
- Requires an item to reveal (can't reveal empty tree)
- More complex than `.focus` command

---

## Finding Auto-Generated Commands

### How to Discover Commands for Your Extension

**Method 1: Keyboard Shortcuts Panel**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Search "Preferences: Open Keyboard Shortcuts"
3. Search for your view ID (e.g., "codeOrganizer")
4. See all auto-generated commands listed

**Method 2: Command Palette**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type your view name
3. VS Code shows available commands

**Method 3: Programmatically List Commands**
```typescript
const allCommands = await vscode.commands.getCommands();
const myCommands = allCommands.filter(cmd =>
  cmd.includes('codeOrganizer') ||
  cmd.includes('codeOrganizerOutlineActivity')
);
console.log('Available commands:', myCommands);
```

---

## Implementation Examples

### Example 1: Simple "Show Code Organizer" Command

```typescript
// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Register a simple command to open your view
  context.subscriptions.push(
    vscode.commands.registerCommand('codeOrganizer.focus', async () => {
      // Use the auto-generated .focus command
      await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
    })
  );
}
```

**In package.json:**
```json
{
  "commands": [
    {
      "command": "codeOrganizer.focus",
      "title": "Show Code Organizer",
      "category": "Code Organizer"
    }
  ]
}
```

**User experience:**
- User opens Command Palette
- Searches "Show Code Organizer"
- Your view opens and focuses

---

### Example 2: Focus View with Keybinding

**In package.json:**
```json
{
  "commands": [
    {
      "command": "codeOrganizer.focus",
      "title": "Show Code Organizer",
      "category": "Code Organizer"
    }
  ],
  "keybindings": [
    {
      "command": "codeOrganizer.focus",
      "key": "ctrl+shift+o",
      "mac": "cmd+shift+o"
    }
  ]
}
```

**User experience:**
- User presses `Ctrl+Shift+O`
- Your view instantly opens and focuses

---

### Example 3: Focus View When Extension Activates

```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... register TreeView ...

  // Auto-focus view on first activation (optional)
  const hasShownBefore = context.globalState.get('codeOrganizer.hasShown');
  if (!hasShownBefore) {
    // First time user - show the view
    vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
    context.globalState.update('codeOrganizer.hasShown', true);
  }
}
```

---

### Example 4: Focus View and Reveal Specific Section

```typescript
async function focusOnSection(section: SectionMatch) {
  // First, focus the view (opens container)
  await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');

  // Then reveal the specific item
  const item = treeDataProvider.findTreeItemBySection(section);
  if (item) {
    await treeView.reveal(item, {
      focus: false,   // Already focused above
      select: true,   // Highlight this section
      expand: 1
    });
  }
}
```

---

## Common Patterns

### Pattern 1: "Welcome" Command for New Users

```typescript
vscode.commands.registerCommand('codeOrganizer.welcome', async () => {
  // Show welcome message
  const choice = await vscode.window.showInformationMessage(
    'Welcome to Code Organizer! Would you like to see the sections view?',
    'Show View',
    'Later'
  );

  if (choice === 'Show View') {
    await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
  }
});
```

---

### Pattern 2: Conditional Focus (Only if Sections Exist)

```typescript
vscode.commands.registerCommand('codeOrganizer.focusIfSections', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const sections = findSections(editor.document.getText(), editor.document.languageId);

  if (sections.length > 0) {
    await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
  } else {
    vscode.window.showInformationMessage('No sections found in current file');
  }
});
```

---

### Pattern 3: Toggle View Visibility

```typescript
// Note: VS Code doesn't provide a direct "toggle" API
// But you can track state and use .focus

let isViewVisible = false;

vscode.commands.registerCommand('codeOrganizer.toggle', async () => {
  if (isViewVisible) {
    // VS Code doesn't have a .hide command
    // Best you can do is focus another view
    await vscode.commands.executeCommand('workbench.view.explorer');
    isViewVisible = false;
  } else {
    await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
    isViewVisible = true;
  }
});
```

---

## Command ID Naming Convention

### Your View IDs (from package.json)

```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "codeOrganizer",           // ← Container ID
      "title": "Code Organizer"
    }
  ]
},
"views": {
  "codeOrganizer": [
    {
      "id": "codeOrganizerOutlineActivity",  // ← View ID
      "name": "Sections"
    }
  ]
}
```

### Auto-Generated Commands

Based on the above configuration:

| Command | Purpose |
|---------|---------|
| `codeOrganizerOutlineActivity.focus` | Focus the "Sections" view |
| `workbench.view.extension.codeOrganizer` | Open the "Code Organizer" container |
| `workbench.actions.treeView.codeOrganizerOutlineActivity.refresh` | Refresh tree |
| `workbench.actions.treeView.codeOrganizerOutlineActivity.collapseAll` | Collapse all items |

---

## Best Practices

### ✅ DO:
- Use the auto-generated `.focus` command (simplest and most reliable)
- Register your own wrapper command with a user-friendly name
- Add keybindings for quick access
- Show informative messages if view can't be focused (no sections, etc.)

### ❌ DON'T:
- Define `.focus` command in package.json (it's auto-generated)
- Try to manually show/hide views (VS Code manages this)
- Assume view is visible after focusing (it might still be collapsed)

---

## Troubleshooting

### Command Not Found Error

**Problem:** `command 'myview.focus' not found`

**Solutions:**
1. Check your view ID is correct (case-sensitive!)
2. Ensure TreeView is registered before calling `.focus`
3. Wait for extension activation to complete
4. Verify view ID matches what's in package.json

### View Doesn't Focus

**Problem:** Command executes but nothing happens

**Solutions:**
1. Check if view is conditionally hidden (`"when"` clause in package.json)
2. Ensure TreeDataProvider returns items (empty trees might not show)
3. Try focusing container first: `workbench.view.extension.<containerId>`
4. Check Developer Tools Console for errors

### View Opens But Doesn't Have Focus

**Problem:** View opens but cursor stays in editor

**Expected behavior:** This is normal! The `.focus` command opens the view but doesn't steal keyboard focus from the editor by design. If you need to truly focus the view, there's no direct API for that.

---

## Related APIs

- [tree-view.md](tree-view.md) - TreeView and TreeDataProvider
- [window-events.md](window-events.md) - Editor events
- [vscode.commands](https://code.visualstudio.com/api/references/vscode-api#commands) - Command execution API

---

## Summary

**The simplest way to focus your custom view:**

```typescript
await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
```

That's it! VS Code handles the rest. ✨
