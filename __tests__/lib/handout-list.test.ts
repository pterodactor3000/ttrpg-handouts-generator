import { describe, expect, it } from 'vitest';
import { groupHandoutsByStatus, type HandoutListItem } from '@/lib/handout-list';

function createHandoutListItem(
  overrides: Partial<HandoutListItem> & Pick<HandoutListItem, 'id' | 'status' | 'created_at'>,
): HandoutListItem {
  return {
    title: 'Test handout',
    tags: [],
    background_category: 'fantasy',
    share_token: null,
    ...overrides,
  };
}

describe('groupHandoutsByStatus', () => {
  it('returns separate draft, published, and archived arrays ordered by created_at descending', () => {
    const olderDraft = createHandoutListItem({
      id: 'older-draft',
      status: 'draft',
      created_at: '2026-01-01T12:00:00.000Z',
    });
    const newerDraft = createHandoutListItem({
      id: 'newer-draft',
      status: 'draft',
      created_at: '2026-01-05T12:00:00.000Z',
    });
    const olderPublished = createHandoutListItem({
      id: 'older-published',
      status: 'published',
      created_at: '2026-01-02T12:00:00.000Z',
      share_token: 'older-published-token',
    });
    const newerPublished = createHandoutListItem({
      id: 'newer-published',
      status: 'published',
      created_at: '2026-01-04T12:00:00.000Z',
      share_token: 'newer-published-token',
    });
    const olderArchived = createHandoutListItem({
      id: 'older-archived',
      status: 'archived',
      created_at: '2026-01-03T12:00:00.000Z',
      share_token: 'older-archived-token',
    });
    const newerArchived = createHandoutListItem({
      id: 'newer-archived',
      status: 'archived',
      created_at: '2026-01-06T12:00:00.000Z',
      share_token: 'newer-archived-token',
    });

    const result = groupHandoutsByStatus([
      olderDraft,
      newerDraft,
      olderPublished,
      newerPublished,
      olderArchived,
      newerArchived,
    ]);

    expect(result.draft.map((handout) => handout.id)).toEqual(['newer-draft', 'older-draft']);
    expect(result.published.map((handout) => handout.id)).toEqual(['newer-published', 'older-published']);
    expect(result.archived.map((handout) => handout.id)).toEqual(['newer-archived', 'older-archived']);
  });

  it('returns empty draft, published, and archived arrays for empty input', () => {
    expect(groupHandoutsByStatus([])).toEqual({ draft: [], published: [], archived: [] });
  });

  it('returns empty draft and published arrays when all handouts are archived', () => {
    const archivedHandout = createHandoutListItem({
      id: 'archived-only',
      status: 'archived',
      created_at: '2026-01-01T12:00:00.000Z',
      share_token: 'archived-token',
    });

    const result = groupHandoutsByStatus([archivedHandout]);

    expect(result.draft).toEqual([]);
    expect(result.published).toEqual([]);
    expect(result.archived).toEqual([archivedHandout]);
  });
});
