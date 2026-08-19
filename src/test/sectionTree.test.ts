import * as assert from 'assert';
import { findSections } from '../utils/findSections';
import { buildChildrenMap, childrenOf } from '../utils/sectionTree';

suite('Section Tree Tests (buildChildrenMap / childrenOf)', () => {

	test('Should group children under their parent uniqueId', () => {
		const text = `
# Parent ----
## Child A ----
## Child B ----
`;
		const sections = findSections(text);
		const parent = sections.find(s => s.name === 'Parent')!;
		const map = buildChildrenMap(sections);

		assert.deepStrictEqual(
			childrenOf(map, parent.uniqueId).map(s => s.name),
			['Child A', 'Child B']
		);
	});

	test('Should omit parentless sections from the map', () => {
		// A file that OPENS at depth 3 yields a parentless depth-3 section.
		// `parentId === undefined` must never become a map key — both consumers
		// build their root list from `depth === 1`, not from "has no parent".
		const text = `
### Orphan ----
# Root ----
## Child ----
`;
		const sections = findSections(text);
		const orphan = sections.find(s => s.name === 'Orphan')!;
		const root = sections.find(s => s.name === 'Root')!;

		assert.strictEqual(orphan.depth, 3);
		assert.strictEqual(orphan.parentId, undefined);

		const map = buildChildrenMap(sections);

		// Only Root has children; the orphan is absent entirely.
		assert.strictEqual(map.size, 1);
		assert.ok(map.has(root.uniqueId));
		assert.deepStrictEqual([...map.keys()], [root.uniqueId]);
	});

	test('Should preserve document order within a bucket across comment styles', () => {
		// findSections matches one comment style at a time, so the raw match order
		// is per-style; only the final sort puts it back in document order. Both
		// consumers render siblings in map order, so that sort is load-bearing here.
		const text = `
# Root ----
## Hash Child ----
//// Slash Child ----
## Hash Child 2 ----
`;
		const sections = findSections(text);
		const root = sections.find(s => s.name === 'Root')!;
		const children = childrenOf(buildChildrenMap(sections), root.uniqueId);

		assert.deepStrictEqual(
			children.map(s => s.name),
			['Hash Child', 'Slash Child', 'Hash Child 2']
		);

		// Same claim, stated as the invariant rather than a fixed list.
		const indices = children.map(s => s.index);
		assert.deepStrictEqual(indices, [...indices].sort((a, b) => a - b));
	});

	test('Should report no children for a leaf section', () => {
		// treeDataProvider derives TreeItemCollapsibleState from `map.has(...)`,
		// so a leaf must not appear as a key.
		const text = `
# Parent ----
## Leaf ----
`;
		const sections = findSections(text);
		const leaf = sections.find(s => s.name === 'Leaf')!;
		const map = buildChildrenMap(sections);

		assert.strictEqual(map.has(leaf.uniqueId), false);
		assert.deepStrictEqual(childrenOf(map, leaf.uniqueId), []);
	});

	test('Should return an empty array for an unknown uniqueId', () => {
		const map = buildChildrenMap(findSections('# Only ----\n'));
		assert.deepStrictEqual(childrenOf(map, 'No Such Section_999'), []);
	});

	test('Should handle an empty section list', () => {
		const map = buildChildrenMap([]);
		assert.strictEqual(map.size, 0);
		assert.deepStrictEqual(childrenOf(map, 'anything_0'), []);
	});

	test('Should key duplicate section names separately', () => {
		// Names are not unique; uniqueId is what makes them addressable.
		const text = `
# Setup ----
## Step ----
# Setup ----
## Step ----
`;
		const sections = findSections(text);
		const setups = sections.filter(s => s.name === 'Setup');
		const map = buildChildrenMap(sections);

		assert.strictEqual(setups.length, 2);
		assert.notStrictEqual(setups[0].uniqueId, setups[1].uniqueId);
		assert.strictEqual(childrenOf(map, setups[0].uniqueId).length, 1);
		assert.strictEqual(childrenOf(map, setups[1].uniqueId).length, 1);
		assert.notStrictEqual(
			childrenOf(map, setups[0].uniqueId)[0].uniqueId,
			childrenOf(map, setups[1].uniqueId)[0].uniqueId
		);
	});
});
