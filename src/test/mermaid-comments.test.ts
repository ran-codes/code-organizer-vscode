import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Mermaid Comment Tests (%%)', () => {

	test('Should find basic mermaid sections', () => {
		const text = `
%% # Section One ----
flowchart TD
%% ## Subsection ----
    A --> B
%% # Section Two ----
    B --> C
`;
		const sections = findSections(text, 'mermaid');
		assert.strictEqual(sections.length, 3);

		assert.strictEqual(sections[0].name, 'Section One');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].name, 'Subsection');
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].name, 'Section Two');
		assert.strictEqual(sections[2].depth, 1);
	});

	test('Should handle mermaid comment nesting (%% #, %% ##, %% ###, %% ####)', () => {
		const text = `
%% # Level 1 ----
%% ## Level 2 ----
%% ### Level 3 ----
%% #### Level 4 ----
%% ##### Level 5 (should be capped at 4) ----
`;
		const sections = findSections(text, 'mermaid');
		assert.strictEqual(sections.length, 5);

		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].depth, 3);
		assert.strictEqual(sections[3].depth, 4);
		assert.strictEqual(sections[4].depth, 4); // Capped at 4

		// Depth comes from the hashes, and the hash token is bounded at 4
		// (`#{1,4}`) exactly like the plain hash style — so the 5th `#` is not
		// consumed by the token group and stays part of the parsed name.
		// Asserting the name keeps an unbounded `(#+)` from silently changing
		// output; `hash-comments.test.ts` makes the same assertion.
		assert.strictEqual(sections[3].name, 'Level 4');
		assert.strictEqual(sections[4].name, '# Level 5 (should be capped at 4)');
	});

	test('Should create unique IDs for mermaid sections', () => {
		const text = `
%% # Test Section ----
%% ## Sub Section ----
`;
		const sections = findSections(text, 'mermaid');

		assert.strictEqual(sections.length, 2);
		assert.ok(sections[0].uniqueId.includes('Test Section'));
		assert.ok(sections[1].uniqueId.includes('Sub Section'));

		// Parent relationship should use unique ID
		assert.strictEqual(sections[1].parentId, sections[0].uniqueId);
	});

	test('Should handle duplicate mermaid section names', () => {
		const text = `
%% # Styling ----
    classDef a fill:#f00
%% # Nodes ----
%% # Styling ----
    classDef b fill:#0f0
`;
		const sections = findSections(text, 'mermaid');
		assert.strictEqual(sections.length, 3);

		const styling = sections.filter(s => s.name === 'Styling');
		assert.strictEqual(styling.length, 2);
		assert.notStrictEqual(styling[0].uniqueId, styling[1].uniqueId);
	});

	test('Should ignore invalid mermaid patterns', () => {
		const text = `
%% # Too Short --
%% # Valid Section ----
%% Name Without Hashes ----
%% # ----
%%   ----
%% just an ordinary mermaid comment
`;
		const sections = findSections(text, 'mermaid');

		// Only the one valid section. Note `%% Name Without Hashes ----` is
		// deliberately NOT a section: the bare `%%` form (no hashes) is out of
		// scope for #43, so it must not match.
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Valid Section');
	});

	test('Should not span lines between %% and the hashes', () => {
		// The gap is `[ \t]*`, not `\s*`, because `\s` matches `\n`. With `\s*` this
		// bare `%%` binds to the header two lines down and emits a second,
		// newline-spanning section beside the hash pattern's own match for it —
		// duplicate outline entries whose index points at the `%%`, not the header.
		// Reachable well outside Mermaid, since the table is deliberately not
		// language-gated: `%%` is an Octave/MATLAB cell divider, and Octave also
		// takes `#` comments.
		const text = `%%

# Load data ----
x = 1
`;
		const sections = findSections(text, 'plaintext');

		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Load data');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[0].index, text.indexOf('# Load data'));
		assert.ok(
			!sections[0].fullText.startsWith('%%'),
			'the match must not reach back to the bare %% line'
		);
	});

	test('Should not span lines when the %% line carries hashes', () => {
		// The shape a buffer is in the instant someone has typed `%% # ` and not yet
		// the name. The extension reparses per document.version, so with a `\s*`
		// name gap this fires live while typing: the pattern reaches the *next*
		// line, and because /g leaves lastIndex past it, the real section on that
		// line never matches at all — it vanishes from the outline rather than
		// merely gaining a duplicate.
		const typing = '%% # \n%% # 1. Ingest ----\n';
		let sections = findSections(typing, 'plaintext');
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, '1. Ingest');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[0].index, typing.indexOf('%% # 1. Ingest'));

		// Same shape as a leftover divider line, and at depth 4 the bogus match
		// also reported the wrong depth.
		const divider = '%% ####\n%% # Setup ----\n';
		sections = findSections(divider, 'plaintext');
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Setup');
		assert.strictEqual(sections[0].depth, 1);

		// And the duplicate direction: a `%% #` line above a plain hash header.
		const mixed = '%% #\n## Load data ----\nx = 1\n';
		sections = findSections(mixed, 'plaintext');
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Load data');
		assert.strictEqual(sections[0].depth, 2);
	});

	test('Known limitation (#56): a bare # line above a %% section still duplicates', () => {
		// Asserted on purpose, not aspirationally. This one is the *hash* pattern
		// reaching across the newline to grab the `%%` line below it, so tightening
		// the Mermaid entry cannot close it — only changing dashSource's default
		// name gap can, which would alter parsing for #, //, -- and JSX at once.
		// Deliberately out of scope for #43; #56 carries the reproductions.
		// If #56 is fixed, this test should flip to a single `Setup` section.
		const text = '#\n%% # Setup ----\n';
		const sections = findSections(text, 'plaintext');

		assert.strictEqual(sections.length, 2);
		assert.strictEqual(sections[0].name, '%% # Setup');   // the hash pattern's cross-line reach
		assert.strictEqual(sections[1].name, 'Setup');        // the correct Mermaid match
	});

	test('Should still allow spaces, tabs, or nothing between %% and the hashes', () => {
		// The guard against `\s*` above must not over-narrow: every same-line gap
		// stays legal.
		const text = [
			'%% # Spaced ----',
			'%%\t## Tabbed ----',
			'%%### Tight ----',
			'%%  \t #### Mixed ----',
		].join('\n');
		const sections = findSections(text, 'mermaid');

		assert.strictEqual(sections.length, 4);
		assert.deepStrictEqual(
			sections.map(s => [s.name, s.depth]),
			[['Spaced', 1], ['Tabbed', 2], ['Tight', 3], ['Mixed', 4]]
		);
	});

	test('Should not match mermaid init directives', () => {
		const text = `
%%{init: {'theme':'dark'}}%%
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#fff'}}}%%
%% # Real Section ----
sequenceDiagram
    Alice->>John: Hello John
    John-->>Alice: Great!
`;
		const sections = findSections(text, 'mermaid');

		// Directives carry no `----` terminator, and the arrow syntax never
		// starts a line with dashes, so neither produces a section.
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Real Section');
	});

	test('Should handle indented mermaid comments with spaces and tabs', () => {
		const text = `
%% # 1. Diagram ----
flowchart TD

    %% ## 1.1 Ingest ----
    A[Source] --> B[Parser]

        %% ### 1.1.1 Validation ----
        B --> C{Valid?}

\t%% ## 1.2 Output ----
\tC -->|yes| D[Sink]

%% # 2. Styling ----
    classDef done fill:#0f0
`;
		const sections = findSections(text, 'mermaid');
		assert.strictEqual(sections.length, 5);

		const diagram = sections.find(s => s.name === '1. Diagram')!;
		const ingest = sections.find(s => s.name === '1.1 Ingest')!;
		const validation = sections.find(s => s.name === '1.1.1 Validation')!;
		const output = sections.find(s => s.name === '1.2 Output')!;
		const styling = sections.find(s => s.name === '2. Styling')!;

		assert.strictEqual(diagram.depth, 1);
		assert.strictEqual(ingest.depth, 2);
		assert.strictEqual(validation.depth, 3);
		assert.strictEqual(output.depth, 2);
		assert.strictEqual(styling.depth, 1);

		assert.strictEqual(diagram.parentId, undefined);
		assert.strictEqual(ingest.parentId, diagram.uniqueId);
		assert.strictEqual(validation.parentId, ingest.uniqueId);
		assert.strictEqual(output.parentId, diagram.uniqueId);
		assert.strictEqual(styling.parentId, undefined);
	});

	test('Should parse a realistic mermaid diagram', () => {
		const text = `%%{init: {'theme':'dark'}}%%
flowchart TD

%% # 1. Input ----
    csv[CSV file] --> load[Load]

%% ## 1.1 Validation ----
    load --> check{Schema ok?}
    check -->|no| fail[Reject]

%% # 2. Transform ----
    check -->|yes| clean[Clean]
    clean --> agg[Aggregate]

%% # 3. Output ----
    agg --> db[(Warehouse)]
`;
		const sections = findSections(text, 'mermaid');
		assert.strictEqual(sections.length, 4);

		assert.strictEqual(sections[0].name, '1. Input');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].name, '1.1 Validation');
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].name, '2. Transform');
		assert.strictEqual(sections[2].depth, 1);
		assert.strictEqual(sections[3].name, '3. Output');
		assert.strictEqual(sections[3].depth, 1);

		assert.strictEqual(sections[1].parentId, sections[0].uniqueId);
		assert.strictEqual(sections[2].parentId, undefined);
	});

	test('Should parse mermaid sections regardless of languageId', () => {
		const text = `
%% # Section One ----
flowchart TD
%% ## Subsection ----
    A --> B
`;
		// `.mmd` files open as `plaintext` unless a Mermaid language extension is
		// installed, and `COMMENT_PATTERNS` is deliberately not language-gated —
		// this is what makes the feature work out of the box (#43).
		const asPlaintext = findSections(text, 'plaintext');
		const asMermaid = findSections(text, 'mermaid');
		const noLanguage = findSections(text);

		for (const sections of [asPlaintext, asMermaid, noLanguage]) {
			assert.strictEqual(sections.length, 2);
			assert.strictEqual(sections[0].name, 'Section One');
			assert.strictEqual(sections[0].depth, 1);
			assert.strictEqual(sections[1].name, 'Subsection');
			assert.strictEqual(sections[1].depth, 2);
		}
	});

	test('Should coexist with plain hash sections in the same file', () => {
		const text = `
# Plain Hash Section ----
%% # Mermaid Section ----
%% ## Mermaid Sub ----
`;
		const sections = findSections(text, 'mermaid');

		// Both styles match and both are kept — the `%%` form is a separate
		// section, not a duplicate of the hash one. Only count, names and depths
		// are asserted here: `parentId` across two different comment styles is
		// governed by a pre-existing quirk unrelated to #43 (see issue #54).
		assert.strictEqual(sections.length, 3);
		assert.strictEqual(sections[0].name, 'Plain Hash Section');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].name, 'Mermaid Section');
		assert.strictEqual(sections[1].depth, 1);
		assert.strictEqual(sections[2].name, 'Mermaid Sub');
		assert.strictEqual(sections[2].depth, 2);
	});
});
