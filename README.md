# Code Organizer

<p align="center">
  <img src="icon_v2.png" alt="Code Organizer Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Code section navigation for VS Code</strong><br>
  Organize and navigate large files with simple comment patterns
</p>


## Features

Transform your code files into organized, navigable documents with a table of contents-like structure. Create sections using simple comments, then use VS Code's built-in Outline panel to view and instantly jump to any section with a single click.

- **Simple syntax**: `# Section Name ----`
- **Table of contents experience**: Comments become navigable outline entries
- **Hierarchical nesting**: `##`, `###`, `####` for multi-level organization
- **Multi-language support**: Works with any comment style including JSX `{/* // Section ---- */}`
- **Lightweight & fast**: Only responds to simple comments, no complex parsing
- **VS Code integration**: Seamless outline view, breadcrumbs, and Go to Symbol
- **Zero configuration**: Works immediately
  
<img src="./assets/images/snip_demo_python_v2.png" alt="Code Organizer Snip Demo Python" >






## Quick Start

**To use:**
1. Install the extension
2. Open any code file (or create a new one)
3. Add comment sections ending with `----` (4 or more dashes) to trigger code organization
4. Check the **Outline** panel in VS Code's Explorer sidebar
5. Click any section to jump to it instantly

**Tip**: Use Command Palette (Ctrl+Shift+P / Cmd+Shift+P) → `Code Organizer: Show Code Organizer` to quickly open the view

![Code Organizer Demo](./assets/images/demo_v2.gif)





## Language Support & Examples

| Language | Example | Nesting |
|----------|---------|---------|
| Python, R, Shell | `# Section ----` | `##`, `###`, `####` |
| JavaScript, TypeScript, C++, Java, Go, Rust | `// Section ----` | `////`, `//////`, `////////` |
| React JSX, TSX | `{/* // Section ---- */}` | `{/* //// */}`, `{/* ////// */}` |
| SQL, PostgreSQL | `-- Section ----` | `----`, `------`, `--------` |
| Mermaid | `%% # Section ----` | `%% ##`, `%% ###`, `%% ####` |

**Works with:** Python • JavaScript • TypeScript • **React/JSX** • Java • C# • C++ • Go • Rust • Swift • PHP • SQL • R • Shell • **Mermaid** • and more...

### Python Example


```python
# 1. Configuration ----
DATABASE_URL = "localhost"
API_KEY = "secret"

## 1.1 Database Settings ----
def connect():
    return db.connect(DATABASE_URL)

### 1.1.1 Connection Pool ----
def create_pool():
    return ConnectionPool()

## 1.2 API Settings ----
def setup_api():
    return API(API_KEY)

# 2. Main Application ----
def run():
    db = connect()
    api = setup_api()
```

### React/JSX Example

```jsx
{/* // 1. Component Setup ---- */}
import React, { useState, useEffect } from 'react';

function TodoApp() {
  {/* // 1.1 State Management ---- */}
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');

  {/* //// 1.1.1 Todo Operations ---- */}
  const addTodo = (text) => {
    setTodos([...todos, { id: Date.now(), text, done: false }]);
  };

  {/* // 2. Render Logic ---- */}
  return (
    <div className="todo-app">
      {/* // 2.1 Header Section ---- */}
      <header>
        <h1>Todo List</h1>
        <TodoInput onAdd={addTodo} />
      </header>

      {/* // 2.2 Main Content ---- */}
      <main>
        <TodoList todos={filteredTodos} />
        <TodoFilters currentFilter={filter} onFilterChange={setFilter} />
      </main>
    </div>
  );
}
```

### JavaScript Example

```javascript
// 1. App Configuration ----
const config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000
};

//// 1.1 Helper Functions ----
function getData() {
    return fetch(config.apiUrl);
}

function processData(data) {
    return data.map(item => item.value);
}

// 2. Main Application ----
class App {
    constructor() {
        this.data = [];
    }
    
    //// 2.1 Event Handlers ----
    handleClick(event) {
        console.log('Clicked:', event.target);
    }
}
```

### SQL Example

```sql
-- 1. Database Setup ----
CREATE DATABASE myapp;
USE myapp;

---- 1.1 Tables ----
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255)
);

------ 1.1.1 Indexes ----
CREATE INDEX idx_user_email ON users(email);

---- 1.2 Stored Procedures ----
DELIMITER $$
CREATE PROCEDURE GetUser(IN user_id INT)
BEGIN
    SELECT * FROM users WHERE id = user_id;
END$$
DELIMITER ;

-- 2. Sample Data ----
INSERT INTO users VALUES (1, 'John Doe', 'john@example.com');
```

### Mermaid Example

Mermaid comments start with `%%`, so the depth comes from the hashes that follow it.
`%%{init: ...}%%` directives are left alone.

```
%%{init: {'theme': 'default'}}%%
flowchart TD

%% # 1. Ingest ----
    csv[CSV drop] --> load[Load raw]

%% ## 1.1 Validation ----
    load --> schema{Schema ok?}
    schema -->|no| reject[Quarantine]

%% # 2. Output ----
    schema -->|yes| warehouse[(Warehouse)]
```

## Settings

The extension works with zero configuration. These settings are there when you want to change something — set them in Settings (Ctrl+,) under "Code Organizer", or in `settings.json`.

| Setting | Default | What it does |
|---------|---------|--------------|
| `codeOrganizer.enable` | `true` | Turn the extension on or off. |
| `codeOrganizer.supportedLanguages` | `["*"]` | Languages to parse. `*` means every language; otherwise list them individually, e.g. `["python", "javascript"]`. |
| `codeOrganizer.minDashes` | `4` | How many trailing dashes a comment needs before it counts as a section. Minimum `2`. |
| `codeOrganizer.maxNestingLevel` | `4` | Deepest nesting level to show, `1`–`6`. |
| `codeOrganizer.showIcons` | `true` | Show the depth icon before each section name in the Code Organizer view. Turn it off for a text-only outline. |

`showIcons` covers the Code Organizer view only. The built-in Outline and breadcrumbs draw their own icons — use VS Code's `outline.icons` and `breadcrumbs.icons` for those.

## Why Use This Extension?

### The Problem
- **Large files are hard to navigate** - scrolling through 1000+ line files
- **VS Code's outline only shows functions/classes** - not logical code sections
- **No consistent organization** across different programming languages
- **Lost context** when jumping between different parts of complex files

### Our Solution
Simple, universal comment patterns that work everywhere with instant VS Code integration.

Perfect for polyglot developers working across multiple programming languages.

### Comparison with Alternatives

| Feature | **Code Organizer** | Bookmarks | Better Comments | Region Folding |
|---------|----------------------------|-----------|-----------------|----------------|
| Automatic structure detection | ✅ | ❌ | ❌ | ❌ |
| Hierarchical organization | ✅ | ❌ | ❌ | ⚠️ |
| Multi-language support | ✅ | ✅ | ✅ | ⚠️ |
| Outline integration | ✅ | ❌ | ❌ | ❌ |
| Zero configuration | ✅ | ❌ | ❌ | ❌ |
| Comment-based | ✅ | ❌ | ✅ | ⚠️ |

## Installation

**VS Code Marketplace:** Open Extensions (Ctrl+Shift+X) → Search "Code Organizer" → Install

**Command Line:**
```bash
code --install-extension ran-codes.code-organizer-vscode
```

---

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

### 0.2.0 - Latest
- **🆕 `showIcons` Setting**: Turn off the depth icons for a text-only Code Organizer view
- **🆕 Mermaid Support**: `%% # Section ----` comments create sections in `.mmd` diagrams
- Text selection is visible again on section comment lines
- Correct nesting in files that mix two comment styles
- Section highlight holds when the cursor sits at the end of a file
- Sections sharing a name with their parent no longer disappear from the Outline
- YAML front matter and unclosed code fences no longer break Markdown/Quarto parsing

### 0.1.0
- **🆕 Custom Activity Bar View**: Dedicated Code Organizer tab with custom icon
- **🆕 Editor-Outline Sync**: Auto-scroll outline view as you navigate through code
- **🆕 "Show Code Organizer" Command**: Quick access via Command Palette
- **🆕 High Resolution Icon**: Professional hexagon design for marketplace
- Enhanced TreeView with caching for reliable navigation
- Improved section highlighting with visual decorations

### 0.0.5
- **🆕 Markdown & Quarto Support**: Native header detection for `.md` and `.qmd` files
- Smart code chunk handling - ignores headers inside fenced code blocks
- Language-specific parsing for markdown documents
- Perfect for data science workflows in Posit/VSCode

### 0.0.4
- **Cursor Compatibility**: Downgraded VSCode engine to ^1.99.0 for broader editor support

### 0.0.3
- **🆕 JSX/TSX Support**: Added React JSX comment syntax `{/* // Section ---- */}`
- Enhanced regex pattern to handle whitespace variations in JSX comments
- Improved language support for React and TypeScript React developers
- Comprehensive test coverage for JSX comment detection

### 0.0.1 - Initial Release
- Support for `#`, `//`, and `--` comment styles
- Hierarchical section nesting up to 4 levels
- VS Code outline integration
- Multi-language support
- Zero configuration setup

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

<p align="center">
  <em>Inspired by RStudio's Code Sections • Built with ❤️ for the VS Code community</em>
</p>
