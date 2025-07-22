# Friendly Code Outlines

<p align="center">
  <img src="icon.png" alt="Friendly Code Outlines Logo" width="128" height="128">
</p>

<p align="center">
  <strong>RStudio-style code section navigation for VS Code</strong><br>
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

## 🎬 See It In Action

> **[GIF PLACEHOLDER - I will add the demo GIF here]**
> 
> *Demo showing: typing section comments → appearing in outline → clicking to navigate → nested sections across Python, JavaScript, and SQL*

## ✨ Features & Quick Start

### Core Features
- **RStudio-inspired syntax**: `# Section Name ----`
- **Hierarchical nesting**: `##`, `###`, `####`
- **Multi-language support**: Works with any comment style
- **Lightweight & fast**: Only responds to simple comments, no complex parsing
- **VS Code integration**: Outline view, breadcrumbs, Go to Symbol
- **Zero configuration**: Works immediately

### 🚀 Quick Start

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

**To use:**
1. Add comment sections ending with `----` (4 or more dashes)
2. Check the **Outline** panel in VS Code's Explorer sidebar
3. Click any section to jump to it instantly

## 🌍 Language Support & Examples

### Supported Comment Styles

| Language | Example | Nesting |
|----------|---------|---------|
| Python, R, Shell | `# Section ----` | `##`, `###`, `####` |
| JavaScript, TypeScript, C++, Java, Go, Rust | `// Section ----` | `////`, `//////`, `////////` |
| SQL, PostgreSQL | `-- Section ----` | `----`, `------`, `--------` |

**Works with:** Python • JavaScript • TypeScript • Java • C# • C++ • Go • Rust • Swift • PHP • SQL • R • Shell • and more...

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

## 🤔 Why Use This Extension?

### The Problem
- **Large files are hard to navigate** - scrolling through 1000+ line files
- **VS Code's outline only shows functions/classes** - not logical code sections
- **No consistent organization** across different programming languages
- **Lost context** when jumping between different parts of complex files

### Our Solution
Simple, universal comment patterns that work everywhere with instant VS Code integration.

**Inspired by RStudio's Code Sections** - beloved by data scientists for organizing R scripts into navigable sections.

### Comparison with Alternatives

| Feature | **Friendly Code Outlines** | Bookmarks | Better Comments | Region Folding |
|---------|----------------------------|-----------|-----------------|----------------|
| Automatic structure detection | ✅ | ❌ | ❌ | ❌ |
| Hierarchical organization | ✅ | ❌ | ❌ | ⚠️ |
| Multi-language support | ✅ | ✅ | ✅ | ⚠️ |
| Outline integration | ✅ | ❌ | ❌ | ❌ |
| Zero configuration | ✅ | ❌ | ❌ | ❌ |
| Comment-based | ✅ | ❌ | ✅ | ⚠️ |

## 📦 Installation & Support

### Installation

**VS Code Marketplace:** Open Extensions (Ctrl+Shift+X) → Search "Friendly Code Outlines" → Install

**Command Line:**
```bash
code --install-extension ran-codes.friendly-code-outlines-vscode
```

### 💡 Tips & Best Practices

- **Use consistent spacing**: `# Section Name ----` (space after # and before dashes)
- **Keep section names concise** for better readability in the outline
- **Use 4+ dashes**: `----`, `-----`, `------` all work
- **Nest logically**: Group related functionality under parent sections
- **Be consistent**: Stick to one comment style per file

### 🐛 Support & Contributing

- **🐛 Found a bug?** [Report it on GitHub](https://github.com/ran-codes/friendly-code-outlines-vscode/issues)
- **💡 Feature idea?** [Submit a feature request](https://github.com/ran-codes/friendly-code-outlines-vscode/issues)
- **🛠️ Want to contribute?** Check out our [Contributing Guidelines](https://github.com/ran-codes/friendly-code-outlines-vscode/blob/main/CONTRIBUTING.md)

### ☕ Support the Project

If this extension helps you stay organized and productive:

- ⭐ **[Star us on GitHub](https://github.com/ran-codes/friendly-code-outlines-vscode)**
- 🐦 **Follow me:** [@ran_codes](https://twitter.com/ran_codes)
- ☕ **Support development:** [Patreon](https://patreon.com/ran_codes) • [Ko-fi](https://ko-fi.com/ran_codes)
- 📝 **Write a review** on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ran-codes.friendly-code-outlines-vscode)

---

## 📋 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

### 0.0.1 - Initial Release
- Support for `#`, `//`, and `--` comment styles
- Hierarchical section nesting up to 4 levels
- VS Code outline integration
- Multi-language support
- Zero configuration setup

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<p align="center">
  <em>Inspired by RStudio's Code Sections • Built with ❤️ for the VS Code community</em>
</p>