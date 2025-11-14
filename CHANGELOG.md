# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.6] - 2025-11-13

### Changed

- Updated `shiki-highlight-api` to `^1.0.5`
  - Adds `loadBundledLanguage()` convenience function with optional alias support
  - Improves singleton pattern for better concurrency safety
  - No changes to plugin code itself

## [0.3.5] - 2025-11-13

### Fixed

- **Critical**: Updated `shiki-highlight-api` to `^1.0.4` to fix highlighter singleton race condition
  - Eliminates Shiki warnings about creating multiple instances during parallel builds
  - Critical fix for sites with 100+ pages built in parallel (e.g., Astro)
  - Previously could create 220+ duplicate highlighter instances during build
  - No changes to plugin code itself - dependency update only
  - Closes #23

### Technical Details

- Dependency update from shiki-highlight-api 1.0.3 → 1.0.4
- Fix uses promise caching to prevent concurrent highlighter instantiation
- All existing tests continue to pass

## [0.3.4] - 2025-01-12

### Fixed

- Updated `shiki-highlight-api` to `^1.0.3` for improved Range validation
  - Adds defensive validation to prevent Range creation failures
  - Validates text node type and checks for range overflow
  - Enhanced error messages with line numbers and range details for debugging
  - No changes to plugin code itself

## [0.3.3] - 2025-01-12

### Fixed

- Updated `shiki-highlight-api` to `^1.0.2` to fix Range creation errors
  - Resolves "IndexSizeError: The index is not in the allowed range" browser console errors
  - Fixes highlighting when using line numbers or diff markers
  - No changes to plugin code itself

## [0.3.2] - 2025-01-12

### Fixed

- **Critical**: Fixed AST index invalidation causing duplicate/incorrect code block replacements
  - Code blocks are now processed in descending index order
  - Prevents index corruption when replacing nodes with multiple HTML elements
  - Affects all versions since initial release

### Technical Details

- Sort code blocks by descending index before processing

## [0.3.1] - 2025-01-12

### Fixed

- **Critical**: Fixed language loading by marking `shiki` as external dependency
  - Resolved "Cannot find module 'javascript-\*.mjs'" errors at runtime
  - Dynamic language imports now work correctly from user's node_modules
  - Reduced bundle size to 3.77 KB (ESM)

### Technical Details

- Added `tsup.config.ts` to configure bundler externals
- Updated build scripts to use config file
- Prevents inlining of Shiki language grammars

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
