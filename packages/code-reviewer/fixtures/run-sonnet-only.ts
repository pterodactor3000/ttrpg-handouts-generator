import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runCodeReview } from "../src/agent/code-review-agent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = __dirname;

async function main() {
  const diff = await readFile(
    join(fixturesDir, "handout-editor-migration.diff"),
    "utf8",
  );
  const meta = JSON.parse(
    await readFile(join(fixturesDir, "handout-editor-migration.meta.json"), "utf8"),
  );
  const cwd = join(fixturesDir, "../../..");

  const start = Date.now();
  const review = await runCodeReview({
    diff,
    prTitle: meta.prTitle,
    prDescription: meta.prDescription,
    modelId: "claude-sonnet-4-5",
    cwd,
  });

  const out = {
    model: { label: "Sonnet 4.5", id: "claude-sonnet-4-5" },
    ok: true,
    elapsed: Date.now() - start,
    review,
    error: null,
  };

  await writeFile(
    join(fixturesDir, "handout-editor-migration.sonnet.json"),
    JSON.stringify(out, null, 2),
  );
  console.log("done", out.elapsed, review.state, review.findings.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
