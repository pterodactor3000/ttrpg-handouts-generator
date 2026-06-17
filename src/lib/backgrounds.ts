import type { BackgroundCategory } from '@/types';

const BACKGROUND_CONFIGS: Record<BackgroundCategory, { label: string; cssBackground: string }> = {
  fantasy: {
    label: 'High Fantasy',
    cssBackground:
      'radial-gradient(ellipse at top, #c8a87a 0%, #8b6035 40%), linear-gradient(180deg, #d4b47e 0%, #7a4e28 100%)',
  },
  horror: {
    label: 'Eldritch',
    cssBackground:
      'radial-gradient(ellipse at top, #c8c0a8 0%, #a89878 40%), linear-gradient(180deg, #d0c8b0 0%, #9c8c70 100%)',
  },
  scifi: {
    label: 'Grimdark',
    cssBackground:
      'radial-gradient(ellipse at top, #001a3a 0%, #000d1a 40%), linear-gradient(180deg, #002244 0%, #000d1a 100%)',
  },
};

const BACKGROUND_CATEGORY_OPTIONS: BackgroundCategory[] = ['fantasy', 'horror', 'scifi'];

export { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS };
