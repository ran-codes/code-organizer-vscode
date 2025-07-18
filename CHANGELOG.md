# Changelog

All notable changes to the "Friendly Code Outlines" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-18

### Added
- Initial release of Friendly Code Outlines extension
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