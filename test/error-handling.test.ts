import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Mock shiki-highlight-api before importing anything else
vi.mock('shiki-highlight-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('shiki-highlight-api')>();
  return {
    ...original,
    loadCustomLanguage: vi.fn().mockRejectedValue(new Error('Simulated load failure')),
  };
});

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkHighlightApi } from '../src/index';

describe('remarkHighlightApi error handling', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('handles language loading errors gracefully', async () => {
    const markdown = '```python\nprint("test")\n```';

    const result = await unified()
      .use(remarkParse)
      .use(remarkHighlightApi)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown);

    // Should have logged the error
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load language python'),
      expect.any(Error)
    );

    // Processing should still continue despite the error
    const html = String(result);
    expect(html).toContain('print');
  });
});
