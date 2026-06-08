import { describe, expect, it } from 'vitest';
import { partitionHandouts, type HandoutListItem } from '@/lib/handout-list';

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

describe('partitionHandouts', () => {
  it('places drafts and published handouts in active and archived handouts in archived', () => {
    const draftHandout = createHandoutListItem({
      id: 'draft-1',
      status: 'draft',
      created_at: '2026-01-01T12:00:00.000Z',
    });
    const publishedHandout = createHandoutListItem({
      id: 'published-1',
      status: 'published',
      created_at: '2026-01-02T12:00:00.000Z',
      share_token: 'published-token',
    });
    const archivedHandout = createHandoutListItem({
      id: 'archived-1',
      status: 'archived',
      created_at: '2026-01-03T12:00:00.000Z',
      share_token: 'archived-token',
    });

    const result = partitionHandouts([draftHandout, publishedHandout, archivedHandout]);

    expect(result.active.map((handout) => handout.id)).toEqual(['published-1', 'draft-1']);
    expect(result.archived.map((handout) => handout.id)).toEqual(['archived-1']);
  });

  it('sorts active and archived groups by created_at descending', () => {
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
    const olderArchived = createHandoutListItem({
      id: 'older-archived',
      status: 'archived',
      created_at: '2026-01-02T12:00:00.000Z',
      share_token: 'older-token',
    });
    const newerArchived = createHandoutListItem({
      id: 'newer-archived',
      status: 'archived',
      created_at: '2026-01-06T12:00:00.000Z',
      share_token: 'newer-token',
    });

    const result = partitionHandouts([olderDraft, newerDraft, olderArchived, newerArchived]);

    expect(result.active.map((handout) => handout.id)).toEqual(['newer-draft', 'older-draft']);
    expect(result.archived.map((handout) => handout.id)).toEqual(['newer-archived', 'older-archived']);
  });

  it('returns empty active and archived arrays for empty input', () => {
    expect(partitionHandouts([])).toEqual({ active: [], archived: [] });
  });

  it('returns empty active when all handouts are archived', () => {
    const archivedHandout = createHandoutListItem({
      id: 'archived-only',
      status: 'archived',
      created_at: '2026-01-01T12:00:00.000Z',
      share_token: 'archived-token',
    });

    const result = partitionHandouts([archivedHandout]);

    expect(result.active).toEqual([]);
    expect(result.archived).toEqual([archivedHandout]);
  });
});
