# remark-shiki-highlight-api

Remark plugin that replaces traditional Shiki code blocks with CSS Custom Highlight API versions, achieving 80-90% fewer DOM nodes while maintaining identical visual output.

## Why?

Traditional syntax highlighting wraps each token in a `<span>` element, creating thousands of DOM nodes for code-heavy pages. This plugin uses the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) to achieve the same visual result with dramatically fewer nodes.

**Performance:**

- Traditional approach: ~10 tokens/line × N lines = thousands of `<span>` elements
- Highlight API: 1 text node per line
- Result: 80-90% fewer DOM nodes

Built on top of [shiki-highlight-api](https://github.com/shiki-highlights/shiki-highlight-api).

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
    syntaxHighlight: false, // Disable Astro's default
  },
});
```

### With Custom Theme

```javascript
import { remarkHighlightApi } from 'remark-shiki-highlight-api';

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkHighlightApi, { theme: 'github-dark' }]],
    syntaxHighlight: false,
  },
});
```

### Automatic Language Loading

All Shiki bundled languages load automatically when detected in your markdown. No configuration needed for common languages like Python, Rust, Go, PHP, Ruby, etc.

```javascript
// astro.config.mjs - works out of the box
import { remarkHighlightApi } from 'remark-shiki-highlight-api';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkHighlightApi],
    syntaxHighlight: false,
  },
});
```

Then in your markdown:

````markdown
```python
def hello():
    print("world")
```

```rust
fn main() {
    println!("Hello");
}
```
````

Both blocks will highlight automatically.

### With Custom Languages

For custom TextMate grammars not included in Shiki:

```javascript
// custom-languages.js
import { loadCustomLanguage } from 'shiki-highlight-api';
import myGrammar from './my-grammar.tmLanguage.json';

export async function loadCustomLanguages() {
  await loadCustomLanguage({
    ...myGrammar,
    name: 'mylang', // Language ID to use in code blocks
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
      [
        remarkHighlightApi,
        {
          theme: 'dark-plus',
          loadLanguages: loadCustomLanguages,
        },
      ],
    ],
    syntaxHighlight: false,
  },
});
```

The `loadLanguages` callback runs once before processing any code blocks.

## Meta String Syntax

You can add transformer features to individual code blocks using meta string syntax in your markdown code fences. All features from [shiki-highlight-api v1.0.0+](https://github.com/shiki-highlights/shiki-highlight-api) are supported.

### Line Highlighting

Highlight specific lines using curly braces with line numbers or ranges:

````markdown
```javascript {1,3}
const a = 1;  // highlighted
const b = 2;
const c = 3;  // highlighted
```

```javascript {1-3}
const a = 1;  // highlighted
const b = 2;  // highlighted
const c = 3;  // highlighted
```

```javascript {1,3-5,7}
// Mix single lines and ranges
```
````

### Line Numbers

Display line numbers using `showLineNumbers` or `lineNumbers` flags:

````markdown
```javascript showLineNumbers
const x = 1;  // Shows line 1
const y = 2;  // Shows line 2
```

```javascript lineNumbers:10
const x = 1;  // Shows line 10
const y = 2;  // Shows line 11
```
````

### Diff Indicators

Show added and removed lines using `+` and `-` prefixes:

````markdown
```javascript +1,2 -4
const a = 1;  // + added
const b = 2;  // + added
const c = 3;
const d = 4;  // - removed
```
````

### Focus Lines

Focus specific lines while blurring others using `focus{}` syntax:

````markdown
```javascript focus{2,3}
const a = 1;  // blurred
const b = 2;  // focused
const c = 3;  // focused
const d = 4;  // blurred
```

```javascript focus{1-3}
// Focus a range of lines
```
````

### Combined Features

You can combine multiple features in a single code block:

````markdown
```javascript {1,3} showLineNumbers:10 +1 focus{1-2}
const a = 1;  // line 10, highlighted, added, focused
const b = 2;  // line 11, focused
const c = 3;  // line 12, highlighted, blurred
```
````

## Options

```typescript
interface RemarkHighlightApiOptions {
  /**
   * Default theme to use for syntax highlighting
   * @default 'dark-plus'
   */
  theme?: string;

  /**
   * Enable line numbers globally for all code blocks
   * Can be overridden per-block using meta string syntax
   * @default false
   */
  lineNumbers?: boolean | { start: number };

  /**
   * Optional function to load custom languages before processing
   * This function will be called once before processing any code blocks
   */
  loadLanguages?: () => Promise<void>;
}
```

### Global Line Numbers

You can enable line numbers globally for all code blocks:

```javascript
export default defineConfig({
  markdown: {
    remarkPlugins: [
      [
        remarkHighlightApi,
        {
          theme: 'dark-plus',
          lineNumbers: true, // All blocks show line numbers
        },
      ],
    ],
    syntaxHighlight: false,
  },
});
```

Or set a custom starting line number:

```javascript
remarkPlugins: [
  [
    remarkHighlightApi,
    {
      lineNumbers: { start: 100 },
    },
  ],
];
```

Individual code blocks can override the global setting using meta string syntax.

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

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/shiki-highlights/remark-shiki-highlight-api).
