// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { HandoutArticle } from '@/components/molecules/HandoutArticle';

afterEach(cleanup);

describe('HandoutArticle', () => {
  it('renders data-category="fantasy" when category is fantasy', () => {
    const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" category="fantasy" />);
    expect(container.querySelector('article')).toHaveAttribute('data-category', 'fantasy');
  });

  it('renders data-category="scifi" when category is scifi', () => {
    const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" category="scifi" />);
    expect(container.querySelector('article')).toHaveAttribute('data-category', 'scifi');
  });

  it('renders data-category="horror" when category is horror', () => {
    const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" category="horror" />);
    expect(container.querySelector('article')).toHaveAttribute('data-category', 'horror');
  });

  it('omits data-category when category is undefined', () => {
    const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" />);
    expect(container.querySelector('article')).not.toHaveAttribute('data-category');
  });
});
