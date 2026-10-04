import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BACKGROUND_CATEGORY_OPTIONS, BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { getLandingExampleCards, getLandingExamples } from '@/lib/landing-examples';

const LANDING_EXAMPLES_PATH = resolve(process.cwd(), 'src/lib/landing-examples.ts');
const WELCOME_PATH = resolve(process.cwd(), 'src/components/organisms/Welcome.astro');
const LANDING_EXAMPLE_PATH = resolve(process.cwd(), 'src/components/molecules/LandingExample.astro');
const HANDOUT_ARTICLE_PATH = resolve(process.cwd(), 'src/components/molecules/HandoutArticle.astro');

describe('getLandingExamples', () => {
  it('returns fantasy, horror, and scifi in that order', () => {
    expect(getLandingExamples().map((example) => example.category)).toEqual(['fantasy', 'horror', 'scifi']);
    expect(BACKGROUND_CATEGORY_OPTIONS).toEqual(['fantasy', 'horror', 'scifi']);
  });

  it('gives each sample a non-empty title and non-empty markdown', () => {
    for (const example of getLandingExamples()) {
      expect(example.title.trim()).not.toBe('');
      expect(example.markdown.trim()).not.toBe('');
    }
  });
});

describe('getLandingExampleCards', () => {
  it('returns the same categories and a non-empty html and cssBackground for each card', () => {
    const cards = getLandingExampleCards();

    expect(cards.map((card) => card.category)).toEqual(['fantasy', 'horror', 'scifi']);

    for (const card of cards) {
      expect(card.html.trim()).not.toBe('');
      expect(card.html).not.toContain('<a');
      expect(card.cssBackground).toBe(BACKGROUND_CONFIGS[card.category].cssBackground);
      expect(card.cssBackground.trim()).not.toBe('');
    }
  });
});

describe('landing examples source sync', () => {
  it('keeps the hero copy, both auth hrefs, and the examples section marker', () => {
    const welcomeSource = readFileSync(WELCOME_PATH, 'utf-8');

    expect(welcomeSource).toContain('Handouts Scriptorium');
    expect(welcomeSource).toContain('href="/auth/signin"');
    expect(welcomeSource).toContain('href="/auth/signup"');
    expect(welcomeSource).toContain('data-landing-examples');
  });

  it('places the examples section outside the hero max-w-4xl column', () => {
    const welcomeSource = readFileSync(WELCOME_PATH, 'utf-8');
    const heroIndex = welcomeSource.indexOf('max-w-4xl');
    const examplesIndex = welcomeSource.indexOf('data-landing-examples');

    expect(heroIndex).toBeGreaterThan(-1);
    expect(examplesIndex).toBeGreaterThan(heroIndex);
    expect(welcomeSource.slice(heroIndex, examplesIndex)).toContain('</div>');
    expect(welcomeSource).toContain('max-w-6xl');
  });

  it('marks the example card, honors reduced motion, and is not a link', () => {
    const cardSource = readFileSync(LANDING_EXAMPLE_PATH, 'utf-8');

    expect(cardSource).toContain('data-landing-example');
    expect(cardSource).toContain('prefers-reduced-motion');
    expect(cardSource).not.toContain('href');
  });

  it('does not import supabase from the sample module', () => {
    const sampleSource = readFileSync(LANDING_EXAMPLES_PATH, 'utf-8');

    expect(sampleSource).not.toContain('@/lib/supabase');
  });

  it('applies max-w-2xl on HandoutArticle only when class is omitted', () => {
    const articleSource = readFileSync(HANDOUT_ARTICLE_PATH, 'utf-8');

    expect(articleSource).toContain("className ?? 'max-w-2xl'");
    expect(articleSource).not.toMatch(/max-w-2xl p-4/);
  });
});
