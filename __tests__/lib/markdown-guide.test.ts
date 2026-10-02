import { describe, expect, it } from 'vitest';
import { MARKDOWN_GUIDE_EXAMPLES } from '@/lib/markdown-guide';
import { renderHandoutHtml } from '@/lib/handout-renderer';

const GUIDE_IDS = [
  'heading',
  'emphasis',
  'unordered-list',
  'ordered-list',
  'blockquote',
  'inline-code',
  'fenced-code',
  'table',
  'link',
] as const;

const EXPECTED_FRAGMENTS: Record<(typeof GUIDE_IDS)[number], readonly string[]> = {
  heading: ['<h1>'],
  emphasis: ['<strong>', '<em>'],
  'unordered-list': ['<ul>'],
  'ordered-list': ['<ol>'],
  blockquote: ['<blockquote>'],
  'inline-code': ['<code>'],
  'fenced-code': ['<pre'],
  table: ['<table>'],
  link: ['href="https://example.com"'],
};

describe('MARKDOWN_GUIDE_EXAMPLES', () => {
  it('has one entry for each of the nine ids', () => {
    expect(MARKDOWN_GUIDE_EXAMPLES.map((entry) => entry.id)).toEqual([...GUIDE_IDS]);
  });

  it('renders each entry to the fragment paired with its id', () => {
    for (const entry of MARKDOWN_GUIDE_EXAMPLES) {
      const output = renderHandoutHtml(entry.markdown);
      for (const fragment of EXPECTED_FRAGMENTS[entry.id]) {
        expect(output, `${entry.id} should contain ${fragment}`).toContain(fragment);
      }
    }
  });

  it('rejects a raw HTML tag in every markdown string', () => {
    for (const entry of MARKDOWN_GUIDE_EXAMPLES) {
      expect(entry.markdown, entry.id).not.toMatch(/<[A-Za-z]/);
    }
  });
});
