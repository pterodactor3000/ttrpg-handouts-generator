// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { HandoutArticle } from '@/components/molecules/HandoutArticle';
import { FONT_CONFIGS } from '@/lib/fonts';
import type { BackgroundCategory } from '@/types';

const BACKGROUND_CATEGORIES: BackgroundCategory[] = ['fantasy', 'scifi', 'horror'];
const CATEGORY_STYLE_TAG_ID = 'handout-article-category-styles-test';
const QUOTED_FONT_NAME_PATTERN = /['"]([^'"]+)['"]/;

function primaryFontName(fontFamily: string): string {
  const quotedMatch = QUOTED_FONT_NAME_PATTERN.exec(fontFamily);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  return fontFamily.split(',')[0].trim();
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgb(${red}, ${green}, ${blue})`;
}

function injectCategoryStyleRules() {
  const rules = BACKGROUND_CATEGORIES.map((category) => {
    const { fontFamily, fontColor } = FONT_CONFIGS[category];
    return `.handout-article[data-category='${category}'] { font-family: ${fontFamily}; color: ${fontColor}; }`;
  }).join('\n');

  const style = document.createElement('style');
  style.id = CATEGORY_STYLE_TAG_ID;
  style.textContent = rules;
  document.head.appendChild(style);
}

function removeCategoryStyleRules() {
  document.getElementById(CATEGORY_STYLE_TAG_ID)?.remove();
}

function expectCategoryTypography(
  elements: {
    article: HTMLElement;
    heading: HTMLElement;
    prose: HTMLElement;
    proseParagraph: HTMLElement;
  },
  expectedFontName: string,
  expectedColor: string,
) {
  const { article, heading, prose, proseParagraph } = elements;

  expect(getComputedStyle(article).fontFamily).toContain(expectedFontName);
  expect(getComputedStyle(article).color).toBe(expectedColor);

  expect(getComputedStyle(heading).fontFamily).toContain(expectedFontName);
  expect(getComputedStyle(heading).color).toBe(expectedColor);

  expect(getComputedStyle(prose).fontFamily).toContain(expectedFontName);
  expect(getComputedStyle(proseParagraph).fontFamily).toContain(expectedFontName);
  expect(getComputedStyle(proseParagraph).color).toBe(expectedColor);
}

beforeEach(() => {
  injectCategoryStyleRules();
});

afterEach(() => {
  removeCategoryStyleRules();
  cleanup();
});

describe('HandoutArticle', () => {
  describe('data-category attribute', () => {
    for (const category of BACKGROUND_CATEGORIES) {
      it(`renders data-category="${category}" when category is ${category}`, () => {
        const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" category={category} />);
        expect(container.querySelector('article')).toHaveAttribute('data-category', category);
      });
    }

    it('omits data-category when category is undefined', () => {
      const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" />);
      expect(container.querySelector('article')).not.toHaveAttribute('data-category');
    });
  });

  describe('category font and color styles', () => {
    for (const category of BACKGROUND_CATEGORIES) {
      it(`applies ${category} font and color to the article, title, and prose body`, () => {
        const config = FONT_CONFIGS[category];
        const expectedFontName = primaryFontName(config.fontFamily);
        const expectedColor = hexToRgb(config.fontColor);

        const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" category={category} />);

        const article = container.querySelector('article');
        const heading = container.querySelector('h1');
        const prose = container.querySelector('.prose-invert');
        const proseParagraph = container.querySelector('.prose-invert p');

        expect(article).toBeInstanceOf(HTMLElement);
        expect(heading).toBeInstanceOf(HTMLElement);
        expect(prose).toBeInstanceOf(HTMLElement);
        expect(proseParagraph).toBeInstanceOf(HTMLElement);

        if (
          article instanceof HTMLElement &&
          heading instanceof HTMLElement &&
          prose instanceof HTMLElement &&
          proseParagraph instanceof HTMLElement
        ) {
          expectCategoryTypography({ article, heading, prose, proseParagraph }, expectedFontName, expectedColor);
        }
      });
    }

    it('does not apply category-specific fonts when category is undefined', () => {
      const categoryFontNames = BACKGROUND_CATEGORIES.map((category) =>
        primaryFontName(FONT_CONFIGS[category].fontFamily),
      );

      const { container } = render(<HandoutArticle title="Title" html="<p>Body</p>" />);
      const article = container.querySelector('article');

      expect(article).toBeInstanceOf(HTMLElement);

      if (article instanceof HTMLElement) {
        const appliedFontFamily = getComputedStyle(article).fontFamily;
        for (const fontName of categoryFontNames) {
          expect(appliedFontFamily).not.toContain(fontName);
        }
      }
    });
  });
});
