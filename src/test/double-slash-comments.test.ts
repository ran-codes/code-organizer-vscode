import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Double Slash Comment Tests (//)', () => {

	test('Should find basic double slash sections', () => {
		const text = `
// Section One ----
const config = {};

//// Subsection ----
const api = {};

// Section Two ----
const utils = {};
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 3);

		assert.strictEqual(sections[0].name, 'Section One');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].name, 'Subsection');
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].name, 'Section Two');
		assert.strictEqual(sections[2].depth, 1);
	});

	test('Should handle double slash comment nesting (//, ////, //////, ////////)', () => {
		const text = `
// Level 1 ----
//// Level 2 ----
////// Level 3 ----
//////// Level 4 ----
////////// Level 5 (should be capped at 4) ----
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].depth, 3);
		assert.strictEqual(sections[3].depth, 4);
		assert.strictEqual(sections[4].depth, 4); // Capped at 4
	});

	test('Should create unique IDs for double slash sections', () => {
		const text = `
// App Configuration ----
const config = {};

//// Helper Functions ----
function getData() {}
`;
		const sections = findSections(text);

		assert.strictEqual(sections.length, 2);
		assert.ok(sections[0].uniqueId.includes('App Configuration'));
		assert.ok(sections[1].uniqueId.includes('Helper Functions'));
		
		// Parent relationship should use unique ID
		assert.strictEqual(sections[1].parentName, sections[0].uniqueId);
	});

	test('Should handle JavaScript-style comments', () => {
		const text = `
// 1. App Configuration ----
const config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000
};

//// 1.1 Helper Functions ----
function getData() {
    return fetch(config.apiUrl);
}

// 2. Main App ----
class App {
    constructor() {
        this.data = [];
    }
}

//// 2.1 Event Handlers ----
function handleClick(event) {
    console.log('Clicked:', event.target);
}
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 4);

		const appConfig = sections.find(s => s.name === '1. App Configuration')!;
		const helpers = sections.find(s => s.name === '1.1 Helper Functions')!;
		const mainApp = sections.find(s => s.name === '2. Main App')!;
		const eventHandlers = sections.find(s => s.name === '2.1 Event Handlers')!;

		// Test parent relationships
		assert.strictEqual(appConfig.parentName, undefined);
		assert.strictEqual(helpers.parentName, appConfig.uniqueId);
		assert.strictEqual(mainApp.parentName, undefined);
		assert.strictEqual(eventHandlers.parentName, mainApp.uniqueId);
	});

	test('Should handle TypeScript-style comments', () => {
		const text = `
// 1. TypeScript Application ----
interface User {
    id: number;
    name: string;
}

//// 1.1 User Service ----
class UserService {
    private users: User[] = [];
    
    public addUser(user: User): void {
        this.users.push(user);
    }
}

// 2. Utility Functions ----
function isValidEmail(email: string): boolean {
    return email.includes('@');
}
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 3);

		const tsApp = sections.find(s => s.name === '1. TypeScript Application')!;
		const userService = sections.find(s => s.name === '1.1 User Service')!;
		const utils = sections.find(s => s.name === '2. Utility Functions')!;

		// Test depths and relationships
		assert.strictEqual(tsApp.depth, 1);
		assert.strictEqual(userService.depth, 2);
		assert.strictEqual(utils.depth, 1);
		assert.strictEqual(userService.parentName, tsApp.uniqueId);
		assert.strictEqual(utils.parentName, undefined);
	});

	test('Should ignore invalid double slash patterns', () => {
		const text = `
// Too Short --
// Valid Section ----
//NoSpaceSection----
// ---- (no name)
//   ----
`;
		const sections = findSections(text);

		// Should only find the one valid section
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Valid Section');
	});

	test('Should handle mixed depth double slash comments', () => {
		const text = `
// Main Function ----
function main() {}

//// Helper 1 ----
function helper1() {}

////// Deep Helper ----
function deepHelper() {}

//// Helper 2 ----
function helper2() {}

// Another Main ----
function another() {}
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		const mainFunc = sections.find(s => s.name === 'Main Function')!
		const helper1 = sections.find(s => s.name === 'Helper 1')!;
		const deepHelper = sections.find(s => s.name === 'Deep Helper')!;
		const helper2 = sections.find(s => s.name === 'Helper 2')!;
		const anotherMain = sections.find(s => s.name === 'Another Main')!;

		// Test complex nesting relationships
		assert.strictEqual(mainFunc.parentName, undefined);
		assert.strictEqual(helper1.parentName, mainFunc.uniqueId);
		assert.strictEqual(deepHelper.parentName, helper1.uniqueId);
		assert.strictEqual(helper2.parentName, mainFunc.uniqueId);
		assert.strictEqual(anotherMain.parentName, undefined);
	});
});
