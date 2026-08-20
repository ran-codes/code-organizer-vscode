import * as vscode from 'vscode';
import { CodeOrganizerTreeDataProvider, SectionTreeItem } from './treeDataProvider';
import { updateSectionHighlight } from './decorations';
import { getCurrentSection } from './utils/getCurrentSection';
import { log } from './log';

// 1. Constants ----
/** Cursor movement is noisy; only the last move in a burst resolves a section. */
const DEBOUNCE_MS = 150;

// 2. Cursor Sync Registration ----
/**
 * Keep the outline in step with the cursor: highlight the containing section in
 * the editor and reveal it in the TreeView.
 *
 * Owns all of its own listeners and pushes them onto `context.subscriptions`.
 * Returns the sync function so `activate()` can kick it once for the editor that
 * is already open — the only reason a caller needs a handle on it.
 */
export function registerCursorSync(
  context: vscode.ExtensionContext,
  treeView: vscode.TreeView<SectionTreeItem>,
  treeDataProvider: CodeOrganizerTreeDataProvider,
  decoration: vscode.TextEditorDecorationType
): () => Promise<void> {

  let updateTimeout: NodeJS.Timeout | undefined;
  let lastDocument: vscode.TextDocument | undefined;

  //// 2.1 Sync Pass ----
  async function syncPass(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;

    // Refresh first, then read sections back out of the tree provider — never
    // straight from the SectionIndex. `reveal()` matches by object identity
    // against `treeItemCache`, and refreshing first is what guarantees the
    // uniqueIds resolved below belong to the same snapshot that cache was built
    // from. Reading version-keyed sections directly would let this pass run
    // ahead of the tree, miss the lookup, and silently stop revealing.
    if (document !== lastDocument) {
      treeDataProvider.refresh(document);
      lastDocument = document;
    }

    const currentSection = getCurrentSection(
      document.offsetAt(editor.selection.active),
      document.getText().length,
      treeDataProvider.getSections()
    );

    updateSectionHighlight(currentSection, editor, decoration);

    if (!currentSection) {
      return;
    }

    ////// 2.1.1 TreeView Reveal ----
    const item = treeDataProvider.findTreeItemBySection(currentSection);
    if (!item) {
      // Logged rather than skipped in silence. `reveal()` needs the cached
      // TreeItem instance, and `refresh()` clears that cache while only
      // `getChildren()` — which VS Code schedules asynchronously — refills it.
      // Nothing above this awaits, so *every* pass that refreshed arrives here
      // with an empty cache. Not a race it might lose: an edit resets
      // `lastDocument` and forces a refresh, so the reveal does not fire at all
      // while the user is typing. Pre-existing and deterministic — see #50.
      log(`No cached tree item for "${currentSection.name}" — reveal skipped`);
      return;
    }

    try {
      await treeView.reveal(item, { select: true, focus: false, expand: 1 });
    } catch (error) {
      log(`Reveal failed for "${currentSection.name}": ${error}`);
    }
  }

  //// 2.2 Rejection Boundary ----
  /**
   * Every caller of this is fire-and-forget — the debounce timer, the
   * active-editor listener, and `activate()`'s initial kick all discard the
   * promise. Nothing may escape as an unhandled rejection: that lands in the
   * Extension Host console, which is exactly the sink `log()` exists to avoid.
   */
  async function updateHighlight(): Promise<void> {
    try {
      await syncPass();
    } catch (error) {
      log(`Cursor sync pass failed: ${error}`);
    }
  }

  //// 2.3 Listeners ----
  context.subscriptions.push(
    // Cursor moved — debounced.
    vscode.window.onDidChangeTextEditorSelection(() => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(updateHighlight, DEBOUNCE_MS);
    }),

    // Switched editors — re-sync immediately.
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateHighlight();
    }),

    // Document edited — force the next pass to refresh the tree.
    vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document === lastDocument) {
        lastDocument = undefined;
      }
    }),

    // Don't let a debounced pass fire into a disposed decoration on shutdown.
    new vscode.Disposable(() => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = undefined;
      }
    })
  );

  return updateHighlight;
}
