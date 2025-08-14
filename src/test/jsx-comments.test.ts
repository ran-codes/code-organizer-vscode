import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('JSX Comments Test Suite', () => {
    test('Should detect basic JSX comment sections', () => {
        const text = `
import React from 'react';

{/* // Main Component ---- */}
function MyComponent() {
  return (
    <div>
      {/* // Header Section ---- */}
      <header>
        <h1>Title</h1>
      </header>
      
      {/* // Content Section ---- */}
      <main>
        <p>Content here</p>
      </main>
    </div>
  );
}
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 3);
        assert.strictEqual(sections[0].name, 'Main Component');
        assert.strictEqual(sections[0].depth, 1);
        assert.strictEqual(sections[1].name, 'Header Section');
        assert.strictEqual(sections[1].depth, 1);
        assert.strictEqual(sections[2].name, 'Content Section');
        assert.strictEqual(sections[2].depth, 1);
    });

    test('Should detect nested JSX comment sections', () => {
        const text = `
{/* // Main Layout ---- */}
function Layout() {
  return (
    <div>
      {/* //// Navigation ---- */}
      <nav>
        {/* ////// Menu Items ---- */}
        <ul>
          <li>Home</li>
          <li>About</li>
        </ul>
        
        {/* ////// User Actions ---- */}
        <div>
          <button>Login</button>
        </div>
      </nav>
      
      {/* //// Main Content ---- */}
      <main>
        <h1>Welcome</h1>
      </main>
    </div>
  );
}
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 5);
        
        // Main Layout (depth 1)
        assert.strictEqual(sections[0].name, 'Main Layout');
        assert.strictEqual(sections[0].depth, 1);
        
        // Navigation (depth 2)
        assert.strictEqual(sections[1].name, 'Navigation');
        assert.strictEqual(sections[1].depth, 2);
        assert.strictEqual(sections[1].parentName, sections[0].uniqueId);
        
        // Menu Items (depth 3)
        assert.strictEqual(sections[2].name, 'Menu Items');
        assert.strictEqual(sections[2].depth, 3);
        assert.strictEqual(sections[2].parentName, sections[1].uniqueId);
        
        // User Actions (depth 3)
        assert.strictEqual(sections[3].name, 'User Actions');
        assert.strictEqual(sections[3].depth, 3);
        assert.strictEqual(sections[3].parentName, sections[1].uniqueId);
        
        // Main Content (depth 2)
        assert.strictEqual(sections[4].name, 'Main Content');
        assert.strictEqual(sections[4].depth, 2);
        assert.strictEqual(sections[4].parentName, sections[0].uniqueId);
    });

    test('Should handle JSX comments with extra whitespace', () => {
        const text = `
{/*    //   Spaced Section   ----   */}
function Component() {
  return <div></div>;
}
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 1);
        assert.strictEqual(sections[0].name, 'Spaced Section');
        assert.strictEqual(sections[0].depth, 1);
    });

    test('Should ignore JSX comments without enough dashes', () => {
        const text = `
{/* // Invalid Section --- */}
{/* // Valid Section ---- */}
function Component() {
  return <div></div>;
}
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 1);
        assert.strictEqual(sections[0].name, 'Valid Section');
    });

    test('Should ignore JSX comments without proper format', () => {
        const text = `
{/* Regular comment */}
{/* // Section without dashes */}
{/* Section with dashes but no slashes ---- */}
{/* // Proper Section ---- */}
function Component() {
  return <div></div>;
}
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 1);
        assert.strictEqual(sections[0].name, 'Proper Section');
    });

    test('Should handle mixed comment styles in same file', () => {
        const text = `
// Traditional JS Comment ---- 
function helper() {}

{/* // JSX Comment Section ---- */}
function Component() {
  return (
    <div>
      {/* //// JSX Subsection ---- */}
      <span>Content</span>
    </div>
  );
}
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 3);
        assert.strictEqual(sections[0].name, 'Traditional JS Comment');
        assert.strictEqual(sections[0].depth, 1);
        assert.strictEqual(sections[1].name, 'JSX Comment Section');
        assert.strictEqual(sections[1].depth, 1);
        assert.strictEqual(sections[2].name, 'JSX Subsection');
        assert.strictEqual(sections[2].depth, 2);
        assert.strictEqual(sections[2].parentName, sections[1].uniqueId);
    });

    test('Should handle JSX comments in TSX files', () => {
        const text = `
import React from 'react';

interface Props {
  title: string;
}

{/* // Component Definition ---- */}
const MyComponent: React.FC<Props> = ({ title }) => {
  return (
    <div>
      {/* //// Props Display ---- */}
      <h1>{title}</h1>
      
      {/* //// Footer ---- */}
      <footer>
        <p>© 2025</p>
      </footer>
    </div>
  );
};
`;

        const sections = findSections(text);
        assert.strictEqual(sections.length, 3);
        assert.strictEqual(sections[0].name, 'Component Definition');
        assert.strictEqual(sections[0].depth, 1);
        assert.strictEqual(sections[1].name, 'Props Display');
        assert.strictEqual(sections[1].depth, 2);
        assert.strictEqual(sections[2].name, 'Footer');
        assert.strictEqual(sections[2].depth, 2);
    });
});
