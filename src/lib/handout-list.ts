import type { Handout } from '@/types';

type HandoutListItem = Pick<
  Handout,
  'id' | 'title' | 'tags' | 'status' | 'background_category' | 'share_token' | 'created_at'
>;

function partitionHandouts(handouts: HandoutListItem[]): {
  active: HandoutListItem[];
  archived: HandoutListItem[];
} {
  const active: HandoutListItem[] = [];
  const archived: HandoutListItem[] = [];

  for (const handout of handouts) {
    if (handout.status === 'archived') {
      archived.push(handout);
    } else {
      active.push(handout);
    }
  }

  const sortByNewestFirst = (left: HandoutListItem, right: HandoutListItem) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime();

  active.sort(sortByNewestFirst);
  archived.sort(sortByNewestFirst);

  return { active, archived };
}

export { partitionHandouts };
export type { HandoutListItem };
