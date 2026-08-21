import * as assert from 'assert';
import * as vscode from 'vscode';
import { registerCursorSync } from '../cursorSync';
import { CodeOrganizerTreeDataProvider, SectionTreeItem } from '../treeDataProvider';
import { SectionIndex } from '../sectionIndex';

// The invariant this suite exists for: `TreeView.reveal()` is documented to
// *show* a hidden view, so running it on every debounced cursor move would yank
// the sidebar away from whatever the user has open. `cursorSync` therefore skips
// the reveal while the view is hidden — and, because every pass skipped while it
// was hidden left the sidebar stale, re-syncs from `onDidChangeVisibility` when
// it comes back.
//
// Both halves had to be written in prose because the type system cannot enforce
// either, which is precisely the case `test/CLAUDE.md` says needs a test: the
// compiler type-checks a reveal against a hidden view exactly like a reveal
// against a visible one.
//
// No module mocking is needed — the seam is injection. `registerCursorSync`
// takes the `TreeView` as a parameter, so a stub with a settable `visible`, a
// real `EventEmitter` for visibility changes, and a recording `reveal` covers
// every assertion below. The returned sync function is called directly, which
// also sidesteps the 150 ms debounce.
suite('Cursor Sync Tests (TreeView visibility guard)', () => {

	let index: SectionIndex;
	let provider: CodeOrganizerTreeDataProvider;
	let decoration: vscode.TextEditorDecorationType;
	let subscriptions: vscode.Disposable[];
	let visibilityEmitter: vscode.EventEmitter<vscode.TreeViewVisibilityChangeEvent>;
	let revealed: SectionTreeItem[];
	let treeView: vscode.TreeView<SectionTreeItem>;
	let viewVisible: boolean;

	setup(() => {
		index = new SectionIndex();
		provider = new CodeOrganizerTreeDataProvider(index);
		decoration = vscode.window.createTextEditorDecorationType({});
		subscriptions = [];
		visibilityEmitter = new vscode.EventEmitter<vscode.TreeViewVisibilityChangeEvent>();
		revealed = [];
		viewVisible = true;

		treeView = {
			get visible() { return viewVisible; },
			onDidChangeVisibility: visibilityEmitter.event,
			reveal: async (item: SectionTreeItem) => { revealed.push(item); }
		} as unknown as vscode.TreeView<SectionTreeItem>;
	});

	teardown(async () => {
		subscriptions.forEach(d => d.dispose());
		visibilityEmitter.dispose();
		decoration.dispose();
		index.dispose();
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	function register(): () => Promise<void> {
		const context = { subscriptions } as unknown as vscode.ExtensionContext;
		return registerCursorSync(context, treeView, provider, decoration);
	}

	/** Open a two-level document and park the cursor inside `Child`. */
	async function openWithCursorInChild(): Promise<void> {
		const document = await vscode.workspace.openTextDocument({
			content: '# Root ----\n## Child ----\nbody\n',
			language: 'python'
		});
		const editor = await vscode.window.showTextDocument(document);
		const position = document.positionAt(document.getText().indexOf('body'));
		editor.selection = new vscode.Selection(position, position);
	}

	/** The visibility listener is fire-and-forget, so poll rather than await it. */
	async function waitForReveal(timeoutMs = 2000): Promise<void> {
		const deadline = Date.now() + timeoutMs;
		while (revealed.length === 0 && Date.now() < deadline) {
			await new Promise(resolve => setTimeout(resolve, 10));
		}
	}

	test('Should skip the reveal while the view is hidden', async () => {
		await openWithCursorInChild();
		viewVisible = false;

		await register()();

		assert.strictEqual(revealed.length, 0, 'reveal must not run against a hidden view');
		// The rest of the pass still ran. Skipping the reveal must not skip the
		// refresh, or the sidebar would be stale rather than merely unscrolled.
		assert.ok(provider.getSections().length > 0, 'the pass should still refresh the tree');
	});

	test('Should reveal while the view is visible', async () => {
		await openWithCursorInChild();
		viewVisible = true;

		await register()();

		assert.strictEqual(revealed.length, 1);
		assert.strictEqual(revealed[0].section.name, 'Child');
	});

	test('Should catch up when the view becomes visible again', async () => {
		await openWithCursorInChild();
		viewVisible = false;

		await register()();
		assert.strictEqual(revealed.length, 0, 'nothing revealed while hidden');

		viewVisible = true;
		visibilityEmitter.fire({ visible: true });
		await waitForReveal();

		assert.strictEqual(revealed.length, 1, 'becoming visible must re-sync');
		assert.strictEqual(revealed[0].section.name, 'Child');
	});

	test('Should stay quiet when the view reports becoming hidden', async () => {
		await openWithCursorInChild();
		viewVisible = false;

		await register()();
		visibilityEmitter.fire({ visible: false });
		await new Promise(resolve => setTimeout(resolve, 50));

		assert.strictEqual(revealed.length, 0, 'a hidden-visibility event must not re-sync');
	});
});
