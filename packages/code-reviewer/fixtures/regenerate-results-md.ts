import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = __dirname;

type PlantedDefect = {
  id: string;
  criterion: string;
  severity: string;
  summary: string;
};

type Finding = {
  id: string;
  severity: string;
  criterion: string;
  title: string;
  description: string;
  suggestion?: string;
};

const PLANTED_MATCHERS: Record<string, RegExp[]> = {
  "stale-effect-empty-deps": [
    /empty\s+dep/i,
    /dependency\s+array/i,
    /\[\s*\]/,
    /stale/i,
    /never\s+update/i,
    /re-?run/i,
    /markdownContent|backgroundCategory/,
  ],
  "swallowed-render-error": [
    /catch\s*\(\s*\)/,
    /swallow/i,
    /empty\s+catch/i,
    /silent/i,
    /renderHandoutHtml.*error/i,
  ],
  "hardcoded-service-role-key": [
    /service.?role/i,
    /SERVICE_ROLE/i,
    /hardcoded/i,
    /literal.*key/i,
    /secret.*source/i,
  ],
  "missing-auth-check": [
    /no\s+auth/i,
    /missing\s+auth/i,
    /getUser/i,
    /401/i,
    /unauthenticated/i,
    /without\s+auth/i,
  ],
  "unvalidated-request-body": [
    /gmId/i,
    /gm_id.*body/i,
    /unvalidated/i,
    /without\s+zod/i,
    /client.*supplied/i,
    /trust.*client/i,
  ],
  "leaked-stack-trace": [
    /stack/i,
    /stack\s*trace/i,
    /internal.*path/i,
    /leak/i,
  ],
  "missing-prerender-false": [/prerender/i],
  "drive-by-dashboard-layout": [
    /dashboard/i,
    /out\s+of\s+scope/i,
    /unrelated/i,
    /max-w-6xl/i,
    /drive-by/i,
  ],
  "migration-without-rls": [
    /RLS/i,
    /row\s+level/i,
    /handout_duplicates_log/i,
    /without\s+polic/i,
    /migration.*rls/i,
  ],
  "no-duplicate-route-tests": [
    /no\s+test/i,
    /without\s+test/i,
    /missing\s+test/i,
    /test\s+coverage/i,
    /integration\s+test/i,
  ],
};

function findingText(f: Finding): string {
  return `${f.id} ${f.title} ${f.description} ${f.suggestion ?? ""}`;
}

function detectPlanted(plantedId: string, findings: Finding[]): boolean {
  const patterns = PLANTED_MATCHERS[plantedId] ?? [];
  return findings.some((f) => patterns.some((p) => p.test(findingText(f))));
}

function scoreReview(
  planted: PlantedDefect[],
  findings: Finding[],
  state: string,
) {
  const detected: string[] = [];
  const missed: string[] = [];
  for (const defect of planted) {
    if (detectPlanted(defect.id, findings)) detected.push(defect.id);
    else missed.push(defect.id);
  }
  const stateCorrect =
    state === "fail" || state === "fail_documented_exception";
  return {
    detected,
    missed,
    stateCorrect,
    score: detected.length + (stateCorrect ? 1 : 0),
    maxScore: planted.length + 1,
  };
}

function tableSep(cols: number): string {
  return "|" + Array(cols).fill("---").join("|") + "|";
}

function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

type UsageCostRow = {
  model: { label: string; id: string };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
  cost?: {
    apiCostUsd: number;
    cursorTokenRateUsd: number;
    estimatedTotalUsdTeams: number;
    pool: string;
    ratesNote?: string;
  };
  elapsedMs?: number;
  durationMs?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultRow = any;

async function main() {
  const meta = JSON.parse(
    await readFile(join(fixturesDir, "handout-editor-migration.meta.json"), "utf8"),
  );
  const planted = meta.plantedDefects as PlantedDefect[];

  let usageRows: UsageCostRow[] = [];
  try {
    usageRows = JSON.parse(
      await readFile(join(fixturesDir, "handout-editor-migration.usage.json"), "utf8"),
    ) as UsageCostRow[];
  } catch {
    // usage file optional
  }

  const prior = JSON.parse(
    await readFile(join(fixturesDir, "handout-editor-migration.results.json"), "utf8"),
  ) as ResultRow[];

  const sonnet = JSON.parse(
    await readFile(join(fixturesDir, "handout-editor-migration.sonnet.json"), "utf8"),
  ) as ResultRow;

  const results = [
    prior.find((r) => r.model.id === "composer-2.5"),
    prior.find((r) => r.model.id === "gemini-3.5-flash"),
    sonnet,
  ].map((r) => {
    if (r.ok && r.review && !r.scoring) {
      r.scoring = scoreReview(
        planted,
        r.review.findings as Finding[],
        r.review.state,
      );
    }
    return r;
  });

  const labels = results.map((r) => r.model.label);
  const lines: string[] = [
    "# Code review model comparison — handout-editor-migration",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Fixture: `handout-editor-migration.diff` — class→hooks migration, duplicate API, dashboard drive-by, migration without RLS. 10 planted defects.",
    "",
    "## Summary comparison",
    "",
    "| Model | State | Merge blocked | Defects found | Defects missed | State correct | Score | Time |",
    tableSep(8),
  ];

  for (const r of results) {
    if (!r.ok) {
      lines.push(
        `| ${r.model.label} | ERROR | — | — | — | — | — | ${(r.elapsed / 1000).toFixed(1)}s |`,
      );
      continue;
    }
    const s = r.scoring;
    lines.push(
      `| ${r.model.label} | ${r.review.state} | ${r.review.mergeBlocked} | ${s.detected.length}/10 | ${s.missed.length} | ${s.stateCorrect} | ${s.score}/${s.maxScore} | ${(r.elapsed / 1000).toFixed(1)}s |`,
    );
  }

  if (usageRows.length > 0) {
    lines.push("", "## Cost & token usage", "");
    lines.push(
      "Measured via `Agent.prompt` `usage`. See caveats below.",
      "",
      "| Model | Input | Cache read | Cache write | Output | Total | API list | + Token rate (Teams) | Wall time |",
      tableSep(9),
    );
    for (const u of usageRows) {
      const usage = u.usage ?? {};
      const cost = u.cost;
      lines.push(
        `| ${u.model.label} | ${usage.inputTokens?.toLocaleString() ?? "—"} | ${usage.cacheReadTokens?.toLocaleString() ?? "—"} | ${usage.cacheWriteTokens?.toLocaleString() ?? "—"} | ${usage.outputTokens?.toLocaleString() ?? "—"}${usage.reasoningTokens ? ` (+${usage.reasoningTokens.toLocaleString()} reasoning)` : ""} | ${usage.totalTokens?.toLocaleString() ?? "—"} | ${cost ? formatUsd(cost.apiCostUsd) : "—"} | ${cost ? formatUsd(cost.estimatedTotalUsdTeams) : "—"} | ${((u.elapsedMs ?? 0) / 1000).toFixed(1)}s |`,
      );
    }
    const totalApi = usageRows.reduce(
      (sum, u) => sum + (u.cost?.apiCostUsd ?? 0),
      0,
    );
    const totalTeams = usageRows.reduce(
      (sum, u) => sum + (u.cost?.estimatedTotalUsdTeams ?? 0),
      0,
    );
    lines.push(
      "",
      `**Combined API list (3 runs):** ${formatUsd(totalApi)} · **Combined Teams estimate:** ${formatUsd(totalTeams)}`,
      "",
      "### Caveats",
      "",
      "- **Quality vs cost runs are separate.** Scores, findings, and summary-table wall times come from the original model-comparison eval. Token counts and dollar estimates come from a later dedicated usage probe (`fetch-usage-costs.ts`) on the same fixture — not the same API calls.",
      "- **Token counts vary per run.** The Cursor agent may loop with tools; input/cache totals differ between runs on identical prompts.",
      "- **List prices, not your invoice.** Figures use published per-million-token rates from [Cursor models & pricing](https://cursor.com/docs/models-and-pricing). Actual billing depends on plan, pool, and on-demand settings.",
      "- **Gemini 3.5 Flash rates assumed.** No separate 3.5 Flash row on the pricing page at time of measurement; costs use Gemini 3 Flash rates ($0.50/M input, $0.05/M cache read, $3/M output). Verify if Cursor bills 3.5 Flash differently.",
      "- **Gemini reasoning tokens.** SDK reports `reasoningTokens` separately (13,848 on the probe run). Whether Cursor bills these inside `outputTokens` or at another rate is not confirmed; the table shows them for visibility only.",
      "- **Teams vs Pro / Individual.** \"+ Token rate (Teams)\" adds Cursor's $0.25/M on all tokens (input, output, cache). Pro Individual may not apply this surcharge; Composer 2.5 on paid plans often draws from the Auto+Composer pool and may not consume API credits at list price.",
      "- **Planted-defect detection is fuzzy.** The detection matrix matches findings to planted defects via keyword regex on title/description, not exact finding `id`. A \"yes\" means semantic overlap, not identical labels.",
      "- **Sonnet model id.** Cursor API expects `claude-sonnet-4-5` (hyphen before patch), not `claude-sonnet-4.5`.",
      "",
    );
  }

  lines.push("", "## Methodology caveats", "");
  lines.push(
    "- **Default PR state is FAIL** per `context/foundation/code-review-policy.md`; all models correctly returned `fail` with `mergeBlocked: true`.",
    "- **A1 and A6** are `not_assessed` in evals (CI and E2E not verifiable from diff alone).",
    "- **Fixture is synthetic.** The diff is a stub for eval, not a real branch; models review the diff text only unless the agent reads additional workspace context.",
    "",
  );

  lines.push("", "## Planted defect detection matrix", "");
  lines.push(
    "| Planted defect | " + labels.join(" | ") + " |",
    tableSep(labels.length + 1),
  );
  for (const defect of planted) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      return r.scoring.detected.includes(defect.id) ? "yes" : "no";
    });
    lines.push(`| ${defect.id} | ${cells.join(" | ")} |`);
  }

  lines.push("", "## Acceptance criteria", "");
  lines.push("| ID | " + labels.join(" | ") + " |", tableSep(labels.length + 1));
  for (const id of ["A1", "A2", "A3", "A4", "A5", "A6"]) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      const ac = r.review.acceptanceCriteria.find(
        (c: { id: string }) => c.id === id,
      );
      return ac?.status ?? "—";
    });
    lines.push(`| ${id} | ${cells.join(" | ")} |`);
  }

  lines.push("", "## Finding counts by criterion", "");
  const criteria = [
    "correctness",
    "repo_idioms",
    "minimal_scope",
    "test_coverage",
    "security",
  ];
  lines.push(
    "| Criterion | " + labels.join(" | ") + " |",
    tableSep(labels.length + 1),
  );
  for (const c of criteria) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      return String(
        r.review.findings.filter((f: Finding) => f.criterion === c).length,
      );
    });
    lines.push(`| ${c} | ${cells.join(" | ")} |`);
  }

  lines.push(
    "",
    "| Severity | " + labels.join(" | ") + " |",
    tableSep(labels.length + 1),
  );
  for (const sev of ["bug", "risk", "nit", "question"]) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      return String(
        r.review.findings.filter((f: Finding) => f.severity === sev).length,
      );
    });
    lines.push(`| ${sev} | ${cells.join(" | ")} |`);
  }

  for (const r of results) {
    lines.push("", "---", "", `## ${r.model.label}`, "");
    if (!r.ok) {
      lines.push(`**Error:** ${r.error}`, "");
      continue;
    }
    const s = r.scoring;
    const pct = Math.round((s.score / s.maxScore) * 100);
    const usageRow = usageRows.find((u) => u.model.id === r.model.id);
    lines.push(
      `**Overall score:** ${s.score}/${s.maxScore} (${pct}%)`,
      `**State:** ${r.review.state} · mergeBlocked: ${r.review.mergeBlocked}`,
      `**Findings:** ${r.review.findings.length}`,
    );
    if (usageRow?.cost) {
      lines.push(
        `**Cost (this run):** API list ${formatUsd(usageRow.cost.apiCostUsd)} · Teams est. ${formatUsd(usageRow.cost.estimatedTotalUsdTeams)} · ${usageRow.usage?.totalTokens?.toLocaleString() ?? "—"} tokens`,
      );
    }
    lines.push("", r.review.summary, "");
    if (s.missed.length > 0) {
      lines.push("**Missed:** " + s.missed.join(", "), "");
    }
    lines.push("**Findings:**", "");
    for (const f of r.review.findings as Finding[]) {
      lines.push(
        `- **${f.id}** (${f.severity}/${f.criterion}) — ${f.title}. ${f.description}${f.suggestion ? ` Fix: ${f.suggestion}` : ""}`,
      );
    }
  }

  const outPath = join(fixturesDir, "handout-editor-migration.results.md");
  await writeFile(outPath, lines.join("\n"));
  await writeFile(
    join(fixturesDir, "handout-editor-migration.results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`Wrote ${outPath}`);
}

main();
