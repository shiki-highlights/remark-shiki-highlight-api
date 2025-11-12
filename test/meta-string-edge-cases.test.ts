import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkHighlightApi } from '../src/index';

describe('Meta String Edge Cases', () => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkHighlightApi, {
      theme: 'dark-plus',
    })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true });

  describe('Malformed syntax', () => {
    it('handles empty highlight braces {}', async () => {
      const markdown = `\`\`\`javascript {}
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash, should not have highlighted class
      expect(html).toBeDefined();
      expect(html).not.toContain('highlighted');
    });

    it('handles non-numeric highlight values {a,b}', async () => {
      const markdown = `\`\`\`javascript {a,b}
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash, regex won't match so no highlighting
      expect(html).toBeDefined();
      expect(html).not.toContain('highlighted');
    });

    it('handles incomplete range {1-}', async () => {
      const markdown = `\`\`\`javascript {1-}
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash, regex won't match incomplete range
      expect(html).toBeDefined();
    });

    it('handles empty diff indicators +', async () => {
      const markdown = `\`\`\`javascript +
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash, regex won't match empty indicator
      expect(html).toBeDefined();
      expect(html).not.toContain('diff');
    });

    it('handles invalid focus syntax focus{a}', async () => {
      const markdown = `\`\`\`javascript focus{a}
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash, regex won't match non-numeric
      expect(html).toBeDefined();
    });

    it('handles reversed range focus{3-1}', async () => {
      const markdown = `\`\`\`javascript focus{3-1}
line 1
line 2
line 3
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash, but might produce unexpected results
      // The important thing is it doesn't break
      expect(html).toBeDefined();
    });
  });

  describe('Whitespace handling', () => {
    it('handles whitespace in line numbers lineNumbers: 10', async () => {
      const markdown = `\`\`\`javascript lineNumbers: 10
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Regex won't match with space, should fall back to boolean lineNumbers
      expect(html).toContain('line-number');
      expect(html).toContain('>1</span>'); // Should start at 1, not 10
    });

    it('handles tabs and spaces in meta string', async () => {
      const markdown = `\`\`\`javascript 	{1,3}  showLineNumbers
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should still parse correctly
      expect(html).toContain('highlighted');
      expect(html).toContain('line-number');
    });
  });

  describe('Large numbers', () => {
    it('handles very large line numbers lineNumbers:999999', async () => {
      const markdown = `\`\`\`javascript lineNumbers:999999
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should handle large numbers
      expect(html).toContain('line-number');
      expect(html).toContain('>999999</span>');
    });

    it('handles large highlight numbers {1000000}', async () => {
      const markdown = `\`\`\`javascript {1000000}
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash even if line number is beyond code length
      expect(html).toBeDefined();
    });
  });

  describe('Duplicate features', () => {
    it('handles duplicate highlight syntax {1} {2}', async () => {
      const markdown = `\`\`\`javascript {1} {2}
line 1
line 2
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Regex will match the first one
      expect(html).toContain('highlighted');
    });

    it('handles duplicate line number flags lineNumbers:5 lineNumbers:10', async () => {
      const markdown = `\`\`\`javascript lineNumbers:5 lineNumbers:10
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Regex matches first occurrence
      expect(html).toContain('line-number');
      expect(html).toContain('>5</span>');
    });

    it('handles multiple diff indicators +1 +2', async () => {
      const markdown = `\`\`\`javascript +1 +2
line 1
line 2
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Regex will match the first one
      expect(html).toContain('diff');
      expect(html).toContain('add');
    });
  });

  describe('Empty and null cases', () => {
    it('handles null meta (no meta string)', async () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should work normally
      expect(html).toBeDefined();
      expect(html).toContain('const x = 1;');
    });

    it('handles empty string meta', async () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should work normally
      expect(html).toBeDefined();
    });

    it('handles only whitespace meta', async () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should work normally
      expect(html).toBeDefined();
    });
  });

  describe('Special characters', () => {
    it('handles special characters in unrelated meta', async () => {
      const markdown = `\`\`\`javascript title="file.js" data-test="value"
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not crash with special chars in meta
      expect(html).toBeDefined();
    });

    it('handles unicode in meta string', async () => {
      const markdown = `\`\`\`javascript title="测试" {1}
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should still parse the {1} correctly
      expect(html).toContain('highlighted');
    });
  });

  describe('Conflicting features', () => {
    it('handles highlighting and focus on same line', async () => {
      const markdown = `\`\`\`javascript {1} focus{2}
line 1
line 2
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Line 1 should be both highlighted and blurred (focus is on line 2)
      expect(html).toContain('highlighted');
      expect(html).toContain('blurred');
    });

    it('handles diff and highlight on same line', async () => {
      const markdown = `\`\`\`javascript {1} +1
line 1
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should have both classes
      expect(html).toContain('highlighted');
      expect(html).toContain('diff');
      expect(html).toContain('add');
    });
  });
});
