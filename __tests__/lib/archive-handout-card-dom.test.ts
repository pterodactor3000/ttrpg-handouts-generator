// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { moveHandoutCardToArchivedSection } from '@/lib/archive-handout-card-dom';

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
});
