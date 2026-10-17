import { describe, expect, it } from 'vitest';

import { hasAcceptanceCriteria, isResolvedIssue, parseChangeId, parseRoadmapId } from '../src/issue-utils.js';

describe('issue-utils', () => {
  it('parses roadmap and change ids from descriptions', () => {
    const description = '**Roadmap ID:** S-10 | **Change ID:** `square-ui-containers`';
    expect(parseRoadmapId(description)).toBe('S-10');
    expect(parseChangeId(description)).toBe('square-ui-containers');
  });

  it('detects acceptance criteria headings', () => {
    expect(hasAcceptanceCriteria('## Acceptance criteria\n- [ ] foo')).toBe(true);
    expect(hasAcceptanceCriteria('no ac here')).toBe(false);
  });

  it('treats duplicate label as resolved', () => {
    expect(
      isResolvedIssue({
        state: { name: 'Canceled', type: 'canceled' },
        labels: [{ name: 'duplicate' }],
      }),
    ).toBe(true);
  });
});
