import * as assert from 'assert';
import { findSections } from '../utils/findSections';

/**
 * Cross-cutting suite: files that mix two comment styles.
 *
 * Every other syntax suite exercises one entry of `COMMENT_PATTERNS` at a time,
 * and within a single pattern pass the matches are already in document order —
 * so none of them can catch a parent resolved against a *pattern*-ordered array.
 * That gap is what #54 was: `findSections` walks one pattern across the whole
 * text before starting the next, so a section whose nearest shallower neighbour
 * comes from an earlier-listed pattern used to bind to that pattern's
 * last-pushed match rather than its nearest preceding one — a parent starting
 * further *down* the document.
 *
 * These tests exist to fail if parent resolution ever moves back inside the
 * match loop. Each fixture puts the correct parent somewhere other than last in
 * push order, which is the one shape a single-syntax suite cannot produce.
 */
suite('Mixed Comment Syntax Test Suite', () => {
    test('JSX subsection nests under the preceding // section, not a later one (#54)', () => {
        // The reproduction from #54, verbatim. `//` is listed before JSX in
        // COMMENT_PATTERNS, so at the moment "Sub of A" matched, both "Part A"
        // and "Part B" were already pushed and "Part B" was last.
        const text = `// Part A ----
const a = 1;

{/* //// Sub of A ---- */}
const b = 2;

// Part B ----
const c = 3;
`;
        const sections = findSections(text, 'typescriptreact');

        assert.strictEqual(sections.length, 3);

        // Document order, which the sort has always guaranteed.
        assert.strictEqual(sections[0].name, 'Part A');
        assert.strictEqual(sections[1].name, 'Sub of A');
        assert.strictEqual(sections[2].name, 'Part B');

        assert.strictEqual(sections[0].depth, 1);
        assert.strictEqual(sections[1].depth, 2);
        assert.strictEqual(sections[2].depth, 1);

        // The actual regression: the parent is the section *above* it.
        assert.strictEqual(sections[1].parentId, sections[0].uniqueId);
        assert.notStrictEqual(sections[1].parentId, sections[2].uniqueId);

        // Roots stay parentless.
        assert.strictEqual(sections[0].parentId, undefined);
        assert.strictEqual(sections[2].parentId, undefined);
    });

    test('Same shape with # parents and a // child — not JSX-specific (#54)', () => {
        // `#` is listed before `//`, so this is the same ordering bug reached
        // through a different pair of patterns. Kept because a fix that special-
        // cased JSX would pass the test above and fail this one.
        const text = `# Part A ----
value = 1

//// Sub of A ----
value = 2

# Part B ----
value = 3
`;
        const sections = findSections(text, 'plaintext');

        assert.strictEqual(sections.length, 3);
        assert.strictEqual(sections[0].name, 'Part A');
        assert.strictEqual(sections[1].name, 'Sub of A');
        assert.strictEqual(sections[2].name, 'Part B');

        assert.strictEqual(sections[1].depth, 2);
        assert.strictEqual(sections[1].parentId, sections[0].uniqueId);
        assert.notStrictEqual(sections[1].parentId, sections[2].uniqueId);
    });

    test('Parent is the nearest preceding shallower section across three styles', () => {
        // Interleaves `#`, `//` and JSX so that for each child the correct
        // parent is neither the first nor the last match of its own pattern.
        const text = `# Root One ----
{/* //// Child Of Root One ---- */}

// Root Two ----
{/* //// Child Of Root Two ---- */}

# Root Three ----
{/* //// Child Of Root Three ---- */}
`;
        const sections = findSections(text, 'typescriptreact');

        assert.strictEqual(sections.length, 6);

        const [rootOne, childOne, rootTwo, childTwo, rootThree, childThree] = sections;

        assert.strictEqual(rootOne.name, 'Root One');
        assert.strictEqual(childOne.name, 'Child Of Root One');
        assert.strictEqual(rootTwo.name, 'Root Two');
        assert.strictEqual(childTwo.name, 'Child Of Root Two');
        assert.strictEqual(rootThree.name, 'Root Three');
        assert.strictEqual(childThree.name, 'Child Of Root Three');

        assert.strictEqual(childOne.parentId, rootOne.uniqueId);
        assert.strictEqual(childTwo.parentId, rootTwo.uniqueId);
        assert.strictEqual(childThree.parentId, rootThree.uniqueId);
    });

    test('Resolution skips past both a deeper section and a same-depth sibling', () => {
        // `Child B` follows `Grandchild` (deeper) and `Child A` (its equal), and
        // has to skip both to reach `Root One` — three matches back and from the
        // *other* pattern. That shape fails for an inline scan and also for any
        // "nearest preceding match regardless of depth" shortcut.
        const text = `// Root One ----
{/* //// Child A ---- */}
{/* ////// Grandchild ---- */}
{/* //// Child B ---- */}

// Root Two ----
`;
        const sections = findSections(text, 'jsx');

        assert.strictEqual(sections.length, 5);

        const [rootOne, childA, grandchild, childB, rootTwo] = sections;

        assert.strictEqual(rootOne.name, 'Root One');
        assert.strictEqual(childA.name, 'Child A');
        assert.strictEqual(grandchild.name, 'Grandchild');
        assert.strictEqual(childB.name, 'Child B');
        assert.strictEqual(rootTwo.name, 'Root Two');

        assert.strictEqual(rootOne.depth, 1);
        assert.strictEqual(childA.depth, 2);
        assert.strictEqual(grandchild.depth, 3);
        assert.strictEqual(childB.depth, 2);

        // Grandchild takes the section directly above it. childB skips over
        // Grandchild (deeper) and childA (equal) to land on Root One.
        assert.strictEqual(grandchild.parentId, childA.uniqueId);
        assert.strictEqual(childA.parentId, rootOne.uniqueId);
        assert.strictEqual(childB.parentId, rootOne.uniqueId);
        assert.notStrictEqual(childB.parentId, grandchild.uniqueId);
        assert.notStrictEqual(childB.parentId, childA.uniqueId);
        assert.notStrictEqual(childB.parentId, rootTwo.uniqueId);
    });

    test('Duplicate names across two styles stay individually addressable', () => {
        // `uniqueId` is `${name}_${index}`, so the two "Setup" sections differ
        // only by offset. A child must bind to the one above it, and the fix
        // must not collapse them by name.
        const text = `# Setup ----
{/* //// From Hash Setup ---- */}

// Setup ----
{/* //// From Slash Setup ---- */}
`;
        const sections = findSections(text, 'typescriptreact');

        const hashSetup = sections[0];
        const fromHash = sections[1];
        const slashSetup = sections[2];
        const fromSlash = sections[3];

        assert.strictEqual(hashSetup.name, 'Setup');
        assert.strictEqual(slashSetup.name, 'Setup');
        assert.notStrictEqual(hashSetup.uniqueId, slashSetup.uniqueId);

        assert.strictEqual(fromHash.parentId, hashSetup.uniqueId);
        assert.strictEqual(fromSlash.parentId, slashSetup.uniqueId);
    });

    test('A parentless deep section stays parentless when a later root exists', () => {
        // Opening the file at depth 2 leaves nothing shallower before it. The
        // pattern-ordered scan would have handed it the `//` root below.
        const text = `{/* //// Orphan ---- */}
const a = 1;

// Later Root ----
const b = 2;
`;
        const sections = findSections(text, 'typescriptreact');

        assert.strictEqual(sections[0].name, 'Orphan');
        assert.strictEqual(sections[0].depth, 2);
        assert.strictEqual(sections[0].parentId, undefined);
        assert.strictEqual(sections[1].name, 'Later Root');
    });
});
