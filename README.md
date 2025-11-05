# remark-shiki-highlight-api

Remark plugin that replaces traditional Shiki code blocks with CSS Custom Highlight API versions, achieving 80-90% fewer DOM nodes while maintaining identical visual output.

## Why?

Traditional syntax highlighting wraps each token in a `<span>` element, creating thousands of DOM nodes for code-heavy pages. This plugin uses the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) to achieve the same visual result with dramatically fewer nodes.

**Performance:**
- Traditional approach: ~10 tokens/line × N lines = thousands of `<span>` elements
- Highlight API: 1 text node per line
- Result: 80-90% fewer DOM nodes

Built on top of [shiki-highlight-api](https://github.com/stevehill1981/shiki-highlight-api).

## Installation

```bash
npm install remark-shiki-highlight-api shiki-highlight-api shiki
```

## Usage

### Basic Usage (Astro)

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { remarkHighlightApi } from 'remark-shiki-highlight-api';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkHighlightApi],
    syntaxHighlight: false,  // Disable Astro's default
  },
});
```

### With Custom Theme

```javascript
import { remarkHighlightApi } from 'remark-shiki-highlight-api';

export default defineConfig({
  markdown: {
    remarkPlugins: [
      [remarkHighlightApi, { theme: 'github-dark' }]
    ],
    syntaxHighlight: false,
  },
});
```

### With Custom Languages

If you need to load custom TextMate grammars:

```javascript
// custom-languages.js
import { loadCustomLanguage } from 'shiki-highlight-api';
import myGrammar from './my-grammar.tmLanguage.json';

export async function loadCustomLanguages() {
  await loadCustomLanguage({
    ...myGrammar,
    name: 'mylang',  // Language ID to use in code blocks
  });
}
```

```javascript
// astro.config.mjs
import { remarkHighlightApi } from 'remark-shiki-highlight-api';
import { loadCustomLanguages } from './custom-languages.js';

export default defineConfig({
  markdown: {
    remarkPlugins: [
      [remarkHighlightApi, {
        theme: 'dark-plus',
        loadLanguages: loadCustomLanguages
      }]
    ],
    syntaxHighlight: false,
  },
});
```

The `loadLanguages` function will be called once before processing any code blocks.

## Options

```typescript
interface RemarkHighlightApiOptions {
  /**
   * Default theme to use for syntax highlighting
   * @default 'dark-plus'
   */
  theme?: string;

  /**
   * Optional function to load custom languages before processing
   * This function will be called once before processing any code blocks
   */
  loadLanguages?: () => Promise<void>;
}
```

## Browser Support

The CSS Custom Highlight API is supported in:
- Chrome 105+
- Safari 17.2+
- Firefox 140+ (with flag in earlier versions)

For browsers without support, the plugin will still generate the HTML but highlighting won't be applied. Consider using traditional Shiki as a fallback for unsupported browsers.

## How It Works

1. During markdown processing, the plugin intercepts code blocks
2. Uses Shiki to tokenize the code
3. Generates clean HTML (text nodes only, no spans)
4. Generates CSS with `::highlight()` pseudo-elements
5. Generates JavaScript to register Range objects with `CSS.highlights`
6. Replaces the code block with all three pieces

The result looks identical to traditional Shiki but with dramatically fewer DOM nodes.

## Example

Input markdown:
````markdown
```javascript
function hello() {
  console.log('world');
}
```
````

Traditional Shiki output: ~15 DOM nodes (spans wrapping each token)

This plugin's output: 3 DOM nodes (one per line) + CSS + registration script

Visual result: Identical

## Real-World Usage

This plugin is used in production on [Code Like It's 198x](https://code198x.stevehill.xyz), a retro programming education site with hundreds of code samples.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/stevehill1981/remark-shiki-highlight-api).
