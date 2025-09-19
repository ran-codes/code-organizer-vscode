# Changelog

All notable changes to the "Code Organizer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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