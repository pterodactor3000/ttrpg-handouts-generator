import { describe, expect, it } from 'vitest';

import { evaluateRetention, extractTrackedIds, isRetentionCandidate } from '../src/retention.js';
import type { LinearIssue } from '../src/types.js';

function issue(id: string, stateType: string): LinearIssue {
  return {
    id,
    identifier: id,
    title: id,
    url: `https://linear.app/x/issue/${id}`,
    description: '',
    updatedAt: '2026-06-01T00:00:00Z',
    priority: 0,
    state: { name: stateType, type: stateType },
    assignee: null,
    labels: [],
    blockedBy: [],
    roadmapId: null,
    changeId: null,
  };
}

describe('extractTrackedIds', () => {
  it('extracts Linear issue ids and PR numbers from report sections', () => {
    const content = `
## Open issues
| TEC-19 | foo |
## PRs to review
| [#42](https://github.com/o/r/pull/42) | title |
Review PR #55
`;
    const tracked = extractTrackedIds(content);
    expect(tracked.issueIds).toContain('TEC-19');
    expect(tracked.prNumbers).toEqual(expect.arrayContaining([42, 55]));
  });
});

describe('isRetentionCandidate', () => {
  it('marks files older than seven days as candidates', () => {
    const today = new Date(2026, 5, 29);
    const eightDaysAgo = new Date(2026, 5, 21);
    expect(isRetentionCandidate(eightDaysAgo, today, 7)).toBe(true);
    expect(isRetentionCandidate(new Date(2026, 5, 22), today, 7)).toBe(false);
  });
});

describe('evaluateRetention', () => {
  const today = new Date(2026, 5, 29);
  const oldDate = new Date(2026, 5, 15);

  it('deletes when all tracked issues and PRs are resolved', () => {
    const issuesById = new Map([['TEC-8', issue('TEC-8', 'completed')]]);
    const row = evaluateRetention({
      file: 'docs/reports/x.md',
      fileDate: oldDate,
      today,
      thresholdDays: 7,
      tracked: { issueIds: ['TEC-8'], prNumbers: [10] },
      issuesById,
      openPrNumbers: new Set(),
    });
    expect(row.decision).toBe('DELETE');
  });

  it('keeps when a tracked issue is still open', () => {
    const issuesById = new Map([['TEC-19', issue('TEC-19', 'unstarted')]]);
    const row = evaluateRetention({
      file: 'docs/reports/x.md',
      fileDate: oldDate,
      today,
      thresholdDays: 7,
      tracked: { issueIds: ['TEC-19'], prNumbers: [] },
      issuesById,
      openPrNumbers: new Set(),
    });
    expect(row.decision).toBe('KEEP');
    expect(row.reason).toContain('TEC-19');
  });

  it('keeps when a tracked PR is still open', () => {
    const row = evaluateRetention({
      file: 'docs/reports/x.md',
      fileDate: oldDate,
      today,
      thresholdDays: 7,
      tracked: { issueIds: [], prNumbers: [42] },
      issuesById: new Map(),
      openPrNumbers: new Set([42]),
    });
    expect(row.decision).toBe('KEEP');
    expect(row.reason).toContain('PR #42');
  });
});
