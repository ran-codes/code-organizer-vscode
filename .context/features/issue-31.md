# Issue #31: Focus Command - Open and Show Code Organizer View

## Problem Statement

Users need a quick way to open and focus the Code Organizer view when it's closed or hidden. Currently:
- Users must manually find and click the activity bar icon
- No keyboard shortcut exists
- No command in Command Palette to quickly access the view

**Goal:** Create a "Show Code Organizer" command that:
1. Opens the Code Organizer activity bar tab if closed
2. Focuses the "Sections" view
3. Makes the view immediately visible and accessible
4. Works via Command Palette or keyboard shortcut

---

## API Research Summary

### Auto-Generated `.focus` Commands

VS Code automatically creates commands for every registered TreeView:
- **Pattern:** `<viewId>.focus`
- **Our view:** `codeOrganizerOutlineActivity.focus`
- **Behavior:** Opens container (if closed) + focuses the specific view
- **No package.json definition needed** - it's auto-generated!

### Related Commands

VS Code also generates:
- `workbench.view.extension.codeOrganizer` - Opens the container (but doesn't focus specific view)
- `workbench.actions.treeView.codeOrganizerOutlineActivity.refresh` - Refresh tree
- `workbench.actions.treeView.codeOrganizerOutlineActivity.collapseAll` - Collapse all

**See:** [.context/vs-code-api/view-focus-commands.md](.context/vs-code-api/view-focus-commands.md) for complete documentation

---

## Implementation Plan

### Approach: Wrapper Command

Create a user-friendly wrapper command that calls the auto-generated `.focus` command:

```typescript
// In extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand('codeOrganizer.showView', async () => {
    // Use auto-generated .focus command
    await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
  })
);
```

### Benefits
- ✅ Simple and reliable (uses VS Code's built-in behavior)
- ✅ User-friendly command name ("Show Code Organizer")
- ✅ Can add keyboard shortcut
- ✅ Appears in Command Palette with proper category
- ✅ No complex logic needed

---

## Implementation Steps

### Step 1: Register Command in extension.ts

**Location:** `src/extension.ts` (in `activate` function)

**Code to add:**
```typescript
// Register "Show Code Organizer" command
context.subscriptions.push(
  vscode.commands.registerCommand('codeOrganizer.showView', async () => {
    // Use the auto-generated .focus command for our view
    await vscode.commands.executeCommand('codeOrganizerOutlineActivity.focus');
  })
);
```

**Placement:** After TreeView registration, before event listeners

---

### Step 2: Add Command to package.json

**Location:** `package.json` → `contributes.commands`

**Code to add:**
```json
{
  "command": "codeOrganizer.showView",
  "title": "Show Code Organizer",
  "category": "Code Organizer"
}
```

**Result in Command Palette:**
```
Code Organizer: Show Code Organizer
```

---

### Step 3: Add Keyboard Shortcut (Optional)

**Location:** `package.json` → `contributes.keybindings`

**Code to add:**
```json
{
  "command": "codeOrganizer.showView",
  "key": "ctrl+shift+o",
  "mac": "cmd+shift+o",
  "when": "editorTextFocus"
}
```

**Note:** `Ctrl+Shift+O` is commonly used for "Go to Symbol" - might conflict. Consider alternative:
- `Ctrl+Alt+O` (Windows/Linux)
- `Cmd+Alt+O` (Mac)

---

## Testing Checklist

- [ ] Command appears in Command Palette as "Code Organizer: Show Code Organizer"
- [ ] Executing command opens Code Organizer activity bar tab (if closed)
- [ ] Executing command focuses "Sections" view
- [ ] Works when view is already open (no errors)
- [ ] Keyboard shortcut triggers command (if implemented)
- [ ] Command works from any file type (respects `when` clause if added)
- [ ] No console errors in Developer Tools

### Test Scenarios

1. **View Closed → Open:**
   - Close Code Organizer activity bar tab
   - Execute `Code Organizer: Show Code Organizer`
   - ✅ View should open and be visible

2. **View Open → Focus:**
   - Code Organizer already open
   - Switch to another activity bar tab (Explorer)
   - Execute command
   - ✅ Should switch back to Code Organizer

3. **Keyboard Shortcut:**
   - Press configured shortcut
   - ✅ Should behave same as Command Palette

---

## Alternative Approaches (Not Recommended)

### ❌ Alternative 1: Use Container Command Only
```typescript
await vscode.commands.executeCommand('workbench.view.extension.codeOrganizer');
```
**Problem:** Opens container but doesn't focus the specific "Sections" view

### ❌ Alternative 2: Use TreeView.reveal()
```typescript
const sections = treeDataProvider.getSections();
if (sections.length > 0) {
  const firstItem = treeDataProvider.getOrCreateTreeItem(sections[0]);
  await treeView.reveal(firstItem, { focus: true });
}
```
**Problem:** Requires tree to have items (won't work on empty tree)

### ✅ Recommended: Use Auto-Generated `.focus` Command
**Why:** Simple, reliable, works in all scenarios

---

## Current Commands Overview

After implementation, Code Organizer will have:

| Command | Purpose | User-Facing |
|---------|---------|-------------|
| `codeOrganizer.activate` | Initialize extension | Yes (Command Palette) |
| `codeOrganizer.showView` | **NEW:** Open/focus view | Yes (Command Palette + Shortcut) |
| `codeOrganizer.goToSection` | Jump to section (programmatic) | No (internal only) |
| `codeOrganizerOutlineActivity.focus` | Focus view (auto-generated) | Yes (but generic name) |

**User-friendly workflow:**
- Users see: "Code Organizer: Show Code Organizer" in Command Palette
- Behind the scenes: Executes auto-generated `.focus` command

---

## Difficulty Assessment

**Difficulty:** 🟢 **Easy**

**Reasoning:**
- VS Code provides auto-generated `.focus` command
- Implementation is 3 lines of code (wrapper command)
- No complex logic or state management needed
- Well-documented API behavior
- Low risk of bugs or edge cases

**Estimated time:** 10 minutes (coding + testing)

---

## Implementation Commit Checklist

- [ ] Add `codeOrganizer.showView` command registration in `src/extension.ts`
- [ ] Add command definition to `package.json` → `contributes.commands`
- [ ] (Optional) Add keyboard shortcut to `package.json` → `contributes.keybindings`
- [ ] Compile and test in Extension Development Host
- [ ] Verify command appears in Command Palette
- [ ] Test with view closed and open
- [ ] Commit with message: "Add 'Show Code Organizer' focus command #31"

---

## Related Documentation

- [.context/vs-code-api/view-focus-commands.md](.context/vs-code-api/view-focus-commands.md) - Complete API documentation
- [.context/features/issue-22.md](.context/features/issue-22.md) - View container strategy
- [.context/features/issue-29.md](.context/features/issue-29.md) - Editor → Outline sync implementation

---

## Notes

- This complements the existing `codeOrganizer.activate` command (which was a backup for activation issues)
- The auto-generated `.focus` command is more reliable than manually managing view visibility
- Users can still click the activity bar icon - this just adds a faster alternative
- Consider adding to extension README.md as a "Quick Start" tip
