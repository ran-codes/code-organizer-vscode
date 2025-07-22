# Friendly Code Outlines

<p align="center">
  <img src="icon.png" alt="Friendly Code Outlines Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Code section navigation for VS Code</strong><br>
  Organize and navigate large files with simple comment patterns
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=ran-codes.friendly-code-outlines-vscode">
    <img src="https://img.shields.io/visual-studio-marketplace/v/ran-codes.friendly-code-outlines-vscode?style=flat-square&label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="VS Code Marketplace">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ran-codes.friendly-code-outlines-vscode">
    <img src="https://img.shields.io/visual-studio-marketplace/i/ran-codes.friendly-code-outlines-vscode?style=flat-square" alt="Installs">
  </a>
  <a href="https://github.com/ran-codes/friendly-code-outlines-vscode">
    <img src="https://img.shields.io/github/stars/ran-codes/friendly-code-outlines-vscode?style=flat-square" alt="GitHub Stars">
  </a>
</p>

## Features

Navigate large code files effortlessly with simple comment patterns that create a structured outline. Jump directly to any section with a single click instead of endless scrolling. Core features:


- **Simple syntax**: `# Section Name ----`
- **Hierarchical nesting**: `##`, `###`, `####`
- **VS Code integration**: Outline view, breadcrumbs, Go to Symbol
- **Multi-language support**: Works with any comment style
- **Zero configuration**: Works immediately  
- **Lightweight & fast**: Only responds to simple comments, no complex parsing

## Quick Start

**To use:**
1. Install the extension
2. Add comment sections ending with `----` (4 or more dashes) to trigger friendly outline
3. Check the **Outline** panel in VS Code's Explorer sidebar
4. Click any section to jump to it instantly


> **[GIF PLACEHOLDER - I will add the demo GIF here]**
> 
> *Demo showing: typing section comments → appearing in outline → clicking to navigate → nested sections across Python, JavaScript, and SQL*


## Language Support & Examples

### Supported Comment Styles

| Language | Comment Syntax | Nesting |
|----------|---------|---------|
| Python, R, Shell | `# Section ----` | `##`, `###`, `####` |
| JavaScript, TypeScript, C++, Java, Go, Rust | `// Section ----` | `////`, `//////`, `////////` |
| SQL, PostgreSQL | `-- Section ----` | `----`, `------`, `--------` |

**Works with:** Python • JavaScript • TypeScript • Java • C# • C++ • Go • Rust • Swift • PHP • SQL • R • Shell • and more...

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

| Feature | **Friendly Code Outlines** | Bookmarks | Better Comments | Region Folding |
|---------|----------------------------|-----------|-----------------|----------------|
| Automatic structure detection | ✅ | ❌ | ❌ | ❌ |
| Hierarchical organization | ✅ | ❌ | ❌ | ⚠️ |
| Multi-language support | ✅ | ✅ | ✅ | ⚠️ |
| Outline integration | ✅ | ❌ | ❌ | ❌ |
| Zero configuration | ✅ | ❌ | ❌ | ❌ |
| Comment-based | ✅ | ❌ | ✅ | ⚠️ |

## Installation

**VS Code Marketplace:** Open Extensions (Ctrl+Shift+X) → Search "Friendly Code Outlines" → Install

**Command Line:**
```bash
code --install-extension ran-codes.friendly-code-outlines-vscode
```

---

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

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
