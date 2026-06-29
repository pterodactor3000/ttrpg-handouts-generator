import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { ReportConfig } from './types.js';

const ROADMAP_PATH = 'context/foundation/roadmap.md';

export function parseRoadmapProject(repoRoot: string): string {
  const content = readFileSync(join(repoRoot, ROADMAP_PATH), 'utf8');
  const match = content.match(/^project:\s*(.+)$/m);
  if (!match?.[1]) {
    throw new Error(`Missing project: frontmatter in ${ROADMAP_PATH}`);
  }
  return match[1].trim();
}

export function parseGitHubRepo(repoRoot: string): string {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    const sshMatch = remote.match(/git@[^:]+:([^/]+\/[^/.]+)(?:\.git)?$/);
    if (sshMatch?.[1]) return sshMatch[1];
    const httpsMatch = remote.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
    if (httpsMatch?.[1]) return httpsMatch[1];
  } catch {
    // fall through
  }
  throw new Error('Could not parse owner/repo from git remote origin');
}

export function formatReportDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseReportDateFromFilename(filename: string, projectName: string): Date | null {
  const prefix = `${projectName}-`;
  if (!filename.startsWith(prefix) || !filename.endsWith('.md')) return null;
  const datePart = filename.slice(prefix.length, -3);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function resolveConfig(options: {
  repoRoot: string;
  reportDate?: Date;
  projectName?: string;
}): ReportConfig {
  const repoRoot = options.repoRoot;
  const projectName = options.projectName ?? basename(repoRoot);
  const linearProject = parseRoadmapProject(repoRoot);
  const githubRepo = parseGitHubRepo(repoRoot);
  const reportDate = options.reportDate ?? new Date();

  return {
    repoRoot,
    projectName,
    linearProject,
    linearTeam: 'Tech Heresy',
    githubRepo,
    reportDate,
    reportsDir: join(repoRoot, 'docs/reports'),
    staleThresholdDays: 14,
    retentionThresholdDays: 7,
  };
}

export function reportFilename(config: ReportConfig): string {
  return `${config.projectName}-${formatReportDate(config.reportDate)}.md`;
}

export function reportPath(config: ReportConfig): string {
  return join(config.reportsDir, reportFilename(config));
}

export function loadEnvFile(repoRoot: string): void {
  const candidates = [
    join(repoRoot, 'packages/daily-report/.env'),
    join(repoRoot, '.env'),
  ];
  for (const path of candidates) {
    try {
      const content = readFileSync(path, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      return;
    } catch {
      // try next
    }
  }
}
