# Friendly Code Outlines

A VS Code extension that creates navigable code sections using comment patterns. Organize your code with simple comment-based section headers that appear in VS Code's outline view.

## Features

- **Simple Syntax**: Create sections with hash comments ending in 4+ dashes
- **Nested Sections**: Support for up to 4 levels of nesting using multiple # symbols
- **Multi-Language**: Works with any programming language that supports # comments
- **VS Code Integration**: Sections appear in the built-in Outline view
- **No Code Changes**: Uses only comments, doesn't affect your actual code

## Usage

### Basic Sections

Add hash comments with 4 or more dashes:

```python
# Main Configuration ----
database_url = "localhost"
api_key = "secret"

# Helper Functions ----
def process_data():
    pass

# Constants ----
MAX_RETRIES = 3
TIMEOUT = 30
```

### Nested Sections

Use multiple # symbols for nested organization:

```python
# Database Layer ----

## Connection Management ----
def connect():
    pass

## Query Helpers ----
def execute_query():
    pass

### SQL Builders ----
def build_select():
    pass

# API Layer ----

## Authentication ----
def login():
    pass
```

### Multi-Language Support

Works with any language that supports hash (#) comments:

```javascript
// Note: Only # comments are supported, not // comments
// Use # instead:

# Frontend Components ----
const Button = () => <button />;

# State Management ----
const store = createStore();
```

```python
# Database Schema ----
def create_tables():
    pass

# Data Processing ----
def process_data():
    pass
```

## Configuration

Open VS Code settings and search for "Friendly Code Outlines":

- **Enable/Disable**: Turn the extension on or off
- **Supported Languages**: Choose which languages to support (default: all)

## Supported Patterns

The extension recognizes this comment pattern:

| Pattern | Example | Description |
|---------|---------|-------------|
| `# Text ----` | `# Main Section ----` | Hash comments with 4+ dashes |
| `## Text ----` | `## Sub Section ----` | Double hash for level 2 nesting |
| `### Text ----` | `### Sub-Sub Section ----` | Triple hash for level 3 nesting |
| `#### Text ----` | `#### Deep Section ----` | Quad hash for level 4 nesting |

**Note**: Only hash (#) comments with dashes (----) are supported. Other comment styles like //, --, or /* */ are not recognized.

## Requirements

- VS Code 1.102.0 or higher
- No additional dependencies

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Friendly Code Outlines"
4. Click Install

## Viewing Sections

After installation, your comment sections will appear in:

1. **Outline View**: Click the outline icon in the Explorer sidebar
2. **Breadcrumbs**: Enable breadcrumbs in View menu
3. **Go to Symbol**: Use Ctrl+Shift+O to navigate between sections

## Tips

- Use consistent spacing: `# Section Name ----`
- Keep section names concise for better readability
- Use 4 or more dashes (----, -----, etc.)
- Nest sections logically with ##, ###, ####
- Only hash (#) comments are supported

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/your-username/friendly-code-outlines).

## License

This project is licensed under the MIT License.

## Release Notes

### 0.1.0

- Initial release
- Support for hash, slash, and block comment patterns
- Nested section support up to 4 levels
- Multi-language compatibility
- Configuration options