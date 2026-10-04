import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import { APP_VERSION, formatAppVersion } from '@/lib/app-version';

const LAYOUT_PATH = resolve(process.cwd(), 'src/layouts/Layout.astro');
const FOOTER_PATH = resolve(process.cwd(), 'src/components/atoms/PageVersionFooter.astro');
const SHARE_PATH = resolve(process.cwd(), 'src/pages/share/[token].astro');

describe('formatAppVersion', () => {
  it('returns v1.2.0 for 1.2.0', () => {
    expect(formatAppVersion('1.2.0')).toBe('v1.2.0');
  });
});

describe('APP_VERSION', () => {
  it('equals v plus the live package.json version', () => {
    expect(APP_VERSION).toBe(`v${packageJson.version}`);
  });
});

describe('version footer source sync', () => {
  it('imports APP_VERSION and PageVersionFooter, then mounts the footer after the slot and before the toaster', () => {
    const layoutSource = readFileSync(LAYOUT_PATH, 'utf-8');
    const bodySource = /<body>([\s\S]*)<\/body>/.exec(layoutSource)?.[1] ?? '';
    const slotIndex = bodySource.indexOf('<slot />');
    const footerIndex = bodySource.indexOf('<PageVersionFooter');
    const toasterIndex = bodySource.indexOf('<Toaster');

    expect(layoutSource).toContain("import { APP_VERSION } from '@/lib/app-version'");
    expect(layoutSource).toContain("import PageVersionFooter from '@/components/atoms/PageVersionFooter.astro'");
    expect(slotIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeGreaterThan(slotIndex);
    expect(toasterIndex).toBeGreaterThan(footerIndex);
  });

  it('keeps the footer in document flow with a data-page-version-footer marker', () => {
    const footerSource = readFileSync(FOOTER_PATH, 'utf-8');

    expect(footerSource).toContain('data-page-version-footer');
    expect(footerSource).not.toMatch(/\bfixed\b/);
    expect(footerSource).not.toMatch(/\bsticky\b/);
  });

  it('keeps the shared handout home link', () => {
    const shareSource = readFileSync(SHARE_PATH, 'utf-8');

    expect(shareSource).toContain('TTRPG Handouts Generator');
  });
});
