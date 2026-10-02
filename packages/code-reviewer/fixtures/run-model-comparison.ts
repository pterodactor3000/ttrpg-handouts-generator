import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runCodeReview } from "../src/agent/code-review-agent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname);

const MODELS = [
  { label: "Composer 2.5", id: "composer-2.5" },
  { label: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
  { label: "Sonnet 4.5", id: "claude-sonnet-4-5" },
] as const;

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
  filePath?: string;
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
  return `${f.id} ${f.title} ${f.description} ${f.filePath ?? ""}`;
}

function detectPlanted(
  plantedId: string,
  findings: Finding[],
): Finding | undefined {
  const patterns = PLANTED_MATCHERS[plantedId] ?? [];
  return findings.find((f) => {
    const text = findingText(f);
    return patterns.some((p) => p.test(text));
  });
}

function scoreReview(
  planted: PlantedDefect[],
  findings: Finding[],
  state: string,
): {
  detected: string[];
  missed: string[];
  stateCorrect: boolean;
  score: number;
  maxScore: number;
} {
  const detected: string[] = [];
  const missed: string[] = [];

  for (const defect of planted) {
    if (detectPlanted(defect.id, findings)) {
      detected.push(defect.id);
    } else {
      missed.push(defect.id);
    }
  }

  const stateCorrect = state === "fail" || state === "fail_documented_exception";
  const defectScore = detected.length;
  const stateBonus = stateCorrect ? 1 : 0;
  return {
    detected,
    missed,
    stateCorrect,
    score: defectScore + stateBonus,
    maxScore: planted.length + 1,
  };
}

async function main() {
  const diff = await readFile(
    join(fixturesDir, "handout-editor-migration.diff"),
    "utf8",
  );
  const meta = JSON.parse(
    await readFile(join(fixturesDir, "handout-editor-migration.meta.json"), "utf8"),
  );
  const planted = meta.plantedDefects as PlantedDefect[];

  const cwd = join(fixturesDir, "../../..");

  const results = await Promise.all(
    MODELS.map(async (model) => {
      const start = Date.now();
      try {
        const review = await runCodeReview({
          diff,
          prTitle: meta.prTitle,
          prDescription: meta.prDescription,
          modelId: model.id,
          cwd,
        });
        const elapsed = Date.now() - start;
        const scoring = scoreReview(
          planted,
          review.findings as Finding[],
          review.state,
        );
        return {
          model,
          ok: true,
          elapsed,
          review,
          scoring,
          error: null as string | null,
        };
      } catch (error) {
        return {
          model,
          ok: false,
          elapsed: Date.now() - start,
          review: null,
          scoring: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  const outPath = join(fixturesDir, "handout-editor-migration.results.md");
  const jsonPath = join(fixturesDir, "handout-editor-migration.results.json");

  await writeFile(jsonPath, JSON.stringify(results, null, 2));

  const lines: string[] = [
    "# Code review model comparison — handout-editor-migration",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Fixture: `handout-editor-migration.diff` (4 files, 10 planted defects).",
    "",
    "## Summary comparison",
    "",
    "| Model | State | Merge blocked | Defects found | Defects missed | State correct | Score | Time |",
    "| ----- | ----- | ------------- | ------------- | -------------- | ------------- | ----- | ---- |",
  ];

  for (const r of results) {
    if (!r.ok) {
      lines.push(
        `| ${r.model.label} | ERROR | — | — | — | — | — | ${(r.elapsed / 1000).toFixed(1)}s |`,
      );
      continue;
    }
    const s = r.scoring!;
    lines.push(
      `| ${r.model.label} | ${r.review!.state} | ${r.review!.mergeBlocked} | ${s.detected.length}/10 | ${s.missed.length} | ${s.stateCorrect} | ${s.score}/${s.maxScore} | ${(r.elapsed / 1000).toFixed(1)}s |`,
    );
  }

  lines.push("", "## Planted defect detection matrix", "");
  const header =
    "| Planted defect | " +
    results.map((r) => r.model.label).join(" | ") +
    " |";
  lines.push(header);
  lines.push(
    "| " +
      " | ".repeat(results.length + 1).slice(0, -2) +
      " |",
  );

  for (const defect of planted) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      return r.scoring!.detected.includes(defect.id) ? "yes" : "no";
    });
    lines.push(`| ${defect.id} | ${cells.join(" | ")} |`);
  }

  lines.push("", "## Acceptance criteria (A1–A6)", "");
  lines.push(
    "| ID | " + results.map((r) => r.model.label).join(" | ") + " |",
  );
  lines.push("| " + " | ".repeat(results.length + 1).slice(0, -2) + " |");

  const acIds = ["A1", "A2", "A3", "A4", "A5", "A6"] as const;
  for (const id of acIds) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      const ac = r.review!.acceptanceCriteria.find((c) => c.id === id);
      return ac ? `${ac.status}${ac.note ? ` (${ac.note.slice(0, 40)}…)` : ""}` : "—";
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
  lines.push("| Criterion | " + results.map((r) => r.model.label).join(" | ") + " |");
  lines.push("| " + " | ".repeat(results.length + 1).slice(0, -2) + " |");
  for (const c of criteria) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      return String(
        r.review!.findings.filter((f) => f.criterion === c).length,
      );
    });
    lines.push(`| ${c} | ${cells.join(" | ")} |`);
  }

  lines.push(
    "",
    "| Severity | " + results.map((r) => r.model.label).join(" | ") + " |",
  );
  lines.push("| " + " | ".repeat(results.length + 1).slice(0, -2) + " |");
  for (const sev of ["bug", "risk", "nit", "question"]) {
    const cells = results.map((r) => {
      if (!r.ok) return "ERR";
      return String(r.review!.findings.filter((f) => f.severity === sev).length);
    });
    lines.push(`| ${sev} | ${cells.join(" | ")} |`);
  }

  for (const r of results) {
    lines.push("", "---", "", `## ${r.model.label}`, "");
    if (!r.ok) {
      lines.push(`**Error:** ${r.error}`, "");
      continue;
    }

    const s = r.scoring!;
    const pct = Math.round((s.score / s.maxScore) * 100);
    lines.push(
      `**Overall score:** ${s.score}/${s.maxScore} (${pct}%)`,
      `**State:** ${r.review!.state} · mergeBlocked: ${r.review!.mergeBlocked}`,
      `**Findings:** ${r.review!.findings.length} total`,
      "",
      r.review!.summary,
      "",
    );

    if (s.missed.length > 0) {
      lines.push("**Missed planted defects:** " + s.missed.join(", "), "");
    }

    lines.push("**Findings:**", "");
    for (const f of r.review!.findings) {
      lines.push(
        `- **${f.id}** (${f.severity}/${f.criterion}) — ${f.title}. ${f.description}${f.suggestion ? ` Fix: ${f.suggestion}` : ""}`,
      );
    }

    const extra = r.review!.findings.filter(
      (f) => !planted.some((p) => detectPlanted(p.id, [f as Finding])),
    );
    if (extra.length > 0) {
      lines.push("", "**Additional findings (not in planted set):**", "");
      for (const f of extra) {
        lines.push(`- ${f.id}: ${f.title}`);
      }
    }
  }

  await writeFile(outPath, lines.join("\n"));
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
