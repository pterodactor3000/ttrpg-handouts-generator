import type { LinearIssue } from './types.js';

const ROADMAP_ID_RE = /\*\*Roadmap ID:\*\*\s*([FS]-\d+)/i;
const CHANGE_ID_RE = /\*\*Change ID:\*\*\s*`([^`]+)`/i;
const AC_HEADING_RE = /^##\s+(Acceptance criteria|Acceptance Criteria|AC)\s*$/im;

export function parseRoadmapId(description: string): string | null {
  return description.match(ROADMAP_ID_RE)?.[1] ?? null;
}

export function parseChangeId(description: string): string | null {
  return description.match(CHANGE_ID_RE)?.[1] ?? null;
}

export function hasAcceptanceCriteria(description: string): boolean {
  return AC_HEADING_RE.test(description);
}

export function isResolvedIssue(issue: Pick<LinearIssue, 'state' | 'labels'>): boolean {
  const type = issue.state.type;
  if (type === 'completed' || type === 'canceled') return true;
  return issue.labels.some((label) => label.name.toLowerCase() === 'duplicate');
}

export function isOpenIssue(issue: Pick<LinearIssue, 'state'>): boolean {
  const type = issue.state.type;
  return type !== 'completed' && type !== 'canceled';
}

export function isActiveOpenState(issue: Pick<LinearIssue, 'state'>): boolean {
  return ['unstarted', 'started', 'backlog'].includes(issue.state.type);
}

export function isStaleIssue(issue: Pick<LinearIssue, 'updatedAt'>, now: Date, thresholdDays: number): boolean {
  const updated = new Date(issue.updatedAt);
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  return now.getTime() - updated.getTime() >= thresholdMs;
}

export function priorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'Urgent';
    case 2:
      return 'High';
    case 3:
      return 'Medium';
    case 4:
      return 'Low';
    default:
      return 'None';
  }
}

export function extractRoadmapDrift(
  issues: LinearIssue[],
  roadmapStatuses: Map<string, string>,
): { roadmapId: string; roadmapStatus: string; linearStatus: string; linearId: string }[] {
  const drift: { roadmapId: string; roadmapStatus: string; linearStatus: string; linearId: string }[] = [];
  for (const issue of issues) {
    if (!issue.roadmapId) continue;
    const roadmapStatus = roadmapStatuses.get(issue.roadmapId);
    if (!roadmapStatus) continue;
    const linearDone = issue.state.type === 'completed';
    const roadmapDone = roadmapStatus === 'done';
    const roadmapProposed = roadmapStatus === 'proposed';
    if (linearDone && (roadmapProposed || roadmapStatus === 'ready')) {
      drift.push({
        roadmapId: issue.roadmapId,
        roadmapStatus,
        linearStatus: issue.state.name,
        linearId: issue.identifier,
      });
    }
  }
  return drift;
}

export function parseRoadmapAtAGlanceStatuses(repoRootContent: string): Map<string, string> {
  const statuses = new Map<string, string>();
  const tableStart = repoRootContent.indexOf('## At a glance');
  if (tableStart === -1) return statuses;
  const section = repoRootContent.slice(tableStart);
  const lines = section.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    if (line.includes('ID') && line.includes('Status')) continue;
    if (line.match(/^\|\s*[-| ]+\|/)) continue;
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 7) continue;
    const id = cells[0]?.replace(/^\*\*|\*\*$/g, '');
    const status = cells[cells.length - 1]?.toLowerCase();
    if (id && status && /^(F|S)-\d+$/.test(id)) {
      statuses.set(id, status);
    }
  }
  return statuses;
}
