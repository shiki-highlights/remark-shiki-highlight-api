/**
 * Remark plugin to replace traditional Shiki code blocks
 * with CSS Custom Highlight API versions
 */
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import type { Parent } from 'unist';
import { codeToHighlightHtml, loadCustomLanguage } from 'shiki-highlight-api';
import { bundledLanguages } from 'shiki';
import type { BundledLanguage } from 'shiki';

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
}

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
