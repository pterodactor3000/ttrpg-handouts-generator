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

  archiveButtonContainer.remove();

  const cardFooter = handoutCard.querySelector('[data-handout-card-footer]');
  if (cardFooter instanceof HTMLElement) {
    if (cardFooter.children.length === 0) {
      cardFooter.remove();
    } else {
      cardFooter.classList.remove('justify-between');
      cardFooter.classList.add('justify-end');
    }
  }

  archivedGrid.prepend(handoutCard);
}

export { moveHandoutCardToArchivedSection };
