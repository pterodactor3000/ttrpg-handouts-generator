import type { Handout } from '@/types';

type HandoutListItem = Pick<
  Handout,
  'id' | 'title' | 'tags' | 'status' | 'background_category' | 'share_token' | 'created_at'
>;

interface HandoutsByStatus {
  draft: HandoutListItem[];
  published: HandoutListItem[];
  archived: HandoutListItem[];
}

function groupHandoutsByStatus(handouts: HandoutListItem[]): HandoutsByStatus {
  const draft: HandoutListItem[] = [];
  const published: HandoutListItem[] = [];
  const archived: HandoutListItem[] = [];

  for (const handout of handouts) {
    if (handout.status === 'draft') {
      draft.push(handout);
    } else if (handout.status === 'published') {
      published.push(handout);
    } else {
      archived.push(handout);
    }
  }

  const sortByNewestFirst = (left: HandoutListItem, right: HandoutListItem) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime();

  draft.sort(sortByNewestFirst);
  published.sort(sortByNewestFirst);
  archived.sort(sortByNewestFirst);

  return { draft, published, archived };
}

export { groupHandoutsByStatus };
export type { HandoutListItem };
