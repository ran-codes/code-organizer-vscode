import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Hash Comment Tests (#)', () => {

	test('Should find basic hash sections', () => {
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
	});

	test('Should handle hash comment nesting (##, ###, ####)', () => {
		const text = `
# Level 1 ----
## Level 2 ----
### Level 3 ----
#### Level 4 ----
##### Level 5 (should be capped at 4) ----
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].depth, 3);
		assert.strictEqual(sections[3].depth, 4);
		assert.strictEqual(sections[4].depth, 4); // Capped at 4
	});

	test('Should create unique IDs for hash sections', () => {
		const text = `
# Test Section ----
## Sub Section ----
`;
		const sections = findSections(text);

		assert.strictEqual(sections.length, 2);
		assert.ok(sections[0].uniqueId.includes('Test Section'));
		assert.ok(sections[1].uniqueId.includes('Sub Section'));
		
		// Parent relationship should use unique ID
		assert.strictEqual(sections[1].parentName, sections[0].uniqueId);
	});

	test('Should handle duplicate hash section names', () => {
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
	});

	test('Should ignore invalid hash patterns', () => {
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
	});

	test('Should handle Python-style hash comments', () => {
		const text = `
# 1. Configuration ----
DATABASE_URL = "localhost"
API_KEY = "secret"

## 1.1 Database Settings ----
def connect_db():
    pass

## 1.2 API Settings ----
def call_api():
    pass

# 2. Utils ----
def helper():
    pass
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 4);

		const config = sections.find(s => s.name === '1. Configuration')!;
		const dbSettings = sections.find(s => s.name === '1.1 Database Settings')!;
		const apiSettings = sections.find(s => s.name === '1.2 API Settings')!;
		const utils = sections.find(s => s.name === '2. Utils')!;

		// Test parent relationships
		assert.strictEqual(config.parentName, undefined);
		assert.strictEqual(dbSettings.parentName, config.uniqueId);
		assert.strictEqual(apiSettings.parentName, config.uniqueId);
		assert.strictEqual(utils.parentName, undefined);
	});
});
