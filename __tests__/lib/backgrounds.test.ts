import { describe, expect, it } from 'vitest';
import { BACKGROUND_CONFIGS, BACKGROUND_CATEGORY_OPTIONS } from '@/lib/backgrounds';
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
