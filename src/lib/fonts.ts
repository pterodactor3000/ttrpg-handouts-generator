import type { BackgroundCategory } from '@/types';

interface FontConfig {
  fontFamily: string;
  fontColor: string;
}

const FONT_CONFIGS: Record<BackgroundCategory, FontConfig> = {
  fantasy: { fontFamily: "'Tisk', serif", fontColor: '#2c1810' },
  scifi: { fontFamily: "'Metalick', monospace", fontColor: '#39ff14' },
  horror: { fontFamily: "'Consul Typewriter', sans-serif", fontColor: '#1a1812' },
};

export type { FontConfig };
export { FONT_CONFIGS };
