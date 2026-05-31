import type { BackgroundCategory } from '@/types';

const BACKGROUND_CONFIGS: Record<BackgroundCategory, { label: string; cssBackground: string }> = {
  fantasy: {
    label: 'High Fantasy',
    cssBackground:
      'radial-gradient(ellipse at top, #1a3a1a 0%, #0d1f0d 40%), linear-gradient(180deg, #2d4a0e 0%, #0d1f0d 100%)',
  },
  horror: {
    label: 'Grimdark',
    cssBackground:
      'radial-gradient(ellipse at top, #1a0000 0%, #0a0a0a 40%), linear-gradient(180deg, #3a0000 0%, #0a0a0a 100%)',
  },
  scifi: {
    label: 'Post-Apocalyptic',
    cssBackground:
      'radial-gradient(ellipse at top, #001a3a 0%, #000d1a 40%), linear-gradient(180deg, #002244 0%, #000d1a 100%)',
  },
};

const BACKGROUND_CATEGORY_OPTIONS: BackgroundCategory[] = ['fantasy', 'horror', 'scifi'];

export { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS };
