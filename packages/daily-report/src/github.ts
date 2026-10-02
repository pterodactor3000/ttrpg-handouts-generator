import { execSync } from 'node:child_process';

import type { LinearIssue, PullRequestToReview } from './types.js';

interface GhPullRequest {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  reviewDecision: string;
  isDraft: boolean;
  reviewRequests: { login: string }[];
  author: { login: string };
}

function matchLinearIssue(pr: GhPullRequest, issues: LinearIssue[]): string | null {
  const branch = pr.headRefName.toLowerCase();
  for (const issue of issues) {
    if (branch.includes(issue.identifier.toLowerCase())) return issue.identifier;
    if (issue.changeId && branch.includes(issue.changeId.toLowerCase())) return issue.identifier;
  }
  return null;
}

function fetchViaGhCli(repo: string): GhPullRequest[] {
  const json = execSync(
    `gh pr list --repo ${repo} --state open --limit 50 --json number,title,url,headRefName,reviewDecision,isDraft,reviewRequests,author`,
    { encoding: 'utf8' },
  );
  return JSON.parse(json) as GhPullRequest[];
}

async function fetchViaGitHubApi(repo: string, token: string): Promise<GhPullRequest[]> {
  const [owner, name] = repo.split('/');
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/pulls?state=open&per_page=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API HTTP ${response.status}: ${await response.text()}`);
  }
  const pulls = (await response.json()) as {
    number: number;
    title: string;
    html_url: string;
    head: { ref: string };
    draft: boolean;
    requested_reviewers: { login: string }[];
    user: { login: string };
  }[];

  return pulls.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    headRefName: pr.head.ref,
    reviewDecision: '',
    isDraft: pr.draft,
    reviewRequests: pr.requested_reviewers.map((r) => ({ login: r.login })),
    author: { login: pr.user.login },
  }));
}

export async function fetchPullRequestsToReview(
  repo: string,
  issues: LinearIssue[],
  options: { githubToken?: string; ghCliAvailable?: boolean } = {},
): Promise<PullRequestToReview[]> {
  let pulls: GhPullRequest[] = [];
  let lastError: string | undefined;
  let fetchedViaRest = false;

  if (options.githubToken) {
    try {
      pulls = await fetchViaGitHubApi(repo, options.githubToken);
      fetchedViaRest = true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  if (!fetchedViaRest && pulls.length === 0 && options.ghCliAvailable !== false) {
    try {
      pulls = fetchViaGhCli(repo);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  if (pulls.length === 0 && lastError) {
    console.warn(`GitHub PR fetch skipped: ${lastError.split('\n')[0]}`);
  }

  return pulls
    .filter((pr) => !pr.isDraft)
    .filter((pr) => pr.reviewDecision !== 'APPROVED')
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      headRefName: pr.headRefName,
      reviewDecision: pr.reviewDecision || 'REVIEW_REQUIRED',
      isDraft: pr.isDraft,
      linearIssueId: matchLinearIssue(pr, issues),
      source: 'github' as const,
    }));
}

export function isPullRequestOpen(openNumbers: Set<number>, prNumber: number): boolean {
  return openNumbers.has(prNumber);
}

export function ghCliAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
