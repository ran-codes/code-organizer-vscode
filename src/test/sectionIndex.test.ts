import * as assert from 'assert';
import * as vscode from 'vscode';
import { SectionIndex } from '../sectionIndex';

// Proves the cache actually caches. The assertions are all about **reference
// identity** of the returned array: no spy or module mock is needed, because a
// second parse would necessarily produce a new array. `deepStrictEqual` would
// pass against a completely uncached index and prove nothing.
suite('Section Index Tests (shared parse cache)', () => {

	let index: SectionIndex;

	setup(() => {
		index = new SectionIndex();
	});

	teardown(() => {
		index.dispose();
	});

	async function pythonDoc(content: string) {
		return vscode.workspace.openTextDocument({ content, language: 'python' });
	}

	test('Should parse a document once per version', async () => {
		const doc = await pythonDoc('# Root ----\n## Child ----\n');

		const sections = index.getSections(doc);
		assert.strictEqual(sections.length, 2);

		// Same document, same version — the identical array comes back.
		assert.strictEqual(index.getSections(doc), sections);
		assert.strictEqual(index.getSections(doc), sections);
	});

	test('Should serve sections and children map from one parse', async () => {
		// The two consumers ask for different views of the same parse; neither
		// call may trigger a second one.
		const doc = await pythonDoc('# Root ----\n## Child ----\n');

		const sections = index.getSections(doc);
		const childrenMap = index.getChildrenMap(doc);

		assert.strictEqual(index.getChildrenMap(doc), childrenMap);
		assert.strictEqual(index.getSections(doc), sections);

		const root = sections.find(s => s.name === 'Root')!;
		assert.deepStrictEqual(
			childrenMap.get(root.uniqueId)?.map(s => s.name),
			['Child']
		);
	});

	test('Should re-parse after an edit bumps the document version', async () => {
		const doc = await pythonDoc('# Root ----\n');
		const before = index.getSections(doc);
		const versionBefore = doc.version;

		const edit = new vscode.WorkspaceEdit();
		edit.insert(doc.uri, new vscode.Position(0, 0), '# Added ----\n');
		assert.ok(await vscode.workspace.applyEdit(edit), 'edit did not apply');

		// The premise of the test: the version really did change.
		assert.notStrictEqual(doc.version, versionBefore);

		const after = index.getSections(doc);
		assert.notStrictEqual(after, before, 'stale sections served after an edit');
		assert.deepStrictEqual(after.map(s => s.name), ['Added', 'Root']);
	});

	test('Should keep separate entries for separate documents', async () => {
		// A single-entry cache would re-parse on every alternation between two
		// documents — exactly what split editors do.
		const a = await pythonDoc('# A ----\n');
		const b = await pythonDoc('# B ----\n');

		const firstA = index.getSections(a);
		const firstB = index.getSections(b);

		assert.strictEqual(index.getSections(a), firstA);
		assert.strictEqual(index.getSections(b), firstB);
		assert.deepStrictEqual(firstA.map(s => s.name), ['A']);
		assert.deepStrictEqual(firstB.map(s => s.name), ['B']);
	});

	test('Should re-parse after eviction', async () => {
		// `evict` is what the onDidCloseTextDocument listener calls; testing it
		// directly avoids depending on close-event timing in the test host.
		const doc = await pythonDoc('# Root ----\n');
		const before = index.getSections(doc);

		index.evict(doc.uri);

		assert.notStrictEqual(index.getSections(doc), before);
		assert.deepStrictEqual(index.getSections(doc).map(s => s.name), ['Root']);
	});

	test('Should parse markdown documents by their own rules', async () => {
		// Language id reaches the parser through the cache unchanged — markdown
		// headers need no `----`.
		const doc = await vscode.workspace.openTextDocument({
			content: '# Header\n## Sub\n',
			language: 'markdown'
		});

		assert.deepStrictEqual(
			index.getSections(doc).map(s => s.name),
			['Header', 'Sub']
		);
	});
});
