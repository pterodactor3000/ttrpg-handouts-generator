// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

const HANDOUT_LIST_SEARCH_EMPTY_STYLE = `
  [data-handout-grid]:has(article) + [data-handout-empty] { display: none; }
  [data-handout-type-empty] { display: none; }
  [data-handout-grid]:has([data-handout-card][data-type-hidden]):not(:has([data-handout-card]:not([data-type-hidden]))) ~ [data-handout-type-empty] { display: block; }
  [data-handout-search-empty] { display: none; }
  [data-handout-grid]:has([data-handout-card][data-search-hidden]:not([data-type-hidden])):not(:has([data-handout-card]:not([data-type-hidden]):not([data-search-hidden]))) ~ [data-handout-search-empty] { display: block; }
  article[data-handout-card][data-type-hidden] { display: none; }
  article[data-handout-card][data-search-hidden] { display: none; }
`;

function renderDraftList(cards: string): void {
  document.body.innerHTML = `
    <style>${HANDOUT_LIST_SEARCH_EMPTY_STYLE}</style>
    <section data-handout-list="draft">
      <div data-handout-grid="draft">${cards}</div>
      <div data-handout-empty>
        <p>No drafts.</p>
        <a href="/handouts/new">Create your first handout</a>
      </div>
      <p class="text-muted-foreground" data-handout-type-empty>No handouts of this type.</p>
      <p class="text-muted-foreground" data-handout-search-empty>No handouts match this search.</p>
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

describe('handout list search empty copy', () => {
  it('shows the status sentence when the grid has no articles', () => {
    renderDraftList('');

    const emptyCopy = expectElement(document.querySelector('[data-handout-empty]'));
    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));
    const searchEmpty = expectElement(document.querySelector('[data-handout-search-empty]'));

    expect(emptyCopy.textContent).toContain('No drafts.');
    expect(getComputedStyle(emptyCopy).display).not.toBe('none');
    expect(getComputedStyle(typeEmpty).display).toBe('none');
    expect(getComputedStyle(searchEmpty).display).toBe('none');
  });

  it('hides every empty sentence when a card has neither hide attribute', () => {
    renderDraftList('<article data-handout-card data-background-category="fantasy"></article>');

    const emptyCopy = expectElement(document.querySelector('[data-handout-empty]'));
    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));
    const searchEmpty = expectElement(document.querySelector('[data-handout-search-empty]'));

    expect(getComputedStyle(emptyCopy).display).toBe('none');
    expect(getComputedStyle(typeEmpty).display).toBe('none');
    expect(getComputedStyle(searchEmpty).display).toBe('none');
  });

  it('shows the search sentence when every card that is not type-hidden is search-hidden', () => {
    renderDraftList(
      '<article data-handout-card data-background-category="fantasy" data-search-hidden></article><article data-handout-card data-background-category="horror" data-search-hidden></article>',
    );

    const emptyCopy = expectElement(document.querySelector('[data-handout-empty]'));
    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));
    const searchEmpty = expectElement(document.querySelector('[data-handout-search-empty]'));
    const createLink = expectElement(emptyCopy.querySelector('a'));

    expect(getComputedStyle(emptyCopy).display).toBe('none');
    expect(getComputedStyle(typeEmpty).display).toBe('none');
    expect(searchEmpty.textContent).toBe('No handouts match this search.');
    expect(getComputedStyle(searchEmpty).display).toBe('block');
    expect(getComputedStyle(createLink).display).toBe('inline');
    expect(createLink.closest('[data-handout-empty]')).toBe(emptyCopy);
  });

  it('shows the type sentence when every card is type-hidden, including cards that are also search-hidden', () => {
    renderDraftList(
      '<article data-handout-card data-background-category="fantasy" data-type-hidden data-search-hidden></article><article data-handout-card data-background-category="horror" data-type-hidden data-search-hidden></article>',
    );

    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));
    const searchEmpty = expectElement(document.querySelector('[data-handout-search-empty]'));

    expect(typeEmpty.textContent).toBe('No handouts of this type.');
    expect(getComputedStyle(typeEmpty).display).toBe('block');
    expect(getComputedStyle(searchEmpty).display).toBe('none');
  });

  it('shows the search sentence when one card is type-hidden and another is search-hidden', () => {
    renderDraftList(
      '<article data-handout-card data-background-category="fantasy" data-type-hidden></article><article data-handout-card data-background-category="horror" data-search-hidden></article>',
    );

    const typeEmpty = expectElement(document.querySelector('[data-handout-type-empty]'));
    const searchEmpty = expectElement(document.querySelector('[data-handout-search-empty]'));

    expect(getComputedStyle(typeEmpty).display).toBe('none');
    expect(searchEmpty.textContent).toBe('No handouts match this search.');
    expect(getComputedStyle(searchEmpty).display).toBe('block');
  });
});
