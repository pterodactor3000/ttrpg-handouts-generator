import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONT_CONFIGS } from '@/lib/fonts';
import type { BackgroundCategory } from '@/types';

const BACKGROUND_CATEGORIES: BackgroundCategory[] = ['fantasy', 'scifi', 'horror'];
const GLOBAL_CSS_PATH = resolve(process.cwd(), 'src/styles/global.css');

function extractCategoryArticleStyles(globalCss: string, category: BackgroundCategory) {
  const blockMatch = new RegExp(`\\.handout-article\\[data-category=['"]${category}['"]\\]\\s*\\{([^}]+)\\}`, 's').exec(
    globalCss,
  );

  if (!blockMatch) {
    return { fontFamily: undefined, color: undefined };
  }

  const blockBody = blockMatch[1];
  const fontFamily = /font-family:\s*([^;]+)/.exec(blockBody)?.[1]?.trim();
  const color = /color:\s*([^;]+)/.exec(blockBody)?.[1]?.trim();

  return { fontFamily, color };
}

describe('global.css category styles vs FONT_CONFIGS', () => {
  const globalCss = readFileSync(GLOBAL_CSS_PATH, 'utf-8');

  for (const category of BACKGROUND_CATEGORIES) {
    it(`matches ${category} font-family and color in global.css`, () => {
      const config = FONT_CONFIGS[category];
      const styles = extractCategoryArticleStyles(globalCss, category);

      expect(styles.fontFamily).toBe(config.fontFamily);
      expect(styles.color).toBe(config.fontColor);
    });
  }
});
