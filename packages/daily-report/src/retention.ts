import { readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { formatReportDate, parseReportDateFromFilename } from './config.js';
import { isResolvedIssue } from './issue-utils.js';
import type { LinearIssue, RetentionDecision, RetentionRow, TrackedIds } from './types.js';

const ISSUE_ID_RE = /\b([A-Z]{2,10}-\d+)\b/g;
const PR_NUMBER_RE = /\b(?:PR\s+#|pull\/)(?<num>\d+)\b/gi;
const HASH_PR_RE = /(?<![\w-])#(?<num>\d+)\b/g;

const RESERVED_FILES = new Set(['_goal.md', '_plan.md', 'README.md']);

export function extractTrackedIds(content: string): TrackedIds {
  const issueSet = new Set<string>();
  const prSet = new Set<number>();

  for (const match of content.matchAll(ISSUE_ID_RE)) {
    issueSet.add(match[1]!);
  }

  for (const match of content.matchAll(PR_NUMBER_RE)) {
    const num = Number(match.groups?.num);
    if (!Number.isNaN(num)) prSet.add(num);
  }

  // Only treat #N as PR when it appears in PR/review context lines
  for (const line of content.split('\n')) {
    if (!/PR|pull\/|review|Review ready|PRs to review/i.test(line)) continue;
    for (const match of line.matchAll(HASH_PR_RE)) {
      const num = Number(match.groups?.num);
      if (!Number.isNaN(num)) prSet.add(num);
    }
  }

  return {
    issueIds: [...issueSet].sort(),
    prNumbers: [...prSet].sort((a, b) => a - b),
  };
}

export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

export function isRetentionCandidate(fileDate: Date, today: Date, thresholdDays: number): boolean {
  return daysBetween(fileDate, today) > thresholdDays;
}

export function evaluateRetention(params: {
  file: string;
  fileDate: Date;
  today: Date;
  thresholdDays: number;
  tracked: TrackedIds;
  issuesById: Map<string, LinearIssue>;
  openPrNumbers: Set<number>;
}): RetentionRow {
  const { file, fileDate, today, thresholdDays, tracked, issuesById, openPrNumbers } = params;
  const ageDays = daysBetween(fileDate, today);
  const basename = file.split('/').pop() ?? file;

  if (!isRetentionCandidate(fileDate, today, thresholdDays)) {
    return { file: basename, ageDays, decision: 'SKIP', reason: 'Within retention window' };
  }

  const unresolvedIssues: string[] = [];
  for (const id of tracked.issueIds) {
    const issue = issuesById.get(id);
    if (!issue) {
      unresolvedIssues.push(`${id} (not found — keep)`);
      continue;
    }
    if (!isResolvedIssue(issue)) {
      unresolvedIssues.push(`${id} still ${issue.state.name}`);
    }
  }

  const unresolvedPrs: string[] = [];
  for (const num of tracked.prNumbers) {
    if (openPrNumbers.has(num)) {
      unresolvedPrs.push(`PR #${num} still open`);
    }
  }

  if (unresolvedIssues.length > 0 || unresolvedPrs.length > 0) {
    const reason = [...unresolvedIssues, ...unresolvedPrs].join('; ');
    return { file: basename, ageDays, decision: 'KEEP', reason };
  }

  if (tracked.issueIds.length === 0 && tracked.prNumbers.length === 0) {
    return { file: basename, ageDays, decision: 'KEEP', reason: 'No tracked ids — conservative keep' };
  }

  return { file: basename, ageDays, decision: 'DELETE', reason: 'All tracked issues and PRs resolved' };
}

export function listReportFiles(reportsDir: string, projectName: string): string[] {
  return readdirSync(reportsDir)
    .filter((name) => name.startsWith(`${projectName}-`) && name.endsWith('.md'))
    .filter((name) => !RESERVED_FILES.has(name))
    .map((name) => join(reportsDir, name));
}

export function planRetention(params: {
  reportsDir: string;
  projectName: string;
  today: Date;
  todayFilename: string;
  thresholdDays: number;
  issues: LinearIssue[];
  openPrNumbers: Set<number>;
}): { rows: RetentionRow[]; toDelete: string[] } {
  const issuesById = new Map(params.issues.map((issue) => [issue.identifier, issue]));
  const rows: RetentionRow[] = [];
  const toDelete: string[] = [];

  for (const path of listReportFiles(params.reportsDir, params.projectName)) {
    const basename = path.split('/').pop()!;
    if (basename === params.todayFilename) {
      rows.push({ file: basename, ageDays: 0, decision: 'SKIP', reason: "Today's report" });
      continue;
    }

    const fileDate = parseReportDateFromFilename(basename, params.projectName);
    if (!fileDate) {
      rows.push({ file: basename, ageDays: 0, decision: 'KEEP', reason: 'Unrecognized date in filename' });
      continue;
    }

    const content = readFileSync(path, 'utf8');
    const tracked = extractTrackedIds(content);
    const row = evaluateRetention({
      file: path,
      fileDate,
      today: params.today,
      thresholdDays: params.thresholdDays,
      tracked,
      issuesById,
      openPrNumbers: params.openPrNumbers,
    });
    rows.push(row);
    if (row.decision === 'DELETE') toDelete.push(path);
  }

  return { rows, toDelete };
}

export function executeRetention(deletions: string[]): string[] {
  const deleted: string[] = [];
  for (const path of deletions) {
    unlinkSync(path);
    deleted.push(path.split('/').pop() ?? path);
  }
  return deleted;
}

export { formatReportDate };
