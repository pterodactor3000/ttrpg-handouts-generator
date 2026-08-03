import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatReportDate } from './config.js';
import {
  extractRoadmapDrift,
  hasAcceptanceCriteria,
  isActiveOpenState,
  isOpenIssue,
  isStaleIssue,
  parseRoadmapAtAGlanceStatuses,
  priorityLabel,
} from './issue-utils.js';
import type { LinearIssue, PullRequestToReview, ReportContext } from './types.js';

function mdEscape(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function formatLabels(labels: { name: string }[]): string {
  if (labels.length === 0) return '—';
  return labels.map((l) => `\`${l.name}\``).join(', ');
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function renderReport(context: ReportContext, roadmapContent: string): string {
  const openIssues = context.issues.filter((issue) => isActiveOpenState(issue) && isOpenIssue(issue));
  const doneIssues = context.issues.filter((issue) => issue.state.type === 'completed');
  const canceledIssues = context.issues.filter((issue) => issue.state.type === 'canceled');
  const now = new Date(context.reportDate);

  const missingOwner = openIssues.filter(
    (issue) => !issue.assignee || issue.labels.some((l) => l.name === 'needs-owner'),
  );
  const missingAc = openIssues.filter(
    (issue) => !hasAcceptanceCriteria(issue.description) || issue.labels.some((l) => l.name === 'needs-acceptance-criteria'),
  );
  const noPriority = openIssues.filter((issue) => issue.priority === 0);
  const stale = openIssues.filter((issue) => isStaleIssue(issue, now, 14));
  const blocked = openIssues.filter((issue) => issue.blockedBy.length > 0 || /blocked/i.test(issue.state.name));
  const roadmapStatuses = parseRoadmapAtAGlanceStatuses(roadmapContent);
  const drift = extractRoadmapDrift(context.issues, roadmapStatuses);

  const lines: string[] = [
    `# Linear Issues Report — ${context.linearProject}`,
    '',
    `**Date:** ${context.reportDate}  `,
    `**Source:** \`@ttrpg-handouts/daily-report\` (Linear GraphQL + GitHub read-only)  `,
    `**Team:** ${context.linearTeam}  `,
    `**Project:** ${context.linearProject}  `,
    `**Roadmap:** \`context/foundation/roadmap.md\` (project: ${context.linearProject})`,
    '',
    '---',
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '| ------ | ----- |',
    `| Total issues (project + team) | ${context.issues.length} |`,
    `| Open (active) | ${openIssues.length} |`,
    `| Done | ${doneIssues.length} |`,
    `| Canceled | ${canceledIssues.length} |`,
    `| PRs to review | ${context.pullRequests.length} |`,
    `| Missing assignee | ${missingOwner.length} |`,
    `| Missing acceptance criteria | ${missingAc.length} |`,
    `| No priority set | ${noPriority.length} |`,
    `| Stale (14+ days, active) | ${stale.length} |`,
    '',
    '---',
    '',
    '## PRs to review',
    '',
    '| PR | Title | Linear | Review state | Action |',
    '| -- | ----- | ------ | ------------ | ------ |',
  ];

  if (context.pullRequests.length === 0) {
    lines.push('| — | None | — | — | — |');
  } else {
    for (const pr of context.pullRequests) {
      lines.push(
        `| [#${pr.number}](${pr.url}) | ${mdEscape(pr.title)} | ${pr.linearIssueId ?? '—'} | ${pr.reviewDecision} | Review |`,
      );
    }
  }

  lines.push('', '### Proposed review actions (copy-paste for agent)', '', '```text');
  if (context.pullRequests.length === 0) {
    lines.push('No open PRs awaiting review.');
  } else {
    lines.push(
      `For each PR in PRs to review, summarize diff scope and CI status. Do not merge without approval.`,
    );
    for (const pr of context.pullRequests) {
      lines.push(
        `Review PR #${pr.number}: read diff, run CI checks if needed, gh pr review ${pr.number} --comment --body "..." or approve/request-changes.`,
      );
    }
  }
  lines.push('```', '', '```bash');
  for (const pr of context.pullRequests.slice(0, 5)) {
    lines.push(`gh pr view ${pr.number} --repo ${context.githubRepo}`);
    lines.push(`gh pr checks ${pr.number} --repo ${context.githubRepo}`);
  }
  if (context.pullRequests.length === 0) {
    lines.push(`gh pr list --repo ${context.githubRepo} --state open`);
  }
  lines.push('```', '', '---', '', '## Open issues', '', '| ID | Roadmap | Change ID | Title | Labels | Assignee | Priority | Last updated |', '| -- | ------- | --------- | ----- | ------ | -------- | -------- | ------------ |');

  if (openIssues.length === 0) {
    lines.push('| — | — | — | None | — | — | — | — |');
  } else {
    for (const issue of openIssues.sort((a, b) => a.identifier.localeCompare(b.identifier))) {
      lines.push(
        `| [${issue.identifier}](${issue.url}) | ${issue.roadmapId ?? '—'} | \`${issue.changeId ?? '—'}\` | ${mdEscape(issue.title)} | ${formatLabels(issue.labels)} | ${issue.assignee?.name ?? '—'} | ${priorityLabel(issue.priority)} | ${formatDate(issue.updatedAt)} |`,
      );
    }
  }

  if (blocked.length > 0) {
    lines.push('', '**Blocked / sequencing:**', '');
    for (const issue of blocked) {
      const blockers = issue.blockedBy.map((b) => b.identifier).join(', ') || 'state/name';
      lines.push(`- ${issue.identifier}: blocked by ${blockers}`);
    }
  }

  lines.push('', '---', '', '## Hygiene issues', '');

  appendHygieneTable(lines, 1, 'Missing assignee (`needs-owner`)', missingOwner);
  appendHygieneTable(lines, 2, 'Missing acceptance criteria (`needs-acceptance-criteria`)', missingAc);
  appendHygieneTable(lines, 3, 'No priority set', noPriority);
  appendHygieneTable(lines, 4, 'Stale (14+ days, active)', stale);

  if (drift.length > 0) {
    lines.push('', '### Roadmap ↔ Linear drift (docs, not Linear)', '', '| Roadmap ID | Roadmap status | Linear status | Linear ID |', '| ---------- | -------------- | ------------- | --------- |');
    for (const row of drift) {
      lines.push(`| ${row.roadmapId} | \`${row.roadmapStatus}\` | ${row.linearStatus} | ${row.linearId} |`);
    }
  }

  lines.push('', '---', '', '## Proposed cleanup actions', '', 'These actions mutate Linear. Run only after explicit user approval.', '', '### Action A — Assign owners (remove `needs-owner`)', '', '**Agent prompt (copy-paste):**', '', '```text');
  if (missingOwner.length > 0) {
    const ids = missingOwner.map((i) => i.identifier).join(', ');
    lines.push(
      `Assign ${ids} to me in Linear. Remove the needs-owner label from each. Wait for my approval before calling save_issue.`,
    );
  } else {
    lines.push('No issues missing assignee.');
  }
  lines.push('```', '', '**MCP examples (after approval):**', '', '```json');
  for (const issue of missingOwner.slice(0, 5)) {
    const labels = issue.labels.map((l) => l.name).filter((n) => n !== 'needs-owner');
    lines.push(`// user-linear → save_issue`);
    lines.push(JSON.stringify({ id: issue.identifier, assignee: 'me', labels }, null, 2));
    lines.push('');
  }
  lines.push('```');

  lines.push('', '### Action B — Add acceptance criteria (remove `needs-acceptance-criteria`)', '', '**Agent prompt (copy-paste):**', '', '```text');
  if (missingAc.length > 0) {
    lines.push(
      `For ${missingAc.map((i) => i.identifier).join(', ')}, append ## Acceptance criteria from context/foundation/roadmap.md, then remove needs-acceptance-criteria. Show proposed AC before writing.`,
    );
  } else {
    lines.push('No issues missing acceptance criteria.');
  }
  lines.push('```');

  lines.push('', '### Action G — PR review queue', '', '**Agent prompt (copy-paste):**', '', '```text');
  if (context.pullRequests.length > 0) {
    lines.push(
      'For each open PR in the PRs to review section, run /rites-of-review or summarize diff scope and CI status. Do not merge without approval.',
    );
  } else {
    lines.push('No PRs in review queue.');
  }
  lines.push('```');

  lines.push('', '### Action D — Full interactive backlog rite', '', '**Agent prompt (copy-paste):**', '', '```text');
  lines.push(
    `Run /rites-of-cleaning for team ${context.linearTeam}, project ${context.linearProject}. Confirm scope, then walk through Steps 1–7. Do not mutate Linear without my explicit approval at each step.`,
  );
  lines.push('```');

  lines.push('', '---', '', '## Retention', '', '| File | Age (days) | Decision | Reason |', '| ---- | ---------- | -------- | ------ |');
  if (context.retentionRows.length === 0) {
    lines.push('| — | — | SKIP | No prior reports |');
  } else {
    for (const row of context.retentionRows) {
      lines.push(`| ${row.file} | ${row.ageDays} | ${row.decision} | ${row.reason} |`);
    }
  }
  if (context.deletedFiles.length > 0) {
    lines.push('', `**Deleted this run:** ${context.deletedFiles.join(', ')}`);
  }

  lines.push('', '---', '', '## Skills reference', '', '| Skill | Path | Purpose |', '| ----- | ---- | ------- |');
  lines.push('| rites-of-cleaning | `.cursor/skills/rites-of-cleaning/SKILL.md` | Approval-gated backlog hygiene |');
  lines.push('| rites-of-status-query | `.cursor/skills/rites-of-status-query/SKILL.md` | Read-only blocked / review-ready / focus report |');
  lines.push('| rites-of-review | `.cursor/skills/rites-of-review/SKILL.md` | PR review rite |');
  lines.push('', '---', '', '*Generated read-only. No Linear or GitHub mutations were performed during this report.*');

  return lines.join('\n');
}

function appendHygieneTable(lines: string[], index: number, heading: string, issues: LinearIssue[]): void {
  lines.push('', `### ${index}. ${heading}`, '', '| ID | Title |', '| -- | ----- |');
  if (issues.length === 0) {
    lines.push('| — | None |');
    return;
  }
  for (const issue of issues) {
    lines.push(`| ${issue.identifier} | ${mdEscape(issue.title)} |`);
  }
}

export function loadRoadmapContent(repoRoot: string): string {
  return readFileSync(join(repoRoot, 'context/foundation/roadmap.md'), 'utf8');
}

export { formatReportDate };
