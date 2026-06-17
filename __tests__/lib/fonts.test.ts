import { describe, expect, it } from 'vitest';
import { FONT_CONFIGS } from '@/lib/fonts';

describe('FONT_CONFIGS', () => {
  it('covers all three background categories', () => {
    expect(Object.keys(FONT_CONFIGS).sort()).toEqual(['fantasy', 'horror', 'scifi']);
  });

  it('maps fantasy to Tisk with dark sepia color', () => {
    const config = FONT_CONFIGS.fantasy;
    expect(config.fontFamily).toBe("'Tisk', serif");
    expect(config.fontFamily).toContain('Tisk');
    expect(config.fontColor).toBe('#2c1810');
  });

  it('maps scifi to Metalick with neon green color', () => {
    const config = FONT_CONFIGS.scifi;
    expect(config.fontFamily).toBe("'Metalick', monospace");
    expect(config.fontFamily).toContain('Metalick');
    expect(config.fontColor).toBe('#39ff14');
  });

  it('maps horror to Consul Typewriter with cream color', () => {
    const config = FONT_CONFIGS.horror;
    expect(config.fontFamily).toBe("'Consul Typewriter', sans-serif");
    expect(config.fontFamily).toContain('Consul Typewriter');
    expect(config.fontColor).toBe('#1a1812');
  });

  it('assigns non-empty fontFamily and fontColor to every category', () => {
    for (const category of Object.keys(FONT_CONFIGS)) {
      const config = FONT_CONFIGS[category as keyof typeof FONT_CONFIGS];
      expect(config.fontFamily.length).toBeGreaterThan(0);
      expect(config.fontColor.length).toBeGreaterThan(0);
    }
  });
});
