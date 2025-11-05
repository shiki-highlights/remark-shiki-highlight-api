/**
 * Remark plugin to replace traditional Shiki code blocks
 * with CSS Custom Highlight API versions
 */
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import { codeToHighlightHtml } from 'shiki-highlight-api';

let blockCounter = 0;

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

    const codeBlocks: Array<{ node: Code; index: number; parent: any }> = [];

    // First pass: collect all code blocks
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
