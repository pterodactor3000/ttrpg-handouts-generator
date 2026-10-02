// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

const HANDOUT_LIST_TYPE_EMPTY_STYLE = `
  [data-handout-grid]:has(article) + [data-handout-empty] { display: none; }
  [data-handout-type-empty] { display: none; }
  [data-handout-grid]:has([data-handout-card][data-type-hidden]):not(:has([data-handout-card]:not([data-type-hidden]))) ~ [data-handout-type-empty] { display: block; }
  article[data-handout-card][data-type-hidden] { display: none; }
`;

function renderDraftList(cards: string): void {
  document.body.innerHTML = `
    <style>${HANDOUT_LIST_TYPE_EMPTY_STYLE}</style>
    <section data-handout-list="draft">
      <div data-handout-grid="draft">${cards}</div>
      <div data-handout-empty>
        <p>No drafts.</p>
        <a href="/handouts/new">Create your first handout</a>
      </div>
      <p class="text-muted-foreground" data-handout-type-empty>No handouts of this type.</p>
    </section>
  `;
}

function expectElement(element: Element | null): HTMLElement {
  expect(element).toBeInstanceOf(HTMLElement);
  if (!(element instanceof HTMLElement)) {
    throw new Error('expected an HTMLElement');
  }
  return element;
}

describe('handout list type empty copy', () => {
  it('shows the status sentence when the grid has no articles', () => {
    renderDraftList('');

    const emptyCopy = expectElement(document.querySelector('[data-handout-empty]'));
    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));

    expect(emptyCopy.textContent).toContain('No drafts.');
    expect(getComputedStyle(emptyCopy).display).not.toBe('none');
    expect(getComputedStyle(typeEmpty).display).toBe('none');
  });

  it('hides both empty sentences when a card has no data-type-hidden', () => {
    renderDraftList('<article data-handout-card data-background-category="fantasy"></article>');

    const emptyCopy = expectElement(document.querySelector('[data-handout-empty]'));
    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));

    expect(getComputedStyle(emptyCopy).display).toBe('none');
    expect(getComputedStyle(typeEmpty).display).toBe('none');
  });

  it('shows the type sentence and hides the create link when every card is type-hidden', () => {
    renderDraftList(
      '<article data-handout-card data-background-category="fantasy" data-type-hidden></article><article data-handout-card data-background-category="horror" data-type-hidden></article>',
    );

    const emptyCopy = expectElement(document.querySelector('[data-handout-empty]'));
    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));
    const createLink = expectElement(emptyCopy.querySelector('a'));

    expect(getComputedStyle(emptyCopy).display).toBe('none');
    expect(typeEmpty.textContent).toBe('No handouts of this type.');
    expect(getComputedStyle(typeEmpty).display).toBe('block');
    expect(getComputedStyle(createLink).display).toBe('inline');
    expect(createLink.closest('[data-handout-empty]')).toBe(emptyCopy);
  });
});
