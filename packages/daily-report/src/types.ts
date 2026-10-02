export interface LinearLabel {
  name: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  description: string;
  updatedAt: string;
  priority: number;
  state: {
    name: string;
    type: string;
  };
  assignee: { name: string } | null;
  labels: LinearLabel[];
  blockedBy: { identifier: string; title: string }[];
  roadmapId: string | null;
  changeId: string | null;
}

export interface PullRequestToReview {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  reviewDecision: string;
  isDraft: boolean;
  linearIssueId: string | null;
  source: 'github' | 'linear-diff';
}

export interface TrackedIds {
  issueIds: string[];
  prNumbers: number[];
}

export type RetentionDecision = 'DELETE' | 'KEEP' | 'SKIP';

export interface RetentionRow {
  file: string;
  ageDays: number;
  decision: RetentionDecision;
  reason: string;
}

export interface ReportContext {
  projectName: string;
  reportDate: string;
  linearProject: string;
  linearTeam: string;
  githubRepo: string;
  issues: LinearIssue[];
  pullRequests: PullRequestToReview[];
  retentionRows: RetentionRow[];
  deletedFiles: string[];
}

export interface ReportConfig {
  repoRoot: string;
  projectName: string;
  linearProject: string;
  linearTeam: string;
  githubRepo: string;
  reportDate: Date;
  reportsDir: string;
  staleThresholdDays: number;
  retentionThresholdDays: number;
}
