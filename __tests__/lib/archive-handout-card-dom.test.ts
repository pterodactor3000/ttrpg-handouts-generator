// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  moveHandoutCardToArchivedSection,
  moveRestoredHandoutCard,
  removePermanentDeletedHandoutCard,
} from '@/lib/archive-handout-card-dom';

describe('moveHandoutCardToArchivedSection', () => {
  it('sets data-status to archived so a published chip does not stay purple', () => {
    document.body.innerHTML = `
      <section data-handout-list="archived" class="hidden">
        <div data-handout-grid="archived"></div>
      </section>
      <article>
        <span data-status-badge data-status="published" class="border-primary/30 bg-primary/10 text-primary">Published</span>
        <div data-handout-card-footer class="justify-end">
          <span data-handout-edit-action></span>
          <span data-handout-archive-action><span id="archive-root"></span></span>
          <span data-handout-delete-action class="hidden"></span>
        </div>
      </article>
    `;

    const archiveRoot = document.getElementById('archive-root');
    expect(archiveRoot).toBeInstanceOf(HTMLElement);
    if (!(archiveRoot instanceof HTMLElement)) {
      return;
    }

    moveHandoutCardToArchivedSection(archiveRoot);

    const badge = document.querySelector('[data-status-badge]');
    expect(badge?.textContent).toBe('Archived');
    expect(badge?.getAttribute('data-status')).toBe('archived');
    expect(badge?.className).toContain('bg-muted');
    expect(badge?.className).toContain('text-muted-foreground');
    expect(badge?.className).not.toContain('bg-primary/10');

    expect(document.querySelector('[data-handout-grid="archived"]')?.firstElementChild?.tagName).toBe('ARTICLE');
    expect(document.querySelector('[data-handout-list="archived"]')?.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-edit-action]')?.classList.contains('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-delete-action]')?.classList.contains('hidden')).toBe(false);
  });

  it('keeps the hidden attribute on the archived section after the card moves', () => {
    document.body.innerHTML = `
      <section data-handout-list="archived" hidden>
        <div data-handout-grid="archived"></div>
      </section>
      <article>
        <span data-status-badge data-status="draft">Draft</span>
        <div data-handout-card-footer class="justify-end">
          <span data-handout-edit-action></span>
          <span data-handout-archive-action><span id="archive-root"></span></span>
          <span data-handout-delete-action class="hidden"></span>
        </div>
      </article>
    `;

    const archiveRoot = document.getElementById('archive-root');
    expect(archiveRoot).toBeInstanceOf(HTMLElement);
    if (!(archiveRoot instanceof HTMLElement)) {
      return;
    }

    moveHandoutCardToArchivedSection(archiveRoot);

    const archivedSection = document.querySelector('[data-handout-list="archived"]');
    expect(archivedSection?.hasAttribute('hidden')).toBe(true);
    expect(archivedSection?.classList.contains('hidden')).toBe(false);
    expect(document.querySelector('[data-handout-grid="archived"]')?.firstElementChild?.tagName).toBe('ARTICLE');
  });
});

describe('moveRestoredHandoutCard', () => {
  it('moves a draft restore into the draft grid and hides copy and delete', () => {
    document.body.innerHTML = `
      <style>
        [data-handout-grid]:has(article) + [data-handout-empty] { display: none; }
      </style>
      <section data-handout-list="draft" hidden>
        <div data-handout-grid="draft"></div>
      </section>
      <section data-handout-list="archived">
        <div data-handout-grid="archived">
          <article>
            <a data-handout-title href="/share/existing-token">Old letter</a>
            <span data-status-badge data-status="archived" class="bg-muted text-muted-foreground">Archived</span>
            <div data-handout-card-footer>
              <span data-handout-edit-action class="hidden"></span>
              <span data-handout-archive-action class="hidden"></span>
              <span data-handout-delete-action></span>
              <span data-handout-restore-action><span id="restore-root"></span></span>
            </div>
            <span data-handout-copy-action></span>
          </article>
        </div>
        <p data-handout-empty>No archived handouts.</p>
      </section>
    `;

    const restoreRoot = document.getElementById('restore-root');
    expect(restoreRoot).toBeInstanceOf(HTMLElement);
    if (!(restoreRoot instanceof HTMLElement)) {
      return;
    }

    moveRestoredHandoutCard({
      restoreButtonContainer: restoreRoot,
      targetStatus: 'draft',
      shareToken: 'existing-token',
    });

    const draftGrid = document.querySelector('[data-handout-grid="draft"]');
    const archivedGrid = document.querySelector('[data-handout-grid="archived"]');
    const card = draftGrid?.querySelector('article');
    const badge = card?.querySelector('[data-status-badge]');

    expect(card).not.toBeNull();
    expect(archivedGrid?.querySelector('article')).toBeNull();
    expect(document.querySelector('[data-handout-list="draft"]')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[data-handout-list="archived"]')?.hasAttribute('hidden')).toBe(false);
    expect(badge?.textContent).toBe('Draft');
    expect(badge?.getAttribute('data-status')).toBe('draft');
    expect(badge?.className).toContain('bg-muted');
    expect(badge?.className).not.toContain('bg-primary/10');
    expect(card?.querySelector('[data-handout-edit-action]')?.classList.contains('hidden')).toBe(false);
    expect(card?.querySelector('[data-handout-archive-action]')?.classList.contains('hidden')).toBe(false);
    expect(card?.querySelector('[data-handout-delete-action]')?.classList.contains('hidden')).toBe(true);
    expect(card?.querySelector('[data-handout-copy-action]')?.classList.contains('hidden')).toBe(true);
    expect(card?.querySelector('[data-handout-restore-action]')?.classList.contains('hidden')).toBe(true);
    expect(card?.querySelector('[data-handout-title]')?.tagName).toBe('H3');
    expect(card?.querySelector('[data-handout-title]')?.textContent).toBe('Old letter');

    const emptyCopy = document.querySelector('[data-handout-empty]');
    expect(emptyCopy).toBeInstanceOf(HTMLElement);
    if (emptyCopy instanceof HTMLElement) {
      expect(getComputedStyle(emptyCopy).display).not.toBe('none');
    }
  });

  it('shows an existing copy control when the card is restored to published', () => {
    document.body.innerHTML = `
      <section data-handout-list="published" hidden>
        <div data-handout-grid="published"></div>
      </section>
      <section data-handout-list="archived">
        <div data-handout-grid="archived">
          <article>
            <a data-handout-title href="/share/kept-token">Kept letter</a>
            <span data-status-badge data-status="archived">Archived</span>
            <div data-handout-card-footer>
              <span data-handout-edit-action class="hidden"></span>
              <span data-handout-archive-action class="hidden"></span>
              <span data-handout-delete-action></span>
              <span data-handout-restore-action><span id="restore-root"></span></span>
              <span data-handout-copy-action class="hidden"></span>
            </div>
          </article>
        </div>
      </section>
    `;

    const restoreRoot = document.getElementById('restore-root');
    expect(restoreRoot).toBeInstanceOf(HTMLElement);
    if (!(restoreRoot instanceof HTMLElement)) {
      return;
    }

    moveRestoredHandoutCard({
      restoreButtonContainer: restoreRoot,
      targetStatus: 'published',
      shareToken: 'kept-token',
    });

    const card = document.querySelector('[data-handout-grid="published"] article');
    const badge = card?.querySelector('[data-status-badge]');
    const titleLink = card?.querySelector('[data-handout-title]');

    expect(badge?.textContent).toBe('Published');
    expect(badge?.getAttribute('data-status')).toBe('published');
    expect(badge?.className).toContain('bg-primary/10');
    expect(badge?.className).toContain('text-primary');
    expect(card?.querySelector('[data-handout-copy-action]')?.classList.contains('hidden')).toBe(false);
    expect(titleLink?.tagName).toBe('A');
    expect(titleLink?.getAttribute('href')).toBe('/share/kept-token');
    expect(document.querySelector('[data-handout-list="published"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('adds a title link and copy control when published restore mints a token', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    document.body.innerHTML = `
      <section data-handout-list="published" hidden>
        <div data-handout-grid="published"></div>
      </section>
      <article>
        <h3 data-handout-title title="New letter">New letter</h3>
        <span data-status-badge data-status="archived">Archived</span>
        <div data-handout-card-footer>
          <span data-handout-edit-action class="hidden"></span>
          <span data-handout-archive-action class="hidden"></span>
          <span data-handout-delete-action></span>
          <span data-handout-restore-action><span id="restore-root"></span></span>
        </div>
      </article>
    `;

    const restoreRoot = document.getElementById('restore-root');
    expect(restoreRoot).toBeInstanceOf(HTMLElement);
    if (!(restoreRoot instanceof HTMLElement)) {
      return;
    }

    moveRestoredHandoutCard({
      restoreButtonContainer: restoreRoot,
      targetStatus: 'published',
      shareToken: 'minted-token',
    });

    const card = document.querySelector('article');
    const copyButton = card?.querySelector('[data-handout-copy-action] button');
    expect(card?.parentElement?.getAttribute('data-handout-grid')).toBe('published');
    expect(card?.querySelector('[data-handout-title]')?.getAttribute('href')).toBe('/share/minted-token');
    expect(copyButton).toBeInstanceOf(HTMLButtonElement);
    if (!(copyButton instanceof HTMLButtonElement)) {
      return;
    }

    copyButton.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/minted-token`);
  });
});

describe('removePermanentDeletedHandoutCard', () => {
  it('does not add the hidden class when a status filter is active', () => {
    document.body.innerHTML = `
      <div data-dashboard data-status-filter="archived">
        <section data-handout-list="archived" hidden>
          <div data-handout-grid="archived">
            <article>
              <span data-handout-delete-action><span id="delete-root"></span></span>
            </article>
          </div>
        </section>
      </div>
    `;

    const deleteRoot = document.getElementById('delete-root');
    expect(deleteRoot).toBeInstanceOf(HTMLElement);
    if (!(deleteRoot instanceof HTMLElement)) {
      return;
    }

    removePermanentDeletedHandoutCard(deleteRoot);

    const archivedSection = document.querySelector('[data-handout-list="archived"]');
    expect(document.querySelector('article')).toBeNull();
    expect(archivedSection?.classList.contains('hidden')).toBe(false);
    expect(archivedSection?.hasAttribute('hidden')).toBe(true);
  });
});
