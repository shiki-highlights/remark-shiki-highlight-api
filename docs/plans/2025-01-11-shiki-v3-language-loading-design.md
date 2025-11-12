# Shiki v3 Language Loading Design

**Date:** 2025-01-11
**Status:** Approved

## Problem

Shiki v3 changed language loading from automatic to explicit. Languages no longer bundle by default, so users must load each language before highlighting code. Currently, `shiki-highlight-api` loads only JavaScript and TypeScript. Code blocks in other languages (Python, Rust, etc.) fail with "Language not found" errors.

## Solution

Load languages lazily based on the languages detected in the markdown document. This keeps bundle size minimal while supporting all bundled languages without configuration.

## Architecture

### Two-Pass Processing

**remark-shiki-highlight-api** will scan the document twice:

1. **First pass**: Collect unique language identifiers from all code blocks
2. **Language loading**: Load only the detected languages from Shiki's `bundledLanguages`
3. **Second pass**: Process code blocks with the loaded languages

### Language Loading Priority

Languages load in this order:

1. **Custom languages**: Call user's `loadLanguages` callback (if provided)
2. **Bundled languages**: Import and load detected languages from `bundledLanguages`
3. **Unknown languages**: Skip (error handling catches them during processing)

### Package Changes

**shiki-highlight-api** exports two new functions:

```typescript
export async function getHighlighterInstance(): Promise<Highlighter>;
export async function loadLanguage(langImport: LanguageInput): Promise<void>;
```

**remark-shiki-highlight-api** adds lazy loading logic:

```typescript
// Collect unique languages
const languages = new Set<string>();
visit(tree, 'code', (node) => {
  if (node.lang) languages.add(node.lang);
});

// Load custom languages
if (loadLanguages) await loadLanguages();

// Load bundled languages
for (const lang of languages) {
  if (bundledLanguages[lang]) {
    const grammar = await bundledLanguages[lang]();
    await loadLanguage(grammar);
  }
}

// Process code blocks
// ... existing processing logic
```

## Error Handling

**Graceful degradation** ensures partial failures don't break processing:

- Language loading failures log warnings and continue
- Invalid language identifiers skip loading (not in `bundledLanguages`)
- Existing try-catch in code block processor preserves original markdown on errors

**Edge cases**:

- Code blocks without language: Default to 'text', which needs no loading
- Duplicate languages: Use `Set` to collect unique identifiers
- Language aliases: Shiki handles internally, attempt to load whatever is requested
- Empty documents: Skip language loading entirely

## Backwards Compatibility

The `loadLanguages` callback continues to work exactly as before. Existing users see no API changes—their code blocks simply start working for all bundled languages.

## Implementation

Changes required:

1. **shiki-highlight-api**: Export `getHighlighterInstance()` and `loadLanguage()`
2. **remark-shiki-highlight-api**: Add two-pass processing with lazy language loading
3. **Tests**: Verify Python, Rust, and other common languages work
4. **Documentation**: Update README to explain automatic language loading
