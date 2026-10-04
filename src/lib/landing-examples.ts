import { BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { renderHandoutHtml } from '@/lib/handout-renderer';
import type { BackgroundCategory } from '@/types';

interface LandingExample {
  category: BackgroundCategory;
  title: string;
  markdown: string;
}

interface LandingExampleCard {
  category: BackgroundCategory;
  title: string;
  html: string;
  cssBackground: string;
}

const LANDING_EXAMPLES: readonly LandingExample[] = [
  {
    category: 'fantasy',
    title: 'Royal Summons',
    markdown: 'The crown calls you to the White Hall at dawn.\n\nBring the sealed letter. Speak to no one on the road.',
  },
  {
    category: 'horror',
    title: 'Evening Gazette',
    markdown:
      'A third lamp-lighter vanished on Cobble Row.\n\nThe paper says fog. The neighbors say something answered back.',
  },
  {
    category: 'scifi',
    title: 'Duty Log 17',
    markdown: 'Void-watch reports green static on deck three.\n\nHold the line. Do not look at the glass.',
  },
];

function getLandingExamples(): readonly LandingExample[] {
  return LANDING_EXAMPLES;
}

function getLandingExampleCards(): LandingExampleCard[] {
  return LANDING_EXAMPLES.map((example) => ({
    category: example.category,
    title: example.title,
    html: renderHandoutHtml(example.markdown),
    cssBackground: BACKGROUND_CONFIGS[example.category].cssBackground,
  }));
}

export type { LandingExample, LandingExampleCard };
export { getLandingExampleCards, getLandingExamples };
