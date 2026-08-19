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
  async function updateHighlight(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      log('No active editor');
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
      log(`Refreshing tree for document: ${document.fileName}`);
      treeDataProvider.refresh(document);
      lastDocument = document;
    }

    const sections = treeDataProvider.getSections();
    const currentSection = getCurrentSection(
      document.offsetAt(editor.selection.active),
      document.getText().length,
      sections
    );
    log(`${sections.length} sections; current: ${currentSection?.name ?? '(none)'}`);

    updateSectionHighlight(currentSection, editor, decoration);

    if (!currentSection) {
      return;
    }

    //// 2.2 TreeView Reveal ----
    const item = treeDataProvider.findTreeItemBySection(currentSection);
    if (!item) {
      // Logged rather than skipped in silence. `reveal()` needs the cached
      // TreeItem instance, and `refresh()` clears that cache while only
      // `getChildren()` refills it — so a miss here means VS Code has not
      // rebuilt the visible tree yet, or the section sits under a collapsed
      // parent it never asked for. Both are pre-existing; this line is how we
      // find out whether they bite in practice.
      log(`No cached tree item for "${currentSection.name}" — reveal skipped`);
      return;
    }

    try {
      await treeView.reveal(item, { select: true, focus: false, expand: 1 });
    } catch (error) {
      log(`Reveal failed for "${currentSection.name}": ${error}`);
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
