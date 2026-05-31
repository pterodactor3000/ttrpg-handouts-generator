import { describe, expect, it } from 'vitest';
import { renderHandoutHtml } from '@/lib/handout-renderer';

describe('renderHandoutHtml', () => {
  describe('standard GFM elements', () => {
    it('renders headings', () => {
      const output = renderHandoutHtml('# Heading 1\n\n## Heading 2\n\n### Heading 3');
      expect(output).toContain('<h1>Heading 1</h1>');
      expect(output).toContain('<h2>Heading 2</h2>');
      expect(output).toContain('<h3>Heading 3</h3>');
    });

    it('renders bold and italic text', () => {
      const output = renderHandoutHtml('**bold** and _italic_');
      expect(output).toContain('<strong>bold</strong>');
      expect(output).toContain('<em>italic</em>');
    });

    it('renders unordered lists', () => {
      const output = renderHandoutHtml('- item one\n- item two\n- item three');
      expect(output).toContain('<ul>');
      expect(output).toContain('<li>item one</li>');
      expect(output).toContain('<li>item two</li>');
    });

    it('renders ordered lists', () => {
      const output = renderHandoutHtml('1. first\n2. second\n3. third');
      expect(output).toContain('<ol>');
      expect(output).toContain('<li>first</li>');
    });

    it('renders blockquotes', () => {
      const output = renderHandoutHtml('> This is a quote');
      expect(output).toContain('<blockquote>');
      expect(output).toContain('This is a quote');
    });

    it('renders inline code', () => {
      const output = renderHandoutHtml('Use `const` instead of `var`');
      expect(output).toContain('<code>const</code>');
    });

    it('renders fenced code blocks', () => {
      const output = renderHandoutHtml('```\nconst x = 1;\n```');
      expect(output).toContain('<pre');
      expect(output).toContain('<code');
      expect(output).toContain('const x = 1;');
    });

    it('renders GFM tables', () => {
      const markdown = '| Name | HP |\n| --- | --- |\n| Goblin | 10 |';
      const output = renderHandoutHtml(markdown);
      expect(output).toContain('<table>');
      expect(output).toContain('<th>Name</th>');
      expect(output).toContain('<td>Goblin</td>');
    });

    it('renders links with valid href', () => {
      const output = renderHandoutHtml('[Visit us](https://example.com)');
      expect(output).toContain('href="https://example.com"');
    });
  });

  describe('syntax highlighting', () => {
    it('adds highlight.js markup to a language-tagged fenced code block', () => {
      const output = renderHandoutHtml('```js\nconst x = 1;\n```');
      expect(output).toContain('hljs');
      expect(output).toMatch(/class="hljs-/);
    });

    it('does not emit hljs token spans for an un-hinted fenced code block', () => {
      const output = renderHandoutHtml('```\nconst x = 1;\n```');
      expect(output).not.toContain('hljs-');
      expect(output).toContain('const x = 1;');
    });
  });

  describe('XSS payload stripping', () => {
    it('strips script tags from input', () => {
      const output = renderHandoutHtml('<script>alert(1)</script>');
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('alert(1)');
    });

    it('strips onerror event attributes from inline HTML', () => {
      const output = renderHandoutHtml('<img src=x onerror=alert(1)>');
      expect(output).not.toContain('onerror');
    });

    it('strips javascript: href from links', () => {
      const output = renderHandoutHtml('[click](javascript:alert(1))');
      expect(output).not.toContain('javascript:');
    });

    it('strips raw inline HTML — does not pass through bold tag', () => {
      const output = renderHandoutHtml('<b>bold</b>');
      expect(output).not.toContain('<b>bold</b>');
    });

    it('strips style attributes that could be used for injection', () => {
      const output = renderHandoutHtml('<p style="background:url(javascript:alert(1))">text</p>');
      expect(output).not.toContain('javascript:');
    });

    it('strips data: URI in links', () => {
      const output = renderHandoutHtml('[click](data:text/html,<script>alert(1)</script>)');
      expect(output).not.toContain('data:');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const output = renderHandoutHtml('');
      expect(output).toBe('');
    });

    it('handles plain text without any markdown', () => {
      const output = renderHandoutHtml('Just some plain text here.');
      expect(output).toContain('Just some plain text here.');
    });

    it('returns a string type', () => {
      const output = renderHandoutHtml('# test');
      expect(typeof output).toBe('string');
    });
  });
});
