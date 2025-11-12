# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-01-12

### Fixed

- **Critical**: Fixed language loading by marking `shiki` as external dependency
  - Resolved "Cannot find module 'javascript-\*.mjs'" errors at runtime
  - Dynamic language imports now work correctly from user's node_modules
  - Reduced bundle size to 3.82 KB (ESM)
- **Critical**: Fixed AST index invalidation causing duplicate/incorrect code block replacements
  - Code blocks are now processed in descending index order
  - Prevents index corruption when replacing nodes with multiple HTML elements

### Technical Details

- Added `tsup.config.ts` to configure bundler externals
- Updated build scripts to use config file
- Prevents inlining of Shiki language grammars
- Sort code blocks by descending index before processing

## [0.3.0] - 2025-01-12

### Added

- **Meta String Parsing**: Parse code fence metadata for transformer features
- **Line Highlighting**: Highlight specific lines using `{1,3}` or `{1-3}` syntax
- **Line Numbers**: Show line numbers with `showLineNumbers` or `lineNumbers:N` flags
- **Diff Indicators**: Show added/removed lines using `+N` and `-N` syntax
- **Focus Lines**: Focus specific lines with `focus{N}` syntax while blurring others
- **Combined Features**: Mix multiple features in a single code block
- **Global Line Numbers**: Configure line numbers globally via plugin options
- **Comprehensive Documentation**: Full README with examples for all meta string features
- **Integration Tests**: 19 new tests covering all meta string parsing functionality

### Changed

- Updated to `shiki-highlight-api@^1.0.0` for transformer support
- Added `shiki@^3.14.0` as direct dependency for bundled languages

### Technical Details

- New `parseMetaString()` function to extract transformer options from code fence metadata
- Test coverage: 34 tests passing (15 original + 19 new)
- Zero breaking changes for existing users (all new features are opt-in)

## [0.2.1] - Previous Release

Plugin updates for organization URL changes.

[0.3.0]: https://github.com/shiki-highlights/remark-shiki-highlight-api/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/shiki-highlights/remark-shiki-highlight-api/releases/tag/v0.2.1
