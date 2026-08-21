import * as assert from 'assert';
import { findSections } from '../utils/findSections';
import { getCurrentSection } from '../utils/getCurrentSection';

suite('Current Section Tests (getCurrentSection)', () => {

	// One fixture for the whole suite: a preamble before any section, a depth-1
	// section, a nested depth-2 section inside it, and a second depth-1 section
	// that runs to the end of the text.
	const text = [
		'preamble line',
		'# Root ----',
		'root body',
		'## Nested ----',
		'nested body',
		'# Second ----',
		'tail line',
		''
	].join('\n');

	const sections = findSections(text, 'python');
	const at = (needle: string) => text.indexOf(needle);

	test('Should return undefined before the first section', () => {
		assert.strictEqual(getCurrentSection(at('preamble'), sections), undefined);
	});

	test('Should return the containing depth-1 section', () => {
		const current = getCurrentSection(at('root body'), sections);
		assert.strictEqual(current?.name, 'Root');
		assert.strictEqual(current?.depth, 1);
	});

	test('Should return the deepest containing section, not its parent', () => {
		// The cursor is inside Nested, which is inside Root. Both contain the
		// offset; the deeper one wins.
		const current = getCurrentSection(at('nested body'), sections);
		assert.strictEqual(current?.name, 'Nested');
		assert.strictEqual(current?.depth, 2);
	});

	test('Should return the last section for content after it', () => {
		// `Second` is depth 1, so it terminates `Nested` as well as `Root`, and
		// runs to the end of the text.
		const current = getCurrentSection(at('tail line'), sections);
		assert.strictEqual(current?.name, 'Second');
	});

	test('Should treat a section header line as inside its own section', () => {
		// The start offset is inclusive: the cursor parked on `## Nested ----`
		// itself resolves to Nested.
		const nested = sections.find(s => s.name === 'Nested')!;
		assert.strictEqual(getCurrentSection(nested.index, sections), nested);
	});

	test('Should return the last section at the very end of the text', () => {
		// The last section runs to the end of the text, so the last position in
		// the file is inside it — the highlight stays on there rather than
		// dropping (#52).
		assert.strictEqual(getCurrentSection(text.length, sections)?.name, 'Second');

		// One character earlier agrees, so the EOF position is not a special case
		// bolted onto an otherwise different answer.
		assert.strictEqual(getCurrentSection(text.length - 1, sections)?.name, 'Second');
	});

	test('Should resolve an out-of-range offset rather than guard against it', () => {
		// The function deliberately carries no bounds check: callers pass
		// `document.offsetAt(...)`, which VS Code already clamps, so an offset past
		// the end is unreachable in practice and resolving it to the last section
		// is a harmless answer rather than a crash (#52). Pinned because that is a
		// prose contract the type system cannot hold anyone to — `offset: number`
		// accepts `text.length + 50` exactly as readily as `3`, so a future
		// defensive guard would type-check clean and would resurrect #52 for any
		// caller that is not `offsetAt`-clamped.
		assert.strictEqual(getCurrentSection(text.length + 50, sections)?.name, 'Second');

		// The other end of the same claim: a negative offset resolves to nothing
		// instead of throwing.
		assert.strictEqual(getCurrentSection(-1, sections), undefined);
	});

	test('Should return undefined when there are no sections', () => {
		const plain = 'x = 1\n# just a comment\n';
		assert.strictEqual(getCurrentSection(3, findSections(plain, 'python')), undefined);
	});

	test('Should return undefined at EOF when there are no sections', () => {
		// One of the cases the removed EOF guard used to short-circuit: with
		// nothing to scan there is no last section to fall back to.
		const plain = 'x = 1\n# just a comment\n';
		assert.strictEqual(
			getCurrentSection(plain.length, findSections(plain, 'python')),
			undefined
		);
	});

	test('Should return the only section at EOF when it starts at offset 0', () => {
		// The degenerate one-section document: the whole file is that section,
		// including its final position.
		const single = '# Only ----\nbody\n';
		assert.strictEqual(
			getCurrentSection(single.length, findSections(single, 'python'))?.name,
			'Only'
		);
	});

	test('Should return undefined for an empty document', () => {
		// No text means no sections, so offset 0 is both the start and the end of
		// the document and resolves to nothing. Falls out of the scan for free —
		// asserted so it stays that way.
		assert.strictEqual(getCurrentSection(0, findSections('', 'python')), undefined);
	});

	test('Should resolve every offset to the same section the boundary rule implies', () => {
		// Brute-force cross-check of the one-scan implementation against the
		// definition it replaced: a section spans from its index until the next
		// section at the same or smaller depth (or the end of the text), and the
		// deepest match wins. Guards the "last section at or before the offset"
		// shortcut across every position in the fixture.
		//
		// The loop and the final section's `end` both run one past `text.length`
		// so that EOF is covered: the last section is inclusive of the end of the
		// text (#52). The two bounds fail differently if narrowed back, which is
		// worth knowing before touching either.
		//
		// Narrowing `end` to `text.length` is self-enforcing: the oracle then
		// computes `undefined` at EOF while the implementation returns `Second`,
		// so this test fails loudly and says why.
		//
		// Narrowing the loop bound to `offset < text.length` is SILENT: the EOF
		// assertion simply stops running, and the oracle still passes having
		// quietly dropped the one case it was widened for. The dedicated `Should
		// return the last section at the very end of the text` test above is the
		// backstop for that one — which is why the EOF rule is pinned twice.
		for (let offset = 0; offset <= text.length; offset++) {
			let expected: typeof sections[number] | undefined;
			for (const section of sections) {
				const next = sections.find(s => s.index > section.index && s.depth <= section.depth);
				const end = next ? next.index : text.length + 1;
				if (offset >= section.index && offset < end) {
					if (!expected || section.depth > expected.depth) {
						expected = section;
					}
				}
			}
			assert.strictEqual(
				getCurrentSection(offset, sections),
				expected,
				`offset ${offset}`
			);
		}
	});
});
