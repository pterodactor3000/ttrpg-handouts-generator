import { BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { renderHandoutHtml } from '@/lib/handout-renderer';
import type { BackgroundCategory } from '@/types';

interface LandingExample {
  category: BackgroundCategory;
  title: string;
  markdown: string;
  description: string;
}

interface LandingExampleCard {
  category: BackgroundCategory;
  title: string;
  html: string;
  cssBackground: string;
  heading: string;
  description: string;
}

const LANDING_EXAMPLES: readonly LandingExample[] = [
  {
    category: 'fantasy',
    title: 'Royal Summons',
    description:
      'High Fantasy sits on old paper. Write royal decrees, sealed letters, and the note a courier was told not to read.',
    markdown:
      'The crown calls you to the White Hall at dawn.\n\nBring the sealed letter. Speak to no one on the road.\n\n- Wear no crest\n- Take the river path\n- Knock twice',
  },
  {
    category: 'horror',
    title: 'Evening Gazette',
    description:
      'Eldritch reads like a clipping torn from a gazette. Write witness reports, town notices, and the page that should have stayed filed away.',
    markdown:
      'A third lamp-lighter vanished on Cobble Row.\n\nThe paper says fog. The neighbors say something answered back.\n\n> Do not print the name they used.',
  },
  {
    category: 'scifi',
    title: 'Duty Log 17',
    description:
      'Grimdark is a green CRT. Write duty logs, void-watch alerts, and the order a soldier was told to hold.',
    markdown:
      'Void-watch reports green static on deck three.\n\nHold the line. Do not look at the glass.\n\n1. Seal the hatch\n2. Kill the flood lamps\n3. Wait for the all-clear',
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
    heading: BACKGROUND_CONFIGS[example.category].label,
    description: example.description,
  }));
}

export type { LandingExample, LandingExampleCard };
export { getLandingExampleCards, getLandingExamples };
