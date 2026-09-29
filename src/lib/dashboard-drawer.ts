type DrawerPresentation = 'sidebar' | 'overlay';

interface DrawerPresentationInput {
  isWide: boolean;
}

function getDrawerPresentation(input: DrawerPresentationInput): DrawerPresentation {
  if (input.isWide) {
    return 'sidebar';
  }
  return 'overlay';
}

export { getDrawerPresentation };
export type { DrawerPresentation, DrawerPresentationInput };
