import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeOrganizerDocumentSymbolProvider } from '../documentSymbolProvider';
import { SectionIndex } from '../sectionIndex';

// Unlike the syntax suites, this one imports `vscode` — it exercises the provider
// that feeds the built-in Outline, not the vscode-free parser underneath it.
suite('Document Symbol Provider Tests', () => {

	// Built per test and disposed after, like the other two provider suites: the
	// index registers an `onDidCloseTextDocument` listener, so a suite-scoped
	// instance would leak it — and every document these tests open — for the rest
	// of the run.
	let index: SectionIndex;
	let provider: CodeOrganizerDocumentSymbolProvider;

	setup(() => {
		index = new SectionIndex();
		provider = new CodeOrganizerDocumentSymbolProvider(index);
	});

	teardown(() => {
		index.dispose();
	});

	async function symbolsFor(content: string, language = 'python') {
		const document = await vscode.workspace.openTextDocument({ content, language });
		const token = new vscode.CancellationTokenSource().token;
		return provider.provideDocumentSymbols(document, token);
	}

	test('Should nest sections under their parent', async () => {
		const symbols = await symbolsFor(
			'# Root ----\n## Child A ----\n## Child B ----\n'
		);

		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'Root');
		assert.deepStrictEqual(
			symbols[0].children.map(s => s.name),
			['Child A', 'Child B']
		);
	});

	test('Should keep a child that shares its parent name, and its whole subtree', async () => {
		// Regression for #47: the provider used to skip any child whose name matched
		// its direct parent's. The `continue` fired before both the recursive descent
		// and the push, so the entire subtree under that child vanished from the
		// built-in Outline while the Activity Bar TreeView still showed it.
		const symbols = await symbolsFor(
			'# Setup ----\n## Setup ----\n### Details ----\n#### Deep ----\n'
		);

		assert.strictEqual(symbols.length, 1);
		assert.strictEqual(symbols[0].name, 'Setup');

		const duplicate = symbols[0].children;
		assert.strictEqual(duplicate.length, 1);
		assert.strictEqual(duplicate[0].name, 'Setup');

		const details = duplicate[0].children;
		assert.strictEqual(details.length, 1);
		assert.strictEqual(details[0].name, 'Details');

		const deep = details[0].children;
		assert.strictEqual(deep.length, 1);
		assert.strictEqual(deep[0].name, 'Deep');
	});

	test('Should keep repeated names at every level of one chain', async () => {
		// Same name all the way down — nothing may collapse or drop.
		const symbols = await symbolsFor(
			'# Config ----\n## Config ----\n### Config ----\n#### Config ----\n'
		);

		let node = symbols[0];
		for (let depth = 1; depth <= 4; depth++) {
			assert.strictEqual(node.name, 'Config');
			if (depth < 4) {
				assert.strictEqual(node.children.length, 1, `depth ${depth} lost its child`);
				node = node.children[0];
			} else {
				assert.deepStrictEqual(node.children, []);
			}
		}
	});

	test('Should treat every depth-1 section as a root', async () => {
		const symbols = await symbolsFor(
			'# First ----\n## Nested ----\n# Second ----\n'
		);

		assert.deepStrictEqual(symbols.map(s => s.name), ['First', 'Second']);
		assert.deepStrictEqual(symbols[0].children.map(s => s.name), ['Nested']);
		assert.deepStrictEqual(symbols[1].children, []);
	});

	test('Should return no symbols for a file without sections', async () => {
		const symbols = await symbolsFor('x = 1\n# just a comment\n');
		assert.deepStrictEqual(symbols, []);
	});
});
