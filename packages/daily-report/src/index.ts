#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile, reportFilename, reportPath, resolveConfig } from './config.js';
import { resolveEmailConfig, sendReportEmail } from './email.js';
import { fetchPullRequestsToReview, ghCliAvailable } from './github.js';
import { fetchLinearIssues } from './linear.js';
import { executeRetention, planRetention } from './retention.js';
import { loadRoadmapContent, renderReport } from './report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');

interface CliOptions {
  dryRun: boolean;
  skipRetention: boolean;
  skipEmail: boolean;
  date?: Date;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, skipRetention: false, skipEmail: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--skip-retention') options.skipRetention = true;
    if (arg === '--skip-email') options.skipEmail = true;
    if (arg === '--date' && argv[i + 1]) {
      const parsed = new Date(`${argv[i + 1]}T12:00:00`);
      if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid --date: ${argv[i + 1]}`);
      options.date = parsed;
      i++;
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(REPO_ROOT);

  const config = resolveConfig({ repoRoot: REPO_ROOT, reportDate: options.date });
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error('Missing LINEAR_API_KEY. Set it in packages/daily-report/.env or the environment.');
    process.exit(1);
  }

  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

  console.log(`Fetching Linear issues for ${config.linearProject}…`);
  const issues = await fetchLinearIssues(apiKey, config.linearTeam, config.linearProject);

  console.log(`Fetching open PRs for ${config.githubRepo}…`);
  const pullRequests = await fetchPullRequestsToReview(config.githubRepo, issues, {
    githubToken,
    ghCliAvailable: ghCliAvailable(),
  });

  const openPrNumbers = new Set(pullRequests.map((pr) => pr.number));
  const todayFilename = reportFilename(config);

  const { rows: retentionRows, toDelete } = planRetention({
    reportsDir: config.reportsDir,
    projectName: config.projectName,
    today: config.reportDate,
    todayFilename,
    thresholdDays: config.retentionThresholdDays,
    issues,
    openPrNumbers,
  });

  let deletedFiles: string[] = [];
  if (!options.skipRetention && toDelete.length > 0) {
    if (options.dryRun) {
      deletedFiles = toDelete.map((p) => p.split('/').pop() ?? p);
      console.log(`[dry-run] Would delete: ${deletedFiles.join(', ')}`);
    } else {
      deletedFiles = executeRetention(toDelete);
      console.log(`Deleted stale reports: ${deletedFiles.join(', ')}`);
    }
  }

  const reportContent = renderReport(
    {
      projectName: config.projectName,
      reportDate: todayFilename.replace(`${config.projectName}-`, '').replace('.md', ''),
      linearProject: config.linearProject,
      linearTeam: config.linearTeam,
      githubRepo: config.githubRepo,
      issues,
      pullRequests,
      retentionRows,
      deletedFiles,
    },
    loadRoadmapContent(REPO_ROOT),
  );

  const outputPath = reportPath(config);
  const reportDate = todayFilename.replace(`${config.projectName}-`, '').replace('.md', '');
  const inCi = process.env.GITHUB_ACTIONS === 'true';

  if (options.dryRun) {
    console.log(`[dry-run] Would write ${outputPath}`);
    console.log(reportContent.slice(0, 500), '…');
    if (!options.skipEmail) {
      const emailConfig = resolveEmailConfig();
      if (emailConfig) {
        console.log(`[dry-run] Would email report to ${emailConfig.recipients.join(', ')}`);
      } else {
        console.log('[dry-run] Email not configured (RESEND_API_KEY, REPORT_FROM_EMAIL, REPORT_RECIPIENT_EMAIL)');
      }
    }
    return;
  }

  mkdirSync(config.reportsDir, { recursive: true });
  writeFileSync(outputPath, reportContent, 'utf8');
  console.log(`Wrote ${outputPath}`);

  if (options.skipEmail) {
    console.log('Email skipped (--skip-email)');
    return;
  }

  const emailConfig = resolveEmailConfig();
  if (!emailConfig) {
    const message =
      'Email not configured. Set RESEND_API_KEY, REPORT_FROM_EMAIL, and REPORT_RECIPIENT_EMAIL in packages/daily-report/.env';
    if (inCi) {
      throw new Error(message);
    }
    console.warn(`${message} — skipping send`);
    return;
  }

  const subject = `Daily report — ${config.linearProject} — ${reportDate}`;
  await sendReportEmail({ config: emailConfig, subject, markdownBody: reportContent });
  console.log(`Sent report to ${emailConfig.recipients.join(', ')}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
