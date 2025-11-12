# Shiki v3 Language Loading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix language loading in remark-shiki-highlight-api to support all Shiki bundled languages by lazy-loading only detected languages.

**Architecture:** Two-pass processing - scan markdown for languages, load only detected languages from bundledLanguages, then process code blocks. Modify both shiki-highlight-api (export language loading functions) and remark-shiki-highlight-api (implement lazy loading).

**Tech Stack:** TypeScript, Shiki v3, Vitest, unified/remark

---

## Task 1: Add language loading test for Python

**Files:**
- Modify: `test/plugin.test.ts`

**Step 1: Write failing test for Python code block**

Add this test to `test/plugin.test.ts` after the existing tests:

```typescript
it('processes Python code blocks', async () => {
  const markdown = '```python\ndef hello():\n    print("world")\n```';

  const result = await unified()
    .use(remarkParse)
    .use(remarkHighlightApi)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const html = String(result);

  // Should process Python code successfully
  expect(html).toContain('def hello():');
  expect(html).toContain('print("world")');
  expect(html).toContain('<style');
  expect(html).toContain('::highlight(');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: Test PASSES but logs error "Language `python` not found" (code block preserved as fallback)

**Step 3: Commit test**

```bash
git add test/plugin.test.ts
git commit -m "test: add Python code block test"
```

---

## Task 2: Export language loading functions from shiki-highlight-api

**Files:**
- Modify: `node_modules/shiki-highlight-api/dist/index.d.ts` (for reference)
- Note: This package is external, so we'll work around it in remark-shiki-highlight-api

**Step 1: Check shiki-highlight-api exports**

The package already has internal `getHighlighter()` function but doesn't export it. We need to work around this in remark-shiki-highlight-api by managing the highlighter directly.

**Step 2: Document the limitation**

Note: Since shiki-highlight-api is an external package, we'll create our own highlighter instance in remark-shiki-highlight-api rather than modifying the dependency.

---

## Task 3: Implement lazy language loading in remark-shiki-highlight-api

**Files:**
- Modify: `src/index.ts:26-84`

**Step 1: Import Shiki dependencies**

At the top of `src/index.ts`, update imports:

```typescript
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import type { Parent } from 'unist';
import { codeToHighlightHtml } from 'shiki-highlight-api';
import { createHighlighter, bundledLanguages } from 'shiki';
import type { Highlighter, BundledLanguage } from 'shiki';
```

**Step 2: Add highlighter instance management**

After the imports, add highlighter management:

```typescript
let blockCounter = 0;
let highlighterInstance: Highlighter | null = null;

async function getOrCreateHighlighter(): Promise<Highlighter> {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['dark-plus'],
      langs: [],
    });
  }
  return highlighterInstance;
}
```

**Step 3: Update remarkHighlightApi function with two-pass processing**

Replace the existing `remarkHighlightApi` function (lines 26-84) with:

```typescript
export function remarkHighlightApi(options: RemarkHighlightApiOptions = {}) {
  const { theme = 'dark-plus', loadLanguages } = options;
  let languagesLoaded = false;

  return async (tree: Root) => {
    // Load custom languages once if provided
    if (loadLanguages && !languagesLoaded) {
      await loadLanguages();
      languagesLoaded = true;
    }

    // First pass: collect all unique languages
    const detectedLanguages = new Set<string>();
    visit(tree, 'code', (node: Code) => {
      if (node.lang && node.lang !== 'text') {
        detectedLanguages.add(node.lang);
      }
    });

    // Load detected bundled languages
    if (detectedLanguages.size > 0) {
      const highlighter = await getOrCreateHighlighter();

      for (const lang of detectedLanguages) {
        // Check if language exists in bundledLanguages
        if (lang in bundledLanguages) {
          try {
            const langModule = bundledLanguages[lang as BundledLanguage];
            await highlighter.loadLanguage(langModule);
          } catch (error) {
            console.warn(`Failed to load language ${lang}:`, error);
          }
        }
      }
    }

    const codeBlocks: Array<{ node: Code; index: number; parent: Parent }> = [];

    // Second pass: collect all code blocks
    visit(tree, 'code', (node: Code, index, parent) => {
      if (index !== undefined && parent) {
        codeBlocks.push({ node, index, parent });
      }
    });

    // Process all code blocks
    for (const { node, index, parent } of codeBlocks) {
      const lang = node.lang || 'text';
      const code = node.value;

      try {
        // Generate Highlight API version
        const blockId = `hl-${++blockCounter}`;
        const result = await codeToHighlightHtml(code, {
          lang,
          theme,
          blockId,
        });

        // Create HTML nodes to replace the code block
        const htmlNodes = [
          {
            type: 'html',
            value: result.html,
          },
          {
            type: 'html',
            value: result.css,
          },
          {
            type: 'html',
            value: result.script,
          },
        ];

        // Replace code block with HTML nodes
        parent.children.splice(index, 1, ...htmlNodes);
      } catch (error) {
        console.error(`Failed to process code block (lang: ${lang}):`, error);
        // Keep original code block on error
      }
    }
  };
}
```

**Step 4: Run test to verify Python works**

Run: `npm test`
Expected: All tests PASS including the new Python test

**Step 5: Commit implementation**

```bash
git add src/index.ts
git commit -m "feat: add lazy language loading for bundled languages

Load languages detected in markdown on-demand from Shiki's bundledLanguages.
Manages separate highlighter instance to pre-load languages before processing."
```

---

## Task 4: Add tests for additional languages

**Files:**
- Modify: `test/plugin.test.ts`

**Step 1: Add Rust test**

Add after the Python test:

```typescript
it('processes Rust code blocks', async () => {
  const markdown = '```rust\nfn main() {\n    println!("Hello");\n}\n```';

  const result = await unified()
    .use(remarkParse)
    .use(remarkHighlightApi)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const html = String(result);

  expect(html).toContain('fn main()');
  expect(html).toContain('println!');
  expect(html).toContain('<style');
});
```

**Step 2: Add Go test**

```typescript
it('processes Go code blocks', async () => {
  const markdown = '```go\nfunc main() {\n    fmt.Println("Hello")\n}\n```';

  const result = await unified()
    .use(remarkParse)
    .use(remarkHighlightApi)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const html = String(result);

  expect(html).toContain('func main()');
  expect(html).toContain('fmt.Println');
  expect(html).toContain('<style');
});
```

**Step 3: Add multi-language test**

```typescript
it('processes multiple different languages in one document', async () => {
  const markdown = `
\`\`\`javascript
const x = 42;
\`\`\`

\`\`\`python
def hello():
    pass
\`\`\`

\`\`\`rust
fn main() {}
\`\`\`
`;

  const result = await unified()
    .use(remarkParse)
    .use(remarkHighlightApi)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const html = String(result);

  // Should process all three languages
  expect(html).toContain('const x = 42;');
  expect(html).toContain('def hello():');
  expect(html).toContain('fn main()');
});
```

**Step 4: Run tests**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit tests**

```bash
git add test/plugin.test.ts
git commit -m "test: add multi-language support tests"
```

---

## Task 5: Update README documentation

**Files:**
- Modify: `README.md:52-91`

**Step 1: Update "With Custom Languages" section**

Replace lines 52-91 in README.md with:

```markdown
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
```

**Step 2: Commit documentation**

```bash
git add README.md
git commit -m "docs: update README for automatic language loading"
```

---

## Task 6: Clean up test file

**Files:**
- Delete: `test-python.mjs`

**Step 1: Remove temporary test file**

```bash
git rm test-python.mjs
```

**Step 2: Commit cleanup**

```bash
git commit -m "chore: remove temporary test file"
```

---

## Task 7: Run full test suite and build

**Files:**
- None (verification only)

**Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run linting**

Run: `npm run lint`
Expected: No linting errors

**Step 4: Verify with manual test**

Create a test markdown file:

```bash
echo '```python
def test():
    return 42
```' > test.md
```

Process it (would need a test script, but we verified via tests already).

---

## Task 8: Final verification and summary

**Files:**
- None (verification only)

**Step 1: Review changes**

Run: `git log --oneline -8`
Expected: See all commits from this implementation

**Step 2: Check git status**

Run: `git status`
Expected: Clean working tree

**Step 3: Summary**

Implementation complete:
- ✅ Lazy language loading for all bundled languages
- ✅ Backwards compatible with loadLanguages callback
- ✅ Tests for Python, Rust, Go, multi-language documents
- ✅ Updated documentation
- ✅ All tests passing

**Next steps:**
1. Test in a real project with various languages
2. Consider publishing updated version
3. Update shiki-highlight-api dependency version if newer version available
