const archivedStatusBadgeClassName =
  'inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium border-surface bg-surface text-muted-foreground';

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
  }

  const archiveAction = handoutCard.querySelector('[data-handout-archive-action]');
  archiveAction?.classList.add('hidden');

  const deleteAction = handoutCard.querySelector('[data-handout-delete-action]');
  deleteAction?.classList.remove('hidden');

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
  if (archivedGrid instanceof HTMLElement && archivedGrid.children.length === 0) {
    document.querySelector('[data-handout-list="archived"]')?.classList.add('hidden');
  }
}

export { moveHandoutCardToArchivedSection, removePermanentDeletedHandoutCard };
