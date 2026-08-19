import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeOrganizerTreeDataProvider } from '../treeDataProvider';
import { findSections } from '../utils/findSections';

// The invariant this suite exists for: `TreeView.reveal()` matches elements by
// **object reference** against what `getChildren()` handed back. A rebuilt
// SectionTreeItem with identical field values is a stranger to the tree, and the
// failure is completely silent — the `if (item)` guard in cursorSync skips the
// reveal, the editor highlight keeps working, and only the sidebar quietly stops
// scrolling. It was documented in prose in three places and asserted nowhere.
//
// Every assertion below uses `strictEqual`, never `deepStrictEqual`. The bug
// class *is* identity: two objects with identical contents are precisely the
// failure mode, so a deep-equality assertion would pass against a broken
// refactor and hand back false confidence.
suite('Tree Data Provider Tests (reveal identity)', () => {

	let provider: CodeOrganizerTreeDataProvider;

	setup(() => {
		provider = new CodeOrganizerTreeDataProvider();
	});

	const sectionsOf = (document: vscode.TextDocument) =>
		findSections(document.getText(), document.languageId);

	async function refreshedWith(content: string) {
		const document = await vscode.workspace.openTextDocument({ content, language: 'python' });
		provider.refresh(document);
		return document;
	}

	test('Should return the same instance getChildren handed out', async () => {
		await refreshedWith('# Root ----\n## Child ----\n');

		const roots = provider.getChildren();
		assert.strictEqual(roots.length, 1);
		assert.strictEqual(provider.findTreeItemBySection(roots[0].section), roots[0]);
	});

	test('Should hand out stable instances across repeated getChildren calls', async () => {
		await refreshedWith('# Root ----\n## Child ----\n');

		const first = provider.getChildren();
		const second = provider.getChildren();
		assert.strictEqual(second[0], first[0]);

		const firstChildren = provider.getChildren(first[0]);
		assert.strictEqual(provider.getChildren(first[0])[0], firstChildren[0]);
	});

	test('Should return cached instances up the parent chain', async () => {
		// reveal() walks parents, so every link must be a cached instance too —
		// a freshly built parent breaks the reveal just as a freshly built child does.
		await refreshedWith('# Root ----\n## Child ----\n### Grandchild ----\n');

		const root = provider.getChildren()[0];
		const child = provider.getChildren(root)[0];
		const grandchild = provider.getChildren(child)[0];

		assert.strictEqual(provider.getParent(grandchild), child);
		assert.strictEqual(provider.getParent(child), root);
		assert.strictEqual(provider.getParent(root), undefined);
	});

	test('Should key the cache by uniqueId, not name', async () => {
		// Duplicate section names are legal. Two sections sharing a name must not
		// collapse onto one cached item, or reveal would jump to the wrong one.
		const document = await refreshedWith('# Setup ----\n# Setup ----\n');
		const sections = sectionsOf(document);

		const roots = provider.getChildren();
		assert.strictEqual(roots.length, 2);
		assert.notStrictEqual(roots[0], roots[1]);
		assert.strictEqual(provider.findTreeItemBySection(sections[0]), roots[0]);
		assert.strictEqual(provider.findTreeItemBySection(sections[1]), roots[1]);
	});

	test('Should hold no cached items between refresh and the first getChildren', async () => {
		// Pins a pre-existing gap rather than endorsing it. `refresh()` clears the
		// cache and fires the change event, but only VS Code calling `getChildren()`
		// refills it — so a cursor move that lands before the tree is rebuilt finds
		// nothing to reveal. Previously an unverified reading of the code; it is
		// real, it is out of scope for this refactor (no visible behavior change),
		// and cursorSync now logs the miss instead of returning in silence.
		const document = await refreshedWith('# Root ----\n');
		const section = sectionsOf(document)[0];

		assert.strictEqual(provider.findTreeItemBySection(section), undefined);

		// One getChildren() call is all it takes to populate it.
		const roots = provider.getChildren();
		assert.strictEqual(provider.findTreeItemBySection(section), roots[0]);
	});

	test('Should return no children before any refresh', async () => {
		assert.deepStrictEqual(provider.getChildren(), []);
	});
});
