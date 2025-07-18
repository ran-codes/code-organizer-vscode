import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Extension Test Suite', () => {

	suite('findSections', () => {
		test('Should find basic hash sections with unique IDs', () => {
			const text = `
# Section One ----
Some content here
## Subsection ----
More content
# Section Two ----
Final content
`;
			const sections = findSections(text);
			assert.strictEqual(sections.length, 3);

			// Test basic properties
			assert.strictEqual(sections[0].name, 'Section One');
			assert.strictEqual(sections[0].depth, 1);
			assert.strictEqual(sections[1].name, 'Subsection');
			assert.strictEqual(sections[1].depth, 2);
			assert.strictEqual(sections[2].name, 'Section Two');
			assert.strictEqual(sections[2].depth, 1);

			// Test unique IDs are generated correctly
			assert.ok(sections[0].uniqueId.includes('Section One'));
			assert.ok(sections[1].uniqueId.includes('Subsection'));
			assert.ok(sections[2].uniqueId.includes('Section Two'));

			// Test parent relationships use unique IDs
			assert.strictEqual(sections[0].parentName, undefined);
			assert.strictEqual(sections[1].parentName, sections[0].uniqueId);
			assert.strictEqual(sections[2].parentName, undefined);
		});

		test('Should handle sections with same names but different locations', () => {
			const text = `
# Helper Functions ----
def helper1():
    pass

# Main Code ----
# Helper Functions ----
def helper2():
    pass
`;
			const sections = findSections(text);
			assert.strictEqual(sections.length, 3);

			// Both "Helper Functions" sections should exist
			const helperSections = sections.filter(s => s.name === 'Helper Functions');
			assert.strictEqual(helperSections.length, 2);

			// They should have different unique IDs
			assert.notStrictEqual(helperSections[0].uniqueId, helperSections[1].uniqueId);

			// The unique IDs should contain both name and index
			assert.ok(helperSections[0].uniqueId.includes('Helper Functions'));
			assert.ok(helperSections[1].uniqueId.includes('Helper Functions'));
		});

		test('Should handle nested sections with parent unique IDs', () => {
			const text = `
# Main Section ----
## Sub Section One ----
### Deep Section ----
## Sub Section Two ----
# Another Main ----
## Another Sub ----
`;
			const sections = findSections(text);
			assert.strictEqual(sections.length, 6);

			// Find sections by name for easier testing
			const mainSection = sections.find(s => s.name === 'Main Section')!;
			const subOne = sections.find(s => s.name === 'Sub Section One')!;
			const deepSection = sections.find(s => s.name === 'Deep Section')!;
			const subTwo = sections.find(s => s.name === 'Sub Section Two')!;
			const anotherMain = sections.find(s => s.name === 'Another Main')!;
			const anotherSub = sections.find(s => s.name === 'Another Sub')!;

			// Test parent relationships use unique IDs
			assert.strictEqual(mainSection.parentName, undefined);
			assert.strictEqual(subOne.parentName, mainSection.uniqueId);
			assert.strictEqual(deepSection.parentName, subOne.uniqueId);
			assert.strictEqual(subTwo.parentName, mainSection.uniqueId);
			assert.strictEqual(anotherMain.parentName, undefined);
			assert.strictEqual(anotherSub.parentName, anotherMain.uniqueId);
		});

		test('Should ignore invalid patterns', () => {
			const text = `
# Too Short --
# Valid Section ----
#NoSpaceSection----
# ---- (no name)
#   ----
`;
			const sections = findSections(text);

			// Should only find the one valid section
			assert.strictEqual(sections.length, 1);
			assert.strictEqual(sections[0].name, 'Valid Section');
			assert.ok(sections[0].uniqueId.includes('Valid Section'));
		});

		test('Should handle empty input', () => {
			const sections = findSections('');
			assert.strictEqual(sections.length, 0);
		});

		test('Should create unique IDs with correct format', () => {
			const text = `# Test Section ----`;
			const sections = findSections(text);

			assert.strictEqual(sections.length, 1);
			const section = sections[0];

			// Unique ID should be name + underscore + index
			assert.ok(section.uniqueId.startsWith('Test Section_'));
			assert.ok(section.uniqueId.includes(section.index.toString()));
		});

		test('Should handle complex nesting scenarios', () => {
			const text = `
# Database Layer ----
## Connection ----
### Pool Management ----
### Error Handling ----
## Queries ----
### SELECT Helpers ----
### INSERT Helpers ----
# API Layer ----
## Authentication ----
## Routes ----
`;
			const sections = findSections(text);
			assert.strictEqual(sections.length, 10);

			// Find key sections
			const dbLayer = sections.find(s => s.name === 'Database Layer')!;
			const connection = sections.find(s => s.name === 'Connection')!;
			const poolMgmt = sections.find(s => s.name === 'Pool Management')!;
			const queries = sections.find(s => s.name === 'Queries')!;
			const selectHelpers = sections.find(s => s.name === 'SELECT Helpers')!;
			const apiLayer = sections.find(s => s.name === 'API Layer')!;
			const auth = sections.find(s => s.name === 'Authentication')!;

			// Test the hierarchy
			assert.strictEqual(dbLayer.parentName, undefined);
			assert.strictEqual(connection.parentName, dbLayer.uniqueId);
			assert.strictEqual(poolMgmt.parentName, connection.uniqueId);
			assert.strictEqual(queries.parentName, dbLayer.uniqueId);
			assert.strictEqual(selectHelpers.parentName, queries.uniqueId);
			assert.strictEqual(apiLayer.parentName, undefined);
			assert.strictEqual(auth.parentName, apiLayer.uniqueId);
		});
	});
});