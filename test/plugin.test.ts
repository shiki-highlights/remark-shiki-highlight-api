import { describe, it, expect, vi } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkHighlightApi } from '../src/index';

describe('remarkHighlightApi', () => {
  it('transforms code blocks with Highlight API', async () => {
    const markdown = '```javascript\nconst x = 42;\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);

    // Should contain Highlight API elements
    expect(html).toContain('<pre');
    expect(html).toContain('<code');
    expect(html).toContain('const x = 42;');
    expect(html).toContain('<style');
    expect(html).toContain('::highlight(');
    expect(html).toContain('<script');
    expect(html).toContain('CSS.highlights.set');
  });

  it('uses specified theme', async () => {
    const markdown = '```javascript\nconst x = 42;\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi, { theme: 'dark-plus' })
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);
    expect(html).toContain('const x = 42;');
  });

  it('calls loadLanguages callback once', async () => {
    const loadLanguages = vi.fn().mockResolvedValue(undefined);
    const markdown = '```javascript\nconst x = 42;\n```\n\n```javascript\nconst y = 100;\n```';

    await unified()
      .use(remarkParse)
      .use(remarkHighlightApi, { loadLanguages })
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    // Should only call loadLanguages once, not per code block
    expect(loadLanguages).toHaveBeenCalledTimes(1);
  });

  it('handles multiple code blocks', async () => {
    const markdown = `
\`\`\`javascript
const x = 42;
\`\`\`

\`\`\`typescript
const y: number = 100;
\`\`\`
`;

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);

    // Should process both blocks
    expect(html).toContain('const x = 42;');
    expect(html).toContain('const y: number = 100;');
    // Should have multiple highlight registrations
    expect((html.match(/CSS\.highlights\.set/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('preserves code block language', async () => {
    const markdown = '```typescript\nlet x: number;\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);
    expect(html).toContain('let x: number;');
  });

  it('works with code blocks without language specified', async () => {
    const markdown = '```\nplain text\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);
    // Should still process it (defaults to 'text')
    expect(html).toContain('plain text');
  });

  it('handles empty code blocks', async () => {
    const markdown = '```javascript\n\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);
    // Should still generate valid HTML
    expect(html).toContain('<code');
  });

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
    expect(html).toContain('print(');
    expect(html).toContain('world');
    expect(html).toContain('<style');
    expect(html).toContain('::highlight(');
  });

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

  it('handles unsupported languages gracefully', async () => {
    const markdown = '```nonexistent\nsome code\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    const html = String(result);
    // Should preserve the code block even though language doesn't exist in bundledLanguages
    expect(html).toContain('some code');
  });

  it('handles code block processing errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Use an invalid configuration that will cause codeToHighlightHtml to fail
    const markdown = '```javascript\nconst x = 42;\n```';

    // Mock the shiki-highlight-api to throw
    vi.doMock('shiki-highlight-api', () => ({
      codeToHighlightHtml: vi.fn().mockRejectedValue(new Error('Processing failed')),
      loadCustomLanguage: vi.fn(),
    }));

    vi.resetModules();
    const { remarkHighlightApi: mockedPlugin } = await import('../src/index');

    const result = await unified()
      .use(remarkParse)
      .use(mockedPlugin)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    // Should have logged the error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process code block'),
      expect.any(Error)
    );

    // Original code block should be preserved
    const html = String(result);
    expect(html).toContain('const x = 42');

    consoleErrorSpy.mockRestore();
    vi.doUnmock('shiki-highlight-api');
    vi.resetModules();
  });

  it('only loads each language once across multiple documents', async () => {
    // Process first document with Python
    await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process('```python\nprint("first")\n```');

    // Process second document with Python (should not reload)
    await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process('```python\nprint("second")\n```');

    // Process third document with Python and Rust
    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process('```python\nprint("third")\n```\n\n```rust\nfn main() {}\n```');

    // Both languages should be processed successfully
    const html = String(result);
    expect(html).toContain('print');
    expect(html).toContain('fn main()');
  });
});
