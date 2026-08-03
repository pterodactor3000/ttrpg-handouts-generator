import type { LinearIssue } from './types.js';
import { parseChangeId, parseRoadmapId } from './issue-utils.js';

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function linearGraphql<T>(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(`Linear GraphQL error: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  if (!payload.data) {
    throw new Error('Linear GraphQL returned no data');
  }
  return payload.data;
}

const ISSUE_LIST_FIELDS = `
  id
  identifier
  title
  url
  description
  updatedAt
  priority
  state { name type }
  assignee { name }
  labels { nodes { name } }
`;

const ISSUE_RELATION_FIELDS = `
  identifier
  inverseRelations {
    nodes {
      type
      issue { identifier title state { name type } }
    }
  }
`;

function mapIssue(raw: {
  id: string;
  identifier: string;
  title: string;
  url: string;
  description?: string | null;
  updatedAt: string;
  priority: number;
  state: { name: string; type: string };
  assignee?: { name: string } | null;
  labels: { nodes: { name: string }[] };
  inverseRelations?: {
    nodes: { type: string; issue: { identifier: string; title: string; state: { name: string; type: string } } }[];
  };
}): LinearIssue {
  const description = raw.description ?? '';
  const blockedBy =
    raw.inverseRelations?.nodes
      .filter((rel) => rel.type === 'blocks')
      .map((rel) => ({ identifier: rel.issue.identifier, title: rel.issue.title })) ?? [];

  return {
    id: raw.id,
    identifier: raw.identifier,
    title: raw.title,
    url: raw.url,
    description,
    updatedAt: raw.updatedAt,
    priority: raw.priority,
    state: raw.state,
    assignee: raw.assignee ?? null,
    labels: raw.labels.nodes,
    blockedBy,
    roadmapId: parseRoadmapId(description),
    changeId: parseChangeId(description),
  };
}

export async function fetchLinearIssues(apiKey: string, teamName: string, projectName: string): Promise<LinearIssue[]> {
  const teamData = await linearGraphql<{
    teams: { nodes: { id: string; name: string }[] };
  }>(
    apiKey,
    `query Teams { teams { nodes { id name } } }`,
  );

  const team = teamData.teams.nodes.find((t) => t.name === teamName);
  if (!team) {
    throw new Error(`Linear team not found: ${teamName}`);
  }

  const projectData = await linearGraphql<{
    team: { projects: { nodes: { id: string; name: string }[] } };
  }>(
    apiKey,
    `query TeamProjects($teamId: String!) {
      team(id: $teamId) {
        projects { nodes { id name } }
      }
    }`,
    { teamId: team.id },
  );

  const project = projectData.team.projects.nodes.find((p) => p.name === projectName);
  if (!project) {
    throw new Error(`Linear project not found: ${projectName}`);
  }

  const [projectIssues, teamIssues] = await Promise.all([
    fetchIssuePage(apiKey, 'project', project.id),
    fetchIssuePage(apiKey, 'team', team.id),
  ]);

  const byIdentifier = new Map<string, LinearIssue>();
  for (const issue of [...projectIssues, ...teamIssues]) {
    byIdentifier.set(issue.identifier, issue);
  }
  const issues = [...byIdentifier.values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
  await enrichOpenIssuesWithBlockers(apiKey, issues);
  return issues;
}

interface IssuePageResult {
  scope: {
    issues: {
      nodes: Parameters<typeof mapIssue>[0][];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
}

async function fetchIssuePage(
  apiKey: string,
  scope: 'project' | 'team',
  scopeId: string,
): Promise<LinearIssue[]> {
  const issues: LinearIssue[] = [];
  let cursor: string | null = null;

  for (;;) {
    const data: IssuePageResult = await linearGraphql<IssuePageResult>(
      apiKey,
      `query Issues($scopeId: String!, $after: String) {
        scope: ${scope}(id: $scopeId) {
          issues(first: 50, after: $after, orderBy: updatedAt) {
            nodes { ${ISSUE_LIST_FIELDS} }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { scopeId, after: cursor },
    );

    for (const node of data.scope.issues.nodes) {
      issues.push(mapIssue(node));
    }

    if (!data.scope.issues.pageInfo.hasNextPage) break;
    cursor = data.scope.issues.pageInfo.endCursor;
  }

  return issues;
}

async function enrichOpenIssuesWithBlockers(apiKey: string, issues: LinearIssue[]): Promise<void> {
  const openIssues = issues.filter((issue) => issue.state.type !== 'completed' && issue.state.type !== 'canceled');
  await Promise.all(
    openIssues.map(async (issue) => {
      const data = await linearGraphql<{
        issue: {
          identifier: string;
          inverseRelations: {
            nodes: { type: string; issue: { identifier: string; title: string } }[];
          };
        } | null;
      }>(
        apiKey,
        `query IssueRelations($id: String!) {
          issue(id: $id) {
            ${ISSUE_RELATION_FIELDS}
          }
        }`,
        { id: issue.identifier },
      );
      if (!data.issue) return;
      issue.blockedBy = data.issue.inverseRelations.nodes
        .filter((rel) => rel.type === 'blocks')
        .map((rel) => ({ identifier: rel.issue.identifier, title: rel.issue.title }));
    }),
  );
}

export async function fetchIssueByIdentifier(apiKey: string, identifier: string): Promise<LinearIssue | null> {
  const data = await linearGraphql<{
    issue: Parameters<typeof mapIssue>[0] | null;
  }>(
    apiKey,
    `query Issue($id: String!) {
      issue(id: $id) {
        ${ISSUE_LIST_FIELDS}
        inverseRelations {
          nodes {
            type
            issue { identifier title state { name type } }
          }
        }
      }
    }`,
    { id: identifier },
  );
  return data.issue ? mapIssue(data.issue) : null;
}

export async function fetchLinearOpenDiffs(
  apiKey: string,
  owner: string,
  repo: string,
): Promise<{ number: number; title: string; url: string; branch: string }[]> {
  // Linear's diff API is MCP-only; use GitHub as primary in automation.
  void apiKey;
  void owner;
  void repo;
  return [];
}
