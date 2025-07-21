import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('SQL Double Dash Comment Tests (--)', () => {

	test('Should find basic SQL double dash sections', () => {
		const text = `
-- Section One ----
CREATE TABLE users (id INT);

---- Subsection ----
ALTER TABLE users ADD COLUMN name VARCHAR(100);

-- Section Two ----
CREATE TABLE orders (id INT);
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

	test('Should handle SQL comment nesting (--, ----, ------, --------)', () => {
		const text = `
-- Level 1 ----
CREATE DATABASE test;

---- Level 2 ----
USE test;

------ Level 3 ----
CREATE TABLE test1 (id INT);

-------- Level 4 ----
INSERT INTO test1 VALUES (1);

---------- Level 5 (should be capped at 4) ----
SELECT * FROM test1;
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].depth, 3);
		assert.strictEqual(sections[3].depth, 4);
		assert.strictEqual(sections[4].depth, 4); // Capped at 4
	});

	test('Should create unique IDs for SQL sections', () => {
		const text = `
-- Database Setup ----
CREATE DATABASE myapp;

---- Tables ----
CREATE TABLE users (id INT);
`;
		const sections = findSections(text);

		assert.strictEqual(sections.length, 2);
		assert.ok(sections[0].uniqueId.includes('Database Setup'));
		assert.ok(sections[1].uniqueId.includes('Tables'));
		
		// Parent relationship should use unique ID
		assert.strictEqual(sections[1].parentName, sections[0].uniqueId);
	});

	test('Should handle comprehensive SQL example', () => {
		const text = `
-- 1. Database Setup ----
CREATE DATABASE myapp;
USE myapp;

---- 1.1 Tables ----
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    total DECIMAL(10,2)
);

-- 2. Queries ----
SELECT * FROM users;

---- 2.1 Joins ----
SELECT u.name, o.total 
FROM users u 
JOIN orders o ON u.id = o.user_id;

---- 2.2 Aggregations ----
SELECT COUNT(*) as user_count FROM users;
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		const dbSetup = sections.find(s => s.name === '1. Database Setup')!;
		const tables = sections.find(s => s.name === '1.1 Tables')!;
		const queries = sections.find(s => s.name === '2. Queries')!;
		const joins = sections.find(s => s.name === '2.1 Joins')!;
		const aggregations = sections.find(s => s.name === '2.2 Aggregations')!;

		// Test parent relationships
		assert.strictEqual(dbSetup.parentName, undefined);
		assert.strictEqual(tables.parentName, dbSetup.uniqueId);
		assert.strictEqual(queries.parentName, undefined);
		assert.strictEqual(joins.parentName, queries.uniqueId);
		assert.strictEqual(aggregations.parentName, queries.uniqueId);
	});

	test('Should ignore invalid SQL patterns', () => {
		const text = `
-- Too Short --
-- Valid Section ----
--NoSpaceSection----
-- ---- (no name)
--   ----
`;
		const sections = findSections(text);

		// Should only find the one valid section
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Valid Section');
	});

	test('Should handle SQL stored procedures and functions', () => {
		const text = `
-- Stored Procedures ----
DELIMITER //

---- User Procedures ----
CREATE PROCEDURE GetUser(IN user_id INT)
BEGIN
    SELECT * FROM users WHERE id = user_id;
END //

---- Order Procedures ----
CREATE PROCEDURE GetUserOrders(IN user_id INT)
BEGIN
    SELECT * FROM orders WHERE user_id = user_id;
END //

-- Functions ----
CREATE FUNCTION GetUserCount() RETURNS INT
BEGIN
    RETURN (SELECT COUNT(*) FROM users);
END //

DELIMITER ;
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 4);

		const procedures = sections.find(s => s.name === 'Stored Procedures')!;
		const userProcs = sections.find(s => s.name === 'User Procedures')!;
		const orderProcs = sections.find(s => s.name === 'Order Procedures')!;
		const functions = sections.find(s => s.name === 'Functions')!;

		// Test nesting
		assert.strictEqual(procedures.depth, 1);
		assert.strictEqual(userProcs.depth, 2);
		assert.strictEqual(orderProcs.depth, 2);
		assert.strictEqual(functions.depth, 1);

		// Test parent relationships
		assert.strictEqual(userProcs.parentName, procedures.uniqueId);
		assert.strictEqual(orderProcs.parentName, procedures.uniqueId);
		assert.strictEqual(functions.parentName, undefined);
	});
});
