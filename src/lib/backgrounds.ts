import type { BackgroundCategory } from '@/types';

const BACKGROUND_CONFIGS: Record<BackgroundCategory, { label: string; cssBackground: string }> = {
  fantasy: {
    label: 'High Fantasy',
    cssBackground:
      'radial-gradient(ellipse at top, #e8d0a0 0%, #c4a050 40%), linear-gradient(180deg, #f0d888 0%, #a87828 100%)',
  },
  horror: {
    label: 'Eldritch',
    cssBackground:
      'radial-gradient(ellipse at top, #f0ece0 0%, #d8d0b8 40%), linear-gradient(180deg, #ece8d8 0%, #c0b898 100%)',
  },
  scifi: {
    label: 'Grimdark',
    cssBackground:
      'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px), radial-gradient(ellipse at top, #0c2010 0%, #020a05 40%), linear-gradient(180deg, #082008 0%, #010802 100%)',
  },
};

const BACKGROUND_CATEGORY_OPTIONS: BackgroundCategory[] = ['fantasy', 'horror', 'scifi'];

export { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS };
