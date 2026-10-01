import { describe, expect, it } from 'vitest';
import { BACKGROUND_CONFIGS, BACKGROUND_CATEGORY_OPTIONS, getHandoutStripImageUrl } from '@/lib/backgrounds';
import type { BackgroundCategory } from '@/types';

const ALL_CATEGORIES: BackgroundCategory[] = ['fantasy', 'scifi', 'horror'];

describe('BACKGROUND_CONFIGS', () => {
  it('BACKGROUND_CATEGORY_OPTIONS covers all BackgroundCategory values', () => {
    expect(BACKGROUND_CATEGORY_OPTIONS).toEqual(expect.arrayContaining(ALL_CATEGORIES));
    expect(BACKGROUND_CATEGORY_OPTIONS).toHaveLength(ALL_CATEGORIES.length);
  });

  it('BACKGROUND_CONFIGS keys cover all BackgroundCategory values', () => {
    expect(Object.keys(BACKGROUND_CONFIGS)).toEqual(expect.arrayContaining(ALL_CATEGORIES));
  });

  for (const category of ALL_CATEGORIES) {
    it(`${category} has non-empty cssBackground`, () => {
      expect(BACKGROUND_CONFIGS[category].cssBackground.trim()).not.toBe('');
    });

    it(`${category} has non-empty label`, () => {
      expect(BACKGROUND_CONFIGS[category].label.trim()).not.toBe('');
    });
  }
});

const EXPECTED_STRIP_IMAGE_URLS: Record<BackgroundCategory, string> = {
  fantasy: '/borders/fantasy-border.png',
  horror: '/borders/horror-border.png',
  scifi: '/borders/scifi-border.png',
};

describe('getHandoutStripImageUrl', () => {
  for (const category of ALL_CATEGORIES) {
    it(`returns the border PNG for ${category}`, () => {
      expect(getHandoutStripImageUrl(category)).toBe(EXPECTED_STRIP_IMAGE_URLS[category]);
      expect(getHandoutStripImageUrl(category)).not.toContain('gradient');
    });
  }

  it('returns a distinct URL for each category', () => {
    const stripImageUrls = ALL_CATEGORIES.map((category) => getHandoutStripImageUrl(category));
    expect(new Set(stripImageUrls).size).toBe(ALL_CATEGORIES.length);
  });
});
