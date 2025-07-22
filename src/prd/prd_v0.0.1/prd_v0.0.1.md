 
# Product Requirements Document (PRD)
## Friendly Code Outlines VS Code Extension

**Version:** v0.0.1
**Date:** July 21, 2025  
**Status:** Active Development  

---

## Describe Feature

### Overview
The Friendly Code Outlines extension brings intuitive code section navigation to Visual Studio Code. It enables developers to organize and navigate large code files using simple comment-based sections with trailing dashes, providing hierarchical structure and seamless integration with VS Code's outline view.

### Core Functionality
**Comment-Based Code Sections**: Automatically detect and parse code sections from comments with specific patterns:

```python
# 1. Data Processing ----
import pandas as pd

## 1.1 Data Loading ----  
def load_data():
    return pd.read_csv("data.csv")

### 1.1.1 Validation ----
def validate_data(df):
    return df.dropna()

# 2. Analysis ----
def analyze_data(df):
    return df.describe()
```

### Supported Patterns
- **Hash comments**: `# Section ----` (Python, R, Shell, YAML)
- **Double-slash comments**: `// Section ----` (JavaScript, TypeScript, C++, Java, Go, Rust)
- **SQL comments**: `-- Section ----` (SQL, PostgreSQL)

### Key Features
1. **Hierarchical Structure**: Support up to 4 levels of nesting using multiple comment characters
2. **Multi-Language Support**: Consistent syntax across different programming languages
3. **VS Code Integration**: Seamless integration with outline view, breadcrumbs, and Go to Symbol
4. **Real-Time Parsing**: Instant updates as you type and edit sections
5. **Zero Configuration**: Works out-of-the-box without setup

### Inspiration
This feature is directly inspired by RStudio's Code Sections functionality, which allows R developers to:
- Structure long scripts into navigable sections
- Fold and unfold code regions
- Jump between sections using keyboard shortcuts
- Maintain code organization without heavy architectural changes

**Reference:** [RStudio Code Folding and Sections](https://support.posit.co/hc/en-us/articles/200484568-Code-Folding-and-Sections-in-the-RStudio-IDE)

## Describe Existing Implementations in VS Code Ecosystem

### Current Navigation Solutions

#### 1. **Bookmarks Extension** (~2.8M installs)
- **Functionality**: Mark specific lines for quick navigation
- **Approach**: Manual bookmark placement and management
- **Limitations**: 
  - No automatic structure detection
  - Requires manual management
  - No hierarchical organization
  - Not comment-based

#### 2. **Code Outline Extension** (~500K installs)
- **Functionality**: Language-specific symbol extraction
- **Approach**: Parse AST for functions, classes, variables
- **Limitations**:
  - Language-dependent implementation
  - Only shows code symbols, not logical sections
  - No support for arbitrary section organization
  - Complex setup for custom patterns

#### 3. **Better Comments Extension** (~3.2M installs)
- **Functionality**: Enhance comment visibility with colors and styling
- **Approach**: Syntax highlighting for different comment types
- **Limitations**:
  - Pure visual enhancement
  - No navigation functionality
  - No outline integration
  - No structural organization

#### 4. **Region Folding for VS Code** (~150K installs)
- **Functionality**: Manual region definition with `//#region` and `//#endregion`
- **Approach**: Explicit region markers for folding
- **Limitations**:
  - Requires specific syntax
  - Limited language support
  - No outline view integration
  - Verbose marker syntax

#### 5. **Native VS Code Features**
- **Document Outline**: Shows language symbols (functions, classes, methods)
- **Breadcrumbs**: Current symbol context
- **Go to Symbol**: Quick navigation to code symbols
- **Limitations**:
  - Language parser dependent
  - No support for arbitrary sections
  - No comment-based organization
  - Limited customization

### Market Analysis
| Extension | Installs | Approach | Outline Integration | Multi-Language | Comment-Based |
|-----------|----------|----------|-------------------|----------------|---------------|
| Bookmarks | 2.8M | Manual marks | ❌ | ✅ | ❌ |
| Code Outline | 500K | AST parsing | ✅ | ⚠️ Limited | ❌ |
| Better Comments | 3.2M | Visual enhancement | ❌ | ✅ | ✅ |
| Region Folding | 150K | Explicit markers | ❌ | ⚠️ Limited | ⚠️ Partial |
| **Friendly Outlines** | - | Comment parsing | ✅ | ✅ | ✅ |

## Describe Gap

### Identified Gaps in Current Ecosystem

#### 1. **No RStudio-Style Comment Sections**
- **Gap**: No VS Code extension provides RStudio's intuitive `# Section ----` syntax
- **Impact**: Data scientists and R developers lose familiar workflow when switching to VS Code
- **Evidence**: RStudio's approach is widely adopted in the R community and considered best practice

#### 2. **Limited Multi-Language Comment-Based Navigation**
- **Gap**: Existing solutions either focus on single languages or don't use comment-based organization
- **Impact**: Developers working across multiple languages need different navigation strategies
- **Current State**: Each language ecosystem has different conventions with no unified approach

#### 3. **Poor Outline Integration for Arbitrary Sections**
- **Gap**: VS Code's native outline only shows language symbols, not logical code organization
- **Impact**: Large files with logical sections (setup, processing, cleanup) lack navigational structure
- **Workaround**: Developers resort to manual searching or external documentation

#### 4. **Missing Hierarchical Comment Organization**
- **Gap**: No extension provides nested comment-based sections with proper parent-child relationships
- **Impact**: Complex files can't express hierarchical organization through simple comments
- **Current Limitation**: Flat navigation structures don't scale to complex codebases

#### 5. **Inconsistent Cross-Language Experience**
- **Gap**: Navigation experience varies dramatically between languages
- **Impact**: Context switching between Python, JavaScript, SQL requires learning different navigation patterns
- **Developer Pain**: Cognitive load increases when working on polyglot projects

### User Pain Points
Based on the gaps identified:

1. **RStudio Migration**: Data scientists moving from RStudio to VS Code lose familiar section navigation
2. **Large File Navigation**: Developers struggle with files >1000 lines without logical sectioning
3. **Team Communication**: No shared vocabulary for discussing code regions across languages
4. **Code Review Efficiency**: Reviewers can't quickly navigate to specific logical sections
5. **Documentation Disconnect**: Code organization doesn't match documentation structure

### Market Opportunity
- **Primary Market**: 15M+ VS Code users working with large codebases
- **Secondary Market**: Data science community transitioning from RStudio
- **Underserved Segment**: Multi-language developers needing consistent navigation patterns

## Describe Proposal

### Solution Overview
Develop a VS Code extension that provides RStudio-style code section navigation with universal multi-language support, seamlessly integrating with VS Code's native outline and navigation systems.

### Core Value Proposition
**"Bring RStudio's beloved code section navigation to VS Code with universal multi-language support"**

### Technical Implementation

#### 1. **Document Symbol Provider Architecture**
```typescript
// Core integration point with VS Code's symbol system
class FriendlyOutlineSymbolProvider implements DocumentSymbolProvider {
  provideDocumentSymbols(document: TextDocument): DocumentSymbol[] {
    const sections = findSections(document.getText());
    return sections.map(section => new DocumentSymbol(
      section.name,
      section.depth,
      SymbolKind.Module, // Appears in outline as module
      section.range,
      section.range
    ));
  }
}
```

#### 2. **Multi-Language Pattern Detection**
```typescript
// Extensible pattern system for different comment styles
const patterns = [
  { regex: /^[ \t]*(#{1,4})\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '#' },
  { regex: /^[ \t]*(\/\/+)\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '//' },
  { regex: /^[ \t]*(--+)\s*(.+?)\s+[-]{4,}\s*$/gm, commentType: '--' }
];
```

#### 3. **Hierarchical Section Parsing**
- **Depth Calculation**: Based on comment character repetition
  - `# Section ----` → Depth 1
  - `## Subsection ----` → Depth 2
  - `### Sub-subsection ----` → Depth 3
- **Parent-Child Relationships**: Automatic nesting in outline tree
- **Unique Identification**: Section name + line number for navigation

### Integration Points

#### 1. **VS Code Outline View**
- Sections appear as navigable tree nodes
- Click-to-jump functionality
- Hierarchical indentation
- Real-time updates as code changes

#### 2. **Breadcrumb Navigation**
- Current section displayed in breadcrumb bar
- Quick navigation to parent sections
- Context awareness for nested sections

#### 3. **Go to Symbol (Ctrl+Shift+O)**
- Sections searchable in quick open dialog
- Fuzzy search by section name
- Integration with existing VS Code navigation

#### 4. **Minimap Integration**
- Section boundaries highlighted in minimap
- Visual code organization overview
- Quick click navigation

### Language Support Strategy

#### Phase 1: Core Languages
- **Python** (`#`): Data science, automation scripts
- **JavaScript/TypeScript** (`//`): Web development, Node.js
- **SQL** (`--`): Database scripts, data analysis
- **Go** (`//`): Backend services, CLI tools
- **Rust** (`//`): Systems programming

#### Phase 2: Extended Support
- **R** (`#`): Statistical computing
- **C/C++** (`//`): Systems programming
- **Java** (`//`): Enterprise applications
- **C#** (`//`): .NET development
- **Swift** (`//`): iOS development

#### Phase 3: Specialized Languages
- **Shell/Bash** (`#`): DevOps, automation
- **YAML** (`#`): Configuration files
- **Dockerfile** (`#`): Container definitions

### User Experience Design

#### 1. **Zero Configuration**
- Works immediately upon installation
- No settings or configuration required
- Automatic language detection

#### 2. **Familiar Syntax**
- Matches RStudio convention exactly
- Intuitive for developers already using comments
- Minimal learning curve

#### 3. **Visual Feedback**
```
Explorer
├── 📁 src/
│   ├── 📄 data_processor.py
│   │   ├── 📋 1. Data Loading
│   │   │   ├── 📋 1.1 File Reading
│   │   │   └── 📋 1.2 Validation
│   │   └── 📋 2. Processing
│   │       └── 📋 2.1 Transformation
```

### Success Metrics & KPIs

#### Primary Metrics
1. **Adoption Rate**: Target 10K installs in first 3 months
2. **User Engagement**: 70%+ of users actively use outline navigation
3. **Performance**: <50ms parse time for 5K line files
4. **Language Coverage**: Support 8+ languages by v1.0

#### Secondary Metrics
1. **User Satisfaction**: 4.5+ star average rating
2. **Community Engagement**: GitHub stars, issues, contributions
3. **Feature Usage**: Most common section patterns and depths
4. **Error Rate**: <1% parsing failures across supported languages

### Success Criteria
1. **Feature Complete**: All core functionality implemented and tested
2. **Performance**: Meets or exceeds performance benchmarks
3. **User Adoption**: Positive community reception and growing install base
4. **Quality**: Stable, bug-free experience across supported languages
5. **Documentation**: Comprehensive guides and examples for users
