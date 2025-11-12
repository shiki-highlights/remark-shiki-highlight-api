/**
 * Remark plugin to replace traditional Shiki code blocks
 * with CSS Custom Highlight API versions
 */
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import type { Parent } from 'unist';
import {
  codeToHighlightHtml,
  loadCustomLanguage,
  type HighlightOptions,
  type BundledLanguage,
} from 'shiki-highlight-api';
import { bundledLanguages } from 'shiki';

let blockCounter = 0;
const loadedLanguages = new Set<string>();

export interface RemarkHighlightApiOptions {
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

  /**
   * Enable automatic line numbering for all code blocks
   * @default false
   */
  lineNumbers?: boolean | { start?: number };
}

/**
 * Parse meta string from code fence to extract transformer options
 * Supports: {1,3,5-7} for highlighting, showLineNumbers, diff indicators
 */
function parseMetaString(meta: string | null | undefined): Partial<HighlightOptions> {
  if (!meta) return {};

  const options: Partial<HighlightOptions> = {};

  // Parse line highlight syntax: {1,3,5-7}
  const highlightMatch = meta.match(/\{([0-9,-]+)\}/);
  if (highlightMatch) {
    options.highlightLines = highlightMatch[1];
  }

  // Parse line numbers flag
  if (meta.includes('showLineNumbers') || meta.includes('lineNumbers')) {
    options.lineNumbers = true;

    // Check for custom start: showLineNumbers:10
    const startMatch = meta.match(/(?:showLineNumbers|lineNumbers):(\d+)/);
    if (startMatch) {
      options.lineNumbers = { start: parseInt(startMatch[1], 10) };
    }
  }

  // Parse diff indicators: diff +1,3 -2,5
  const diffAddMatch = meta.match(/\+([0-9,]+)/);
  const diffRemoveMatch = meta.match(/-([0-9,]+)/);
  if (diffAddMatch || diffRemoveMatch) {
    options.diffLines = {};
    if (diffAddMatch) {
      options.diffLines.added = diffAddMatch[1].split(',').map((n) => parseInt(n.trim(), 10));
    }
    if (diffRemoveMatch) {
      options.diffLines.removed = diffRemoveMatch[1].split(',').map((n) => parseInt(n.trim(), 10));
    }
  }

  // Parse focus syntax: focus{2,3}
  const focusMatch = meta.match(/focus\{([0-9,-]+)\}/);
  if (focusMatch) {
    const focusLines = focusMatch[1].split(',').flatMap((part) => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
      return [parseInt(part.trim(), 10)];
    });
    options.focusLines = focusLines;
  }

  return options;
}

export function remarkHighlightApi(options: RemarkHighlightApiOptions = {}) {
  const { theme = 'dark-plus', loadLanguages, lineNumbers: globalLineNumbers } = options;
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
      for (const lang of detectedLanguages) {
        // Skip if already loaded
        if (loadedLanguages.has(lang)) continue;

        // Check if language exists in bundledLanguages
        if (lang in bundledLanguages) {
          try {
            const langModule = await bundledLanguages[lang as BundledLanguage]();
            // Type assertion needed because bundledLanguages returns module format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await loadCustomLanguage(langModule as any);
            loadedLanguages.add(lang);
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

    // Sort in descending order by index to prevent index invalidation
    // when replacing nodes (higher indices processed first)
    codeBlocks.sort((a, b) => b.index - a.index);

    // Process all code blocks
    for (const { node, index, parent } of codeBlocks) {
      const lang = node.lang || 'text';
      const code = node.value;

      try {
        // Parse meta string for transformer options
        const metaOptions = parseMetaString(node.meta);

        // Generate Highlight API version
        const blockId = `hl-${++blockCounter}`;
        const result = await codeToHighlightHtml(code, {
          lang,
          theme,
          blockId,
          // Apply global line numbers if set and not overridden by meta
          lineNumbers: metaOptions.lineNumbers ?? globalLineNumbers,
          // Apply meta string options
          ...metaOptions,
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
