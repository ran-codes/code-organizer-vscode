# Changelog

All notable changes to the "Code Organizer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.0.6] - 2025-10-28

### Added

- **Custom Activity Bar View**: Dedicated Code Organizer tab in the activity bar with custom icon
  - Independent view container for Code Organizer sections
  - Enhanced navigation experience separate from built-in Outline
  - Monochrome SVG icon that adapts to VS Code themes
- **Editor → Outline Synchronization**: Bidirectional navigation between editor and outline (#29)
  - Auto-scroll outline view as cursor moves through sections
  - Highlight current section in both editor and outline
  - Visual indicators with themed colors (border highlight + hover messages)
  - Debounced cursor tracking (150ms) for performance
- **"Show Code Organizer" Command**: Quick access command to open and focus the view (#31)
  - Accessible via Command Palette: `Code Organizer: Show Code Organizer`
  - Programmatically opens view when closed
  - Uses VS Code's auto-generated `.focus` command for reliability
- **High Resolution Icon**: Professional hexagon design for marketplace (#26)
  - Hex sticker style inspired by R packages
  - Code section visual metaphor (hash symbols with lines)
  - Gradient fill for visual appeal
  - Separate monochrome activity bar icon for theme compatibility

### Changed

- Consolidated view architecture: Removed redundant Explorer section, kept custom Activity Bar tab + legacy Outline integration
- Enhanced TreeView with caching mechanism for reliable `reveal()` functionality
- Improved section highlight with visual decorations (left border + background highlight)
- Updated extension icon to `icon_v2.png` with modern hexagon design

### Technical

- Implemented `CodeOrganizerTreeDataProvider` with TreeItem caching using `Map<uniqueId, TreeItem>`
- Created `decorations.ts` for editor highlighting with theme-aware colors
- Added cursor position tracking with `getCurrentSection()` helper function
- Registered `codeOrganizer.showView` command for view focus functionality
- Document caching to avoid unnecessary re-parsing of sections
- Event listeners for editor selection changes, active editor switches, and document changes

### Fixed

- TreeView `reveal()` now works correctly by using cached TreeItem instances
- Removed confusing `goToSection` command from Command Palette (kept for programmatic use only)

## [0.0.5] - 2025-09-27

### Added

- **Markdown/Quarto Support**: Added native header detection for `.md` and `.qmd` files
- Language/file type detection in document symbol provider
- Code chunk quarantine logic to prevent parsing headers inside fenced code blocks (```)
- Support for Quarto (`.qmd`) documents with specialized header patterns

### Changed

- Updated `findSections.ts` to handle language-specific parsing (markdown vs. universal regex)
- Enhanced parser to distinguish between markdown native syntax (`#`, `##`) and comment-based sections
- Improved section detection to ignore content within code fences

### Technical

- Implemented language ID detection and passing to `findSections()`
- Added comprehensive test suite for markdown and quarto file parsing
- Optimized code chunk detection to handle unmatched code fence scenarios

## [0.0.4] - 2025-09-19

### Fixed

- **Cursor Compatibility**: Downgraded VSCode engine requirement from ^1.102.0 to ^1.99.0 for Cursor editor compatibility
- Enables installation in Cursor v1.3.9 and other VSCode-based editors

### Changed

- Updated minimum VSCode version requirement to support broader editor ecosystem

## [0.0.3] - 2025-08-14

### Added

- **JSX/TSX Support**: Added support for React JSX comment syntax `{/* // Section ---- */}`
- Enhanced language support for React developers
- Comprehensive test suite for JSX comment detection

### Fixed

- Improved JSX regex pattern to handle whitespace variations in comment syntax
- Fixed issue where JSX comments with spaces before closing `*/}` weren't detected

### Changed

- Updated package.json activation events to include React file types
- Improved extension description to highlight React/JSX support

### Technical

- Added regex pattern for JSX comment detection in findSections.ts
- Added activation events for `javascriptreact` and `typescriptreact` languages
- Created jsx-comments.test.ts with 7 comprehensive test cases
- Refined JSX regex to handle `{/* // Section ---- */ }` format with trailing spaces

## [0.0.1] - 2025-07-29

### Added

- Initial release of Code Organizer extension
- Support for creating code sections using comment patterns
- Pattern recognition for `# Section Name ----` (4+ dashes)
- Hierarchical section support with nesting (##, ###, ####)
- Integration with VS Code's built-in Outline view
- Document symbol provider for navigation
- Configuration options for enabling/disabling extension
- Multi-language support for any file type
- Unique ID system for handling duplicate section names

### Features

- Detects comment sections ending with 4+ dashes
- Supports up to 4 levels of nesting
- Works across all programming languages
- Appears in VS Code Outline panel
- Breadcrumb navigation support
- Go to Symbol (Ctrl+Shift+O) integration

### Technical

- TypeScript implementation
- Comprehensive test suite
- ESLint code quality checks
- Proper VS Code extension structure