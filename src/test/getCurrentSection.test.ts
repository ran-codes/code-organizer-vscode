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
		assert.strictEqual(getCurrentSection(at('preamble'), text.length, sections), undefined);
	});

	test('Should return the containing depth-1 section', () => {
		const current = getCurrentSection(at('root body'), text.length, sections);
		assert.strictEqual(current?.name, 'Root');
		assert.strictEqual(current?.depth, 1);
	});

	test('Should return the deepest containing section, not its parent', () => {
		// The cursor is inside Nested, which is inside Root. Both contain the
		// offset; the deeper one wins.
		const current = getCurrentSection(at('nested body'), text.length, sections);
		assert.strictEqual(current?.name, 'Nested');
		assert.strictEqual(current?.depth, 2);
	});

	test('Should return the last section for content after it', () => {
		// `Second` is depth 1, so it terminates `Nested` as well as `Root`, and
		// runs to the end of the text.
		const current = getCurrentSection(at('tail line'), text.length, sections);
		assert.strictEqual(current?.name, 'Second');
	});

	test('Should treat a section header line as inside its own section', () => {
		// The start offset is inclusive: the cursor parked on `## Nested ----`
		// itself resolves to Nested.
		const nested = sections.find(s => s.name === 'Nested')!;
		assert.strictEqual(getCurrentSection(nested.index, text.length, sections), nested);
	});

	test('Should return undefined at the very end of the text', () => {
		// PRE-EXISTING QUIRK, asserted deliberately rather than fixed: a section
		// ends *before* its terminator, and the final section's terminator is the
		// end of the text, so `offset === textLength` is inside nothing. Moving
		// the cursor to the last position in a file drops the highlight. Tracked
		// as its own issue; src-refactor-3 is a no-visible-behavior-change refactor.
		assert.strictEqual(getCurrentSection(text.length, text.length, sections), undefined);

		// One character earlier is still the last section — this is the EOF edge
		// alone, not a broken final section.
		assert.strictEqual(
			getCurrentSection(text.length - 1, text.length, sections)?.name,
			'Second'
		);
	});

	test('Should return undefined when there are no sections', () => {
		const plain = 'x = 1\n# just a comment\n';
		assert.strictEqual(
			getCurrentSection(3, plain.length, findSections(plain, 'python')),
			undefined
		);
	});

	test('Should resolve every offset to the same section the boundary rule implies', () => {
		// Brute-force cross-check of the one-scan implementation against the
		// definition it replaced: a section spans from its index until the next
		// section at the same or smaller depth (or the end of the text), and the
		// deepest match wins. Guards the "last section at or before the offset"
		// shortcut across every position in the fixture.
		for (let offset = 0; offset < text.length; offset++) {
			let expected: typeof sections[number] | undefined;
			for (const section of sections) {
				const next = sections.find(s => s.index > section.index && s.depth <= section.depth);
				const end = next ? next.index : text.length;
				if (offset >= section.index && offset < end) {
					if (!expected || section.depth > expected.depth) {
						expected = section;
					}
				}
			}
			assert.strictEqual(
				getCurrentSection(offset, text.length, sections),
				expected,
				`offset ${offset}`
			);
		}
	});
});
