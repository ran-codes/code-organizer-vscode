import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeOrganizerTreeDataProvider } from '../treeDataProvider';
import { SectionIndex } from '../sectionIndex';

// The invariant this suite exists for: `TreeView.reveal()` matches elements by
// **object reference** against what `getChildren()` handed back. A rebuilt
// SectionTreeItem with identical field values is a stranger to the tree, and the
// failure is silent — the `if (item)` guard in cursorSync skips the reveal, the
// editor highlight keeps working, and only the sidebar quietly stops scrolling.
//
// That invariant is also what makes `getTreeItemForSection` safe (#50, #51): it
// builds items VS Code has not asked for yet, which is only sound because the
// cache is the **single source** of SectionTreeItem instances — so an on-demand
// item *is* the object a later `getChildren()` hands back. The test asserting
// exactly that is the load-bearing one in this file.
//
// Every assertion below uses `strictEqual`, never `deepStrictEqual`. The bug
// class *is* identity: two objects with identical contents are precisely the
// failure mode, so a deep-equality assertion would pass against a broken
// refactor and hand back false confidence.
suite('Tree Data Provider Tests (reveal identity)', () => {

	let index: SectionIndex;
	let provider: CodeOrganizerTreeDataProvider;

	setup(() => {
		index = new SectionIndex();
		provider = new CodeOrganizerTreeDataProvider(index);
	});

	teardown(() => {
		index.dispose();
	});

	async function refreshedWith(content: string) {
		const document = await vscode.workspace.openTextDocument({ content, language: 'python' });
		provider.refresh(document);
		return document;
	}

	test('Should return the same instance getChildren handed out', async () => {
		await refreshedWith('# Root ----\n## Child ----\n');

		const roots = provider.getChildren();
		assert.strictEqual(roots.length, 1);
		assert.strictEqual(provider.getTreeItemForSection(roots[0].section), roots[0]);
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
		const sections = index.getSections(document);

		const roots = provider.getChildren();
		assert.strictEqual(roots.length, 2);
		assert.notStrictEqual(roots[0], roots[1]);
		assert.strictEqual(provider.getTreeItemForSection(sections[0]), roots[0]);
		assert.strictEqual(provider.getTreeItemForSection(sections[1]), roots[1]);
	});

	test('Should hand out the same instance getChildren later returns', async () => {
		// The load-bearing assertion for #50. Building an item before VS Code has
		// asked for it is only safe because the cache is the single source of
		// instances — reveal() matches by reference against what getChildren()
		// returns, so these two must be the same object.
		const document = await refreshedWith('# Root ----\n');
		const section = index.getSections(document)[0];

		const onDemand = provider.getTreeItemForSection(section);
		assert.ok(onDemand);
		assert.strictEqual(provider.getChildren()[0], onDemand);
	});

	test('Should build a section under a parent getChildren was never called for', async () => {
		// #51. VS Code does not call getChildren() on a collapsed parent, so nothing
		// beneath it is ever cached. Building on miss has to produce the child *and*
		// — through getParent() — the ancestor chain reveal() walks to reach it.
		// Both halves are asserted; either one alone leaves the reveal broken.
		const document = await refreshedWith('# Root ----\n## Child ----\n');
		const sections = index.getSections(document);

		// Roots only: exactly what VS Code asks for while Root sits collapsed.
		const root = provider.getChildren()[0];

		const child = provider.getTreeItemForSection(sections[1]);
		assert.ok(child);
		assert.strictEqual(provider.getChildren(root)[0], child);
		assert.strictEqual(provider.getParent(child), root);
	});

	test('Should hand out a stable instance across repeated getTreeItemForSection calls', async () => {
		const document = await refreshedWith('# Root ----\n');
		const section = index.getSections(document)[0];

		const first = provider.getTreeItemForSection(section);
		assert.ok(first);
		assert.strictEqual(provider.getTreeItemForSection(section), first);
	});

	test('Should return no children before any refresh', async () => {
		assert.deepStrictEqual(provider.getChildren(), []);
	});

	test('Should return no tree item before any refresh', async () => {
		// Decision 3 of the #50 plan: guard on currentDocument rather than letting
		// getOrCreateTreeItem's `this.currentDocument!` build an item around undefined.
		const document = await vscode.workspace.openTextDocument({
			content: '# Root ----\n',
			language: 'python'
		});
		const section = index.getSections(document)[0];

		assert.strictEqual(provider.getTreeItemForSection(section), undefined);
	});
});
