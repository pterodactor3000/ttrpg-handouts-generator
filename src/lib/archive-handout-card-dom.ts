const archivedStatusBadgeClassName =
  'inline-flex shrink-0 rounded-[0.5rem] border px-2.5 py-0.5 text-xs font-medium border-border bg-muted text-muted-foreground';

const restoredStatusBadgeClassNames = {
  draft:
    'inline-flex shrink-0 rounded-[0.5rem] border px-2.5 py-0.5 text-xs font-medium border-border bg-muted text-muted-foreground',
  published:
    'inline-flex shrink-0 rounded-[0.5rem] border px-2.5 py-0.5 text-xs font-medium border-primary/30 bg-primary/10 text-primary',
} as const;

const restoredStatusBadgeLabels = {
  draft: 'Draft',
  published: 'Published',
} as const;

const plainTitleClassName = 'text-foreground min-w-0 flex-1 truncate text-lg font-semibold';
const linkedTitleClassName =
  'text-foreground hover:text-primary min-w-0 flex-1 truncate text-lg font-semibold transition-colors';

interface MoveRestoredHandoutCardOptions {
  restoreButtonContainer: HTMLElement;
  targetStatus: 'draft' | 'published';
  shareToken: string | null;
}

function replaceTitleElement(titleElement: HTMLElement, replacement: HTMLElement): void {
  titleElement.replaceWith(replacement);
}

function setRestoredHandoutTitle(
  handoutCard: Element,
  targetStatus: 'draft' | 'published',
  shareToken: string | null,
): void {
  const titleElement = handoutCard.querySelector('[data-handout-title]');
  if (!(titleElement instanceof HTMLElement)) {
    return;
  }

  const titleText = titleElement.textContent;
  const titleAttribute = titleElement.getAttribute('title') ?? titleText;

  if (targetStatus === 'draft') {
    if (titleElement.tagName === 'H3') {
      return;
    }
    const heading = document.createElement('h3');
    heading.className = plainTitleClassName;
    heading.setAttribute('data-handout-title', '');
    heading.setAttribute('title', titleAttribute);
    heading.textContent = titleText;
    replaceTitleElement(titleElement, heading);
    return;
  }

  if (shareToken === null) {
    return;
  }

  if (titleElement instanceof HTMLAnchorElement) {
    titleElement.setAttribute('href', `/share/${shareToken}`);
    titleElement.target = '_blank';
    return;
  }

  const titleLink = document.createElement('a');
  titleLink.className = linkedTitleClassName;
  titleLink.setAttribute('data-handout-title', '');
  titleLink.setAttribute('title', titleAttribute);
  titleLink.setAttribute('href', `/share/${shareToken}`);
  titleLink.target = '_blank';
  titleLink.textContent = titleText;
  replaceTitleElement(titleElement, titleLink);
}

function ensurePublishedCopyControl(handoutCard: Element, shareToken: string): void {
  const existingCopyAction = handoutCard.querySelector('[data-handout-copy-action]');
  if (existingCopyAction instanceof HTMLElement) {
    existingCopyAction.classList.remove('hidden');
    return;
  }

  const cardFooter = handoutCard.querySelector('[data-handout-card-footer]');
  if (!(cardFooter instanceof HTMLElement)) {
    return;
  }

  const copyAction = document.createElement('span');
  copyAction.setAttribute('data-handout-copy-action', '');
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = 'Copy link';
  copyButton.addEventListener('click', () => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;
    void navigator.clipboard.writeText(shareUrl).catch((copyError: unknown) => {
      console.error('Failed to copy restored share link:', copyError);
      copyButton.textContent = 'Copy failed';
    });
  });
  copyAction.append(copyButton);
  cardFooter.append(copyAction);
}

function moveRestoredHandoutCard(options: MoveRestoredHandoutCardOptions): void {
  const { restoreButtonContainer, targetStatus, shareToken } = options;
  const handoutCard = restoreButtonContainer.closest('article');
  if (!handoutCard) {
    return;
  }

  const targetGrid = document.querySelector(`[data-handout-grid="${targetStatus}"]`);
  if (!targetGrid) {
    return;
  }

  const statusBadge = handoutCard.querySelector('[data-status-badge]');
  if (statusBadge) {
    statusBadge.textContent = restoredStatusBadgeLabels[targetStatus];
    statusBadge.className = restoredStatusBadgeClassNames[targetStatus];
    statusBadge.setAttribute('data-status', targetStatus);
  }

  handoutCard.querySelector('[data-handout-edit-action]')?.classList.remove('hidden');
  handoutCard.querySelector('[data-handout-archive-action]')?.classList.remove('hidden');
  handoutCard.querySelector('[data-handout-delete-action]')?.classList.add('hidden');
  handoutCard.querySelector('[data-handout-restore-action]')?.classList.add('hidden');

  const copyAction = handoutCard.querySelector('[data-handout-copy-action]');
  if (targetStatus === 'draft') {
    copyAction?.classList.add('hidden');
  } else if (copyAction instanceof HTMLElement) {
    copyAction.classList.remove('hidden');
  } else if (shareToken !== null) {
    ensurePublishedCopyControl(handoutCard, shareToken);
  }

  setRestoredHandoutTitle(handoutCard, targetStatus, shareToken);
  targetGrid.prepend(handoutCard);
}

function moveHandoutCardToArchivedSection(archiveButtonContainer: HTMLElement): void {
  const handoutCard = archiveButtonContainer.closest('article');
  if (!handoutCard) {
    return;
  }

  const archivedGrid = document.querySelector('[data-handout-grid="archived"]');
  if (!archivedGrid) {
    handoutCard.remove();
    return;
  }

  const archivedSection = document.querySelector('[data-handout-list="archived"]');
  archivedSection?.classList.remove('hidden');

  const statusBadge = handoutCard.querySelector('[data-status-badge]');
  if (statusBadge) {
    statusBadge.textContent = 'Archived';
    statusBadge.className = archivedStatusBadgeClassName;
    statusBadge.setAttribute('data-status', 'archived');
  }

  const archiveAction = handoutCard.querySelector('[data-handout-archive-action]');
  archiveAction?.classList.add('hidden');

  const editAction = handoutCard.querySelector('[data-handout-edit-action]');
  editAction?.classList.add('hidden');

  const deleteAction = handoutCard.querySelector('[data-handout-delete-action]');
  deleteAction?.classList.remove('hidden');

  const restoreAction = handoutCard.querySelector('[data-handout-restore-action]');
  restoreAction?.classList.remove('hidden');

  const cardFooter = handoutCard.querySelector('[data-handout-card-footer]');
  if (cardFooter instanceof HTMLElement) {
    cardFooter.classList.remove('justify-end');
    cardFooter.classList.add('justify-between');
  }

  archivedGrid.prepend(handoutCard);
}

function removePermanentDeletedHandoutCard(deleteButtonContainer: HTMLElement): void {
  const handoutCard = deleteButtonContainer.closest('article');
  if (!handoutCard) {
    return;
  }

  handoutCard.remove();

  const archivedGrid = document.querySelector('[data-handout-grid="archived"]');
  if (!(archivedGrid instanceof HTMLElement) || archivedGrid.children.length > 0) {
    return;
  }

  const dashboard = document.querySelector('[data-dashboard][data-status-filter]');
  if (dashboard) {
    return;
  }

  document.querySelector('[data-handout-list="archived"]')?.classList.add('hidden');
}

export { moveHandoutCardToArchivedSection, moveRestoredHandoutCard, removePermanentDeletedHandoutCard };
