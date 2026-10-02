interface MarkdownGuideExample {
  id:
    | 'heading'
    | 'emphasis'
    | 'unordered-list'
    | 'ordered-list'
    | 'blockquote'
    | 'inline-code'
    | 'fenced-code'
    | 'table'
    | 'link';
  label: string;
  markdown: string;
}

const MARKDOWN_GUIDE_EXAMPLES: readonly MarkdownGuideExample[] = [
  {
    id: 'heading',
    label: 'Heading',
    markdown: '# Heading 1\n\n## Heading 2\n\n### Heading 3',
  },
  {
    id: 'emphasis',
    label: 'Bold and italic',
    markdown: '**bold** and _italic_',
  },
  {
    id: 'unordered-list',
    label: 'Unordered list',
    markdown: '- item one\n- item two\n- item three',
  },
  {
    id: 'ordered-list',
    label: 'Ordered list',
    markdown: '1. first\n2. second\n3. third',
  },
  {
    id: 'blockquote',
    label: 'Blockquote',
    markdown: '> This is a quote',
  },
  {
    id: 'inline-code',
    label: 'Inline code',
    markdown: 'Use `const` instead of `var`',
  },
  {
    id: 'fenced-code',
    label: 'Fenced code',
    markdown: '```\nconst x = 1;\n```',
  },
  {
    id: 'table',
    label: 'Table',
    markdown: '| Name | HP |\n| --- | --- |\n| Goblin | 10 |',
  },
  {
    id: 'link',
    label: 'Link',
    markdown: '[Visit us](https://example.com)',
  },
];

export type { MarkdownGuideExample };
export { MARKDOWN_GUIDE_EXAMPLES };
