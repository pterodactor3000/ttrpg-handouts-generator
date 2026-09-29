type DrawerPresentation = 'sidebar' | 'overlay';

interface DrawerPresentationInput {
  isPinned: boolean;
  isWide: boolean;
}

function getDrawerPresentation(input: DrawerPresentationInput): DrawerPresentation {
  if (input.isPinned && input.isWide) {
    return 'sidebar';
  }
  return 'overlay';
}

export { getDrawerPresentation };
export type { DrawerPresentation, DrawerPresentationInput };
