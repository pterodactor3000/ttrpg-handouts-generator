# Daily reports

Automated Linear + GitHub backlog reports for this project.

## Spec

- Goal: [`_goal.md`](./_goal.md)
- Runbook: [`_plan.md`](./_plan.md)

## Generate a report

```bash
# From repo root
npm run report:generate
```

Setup:

1. Copy `packages/daily-report/.env.example` → `packages/daily-report/.env`
2. Add a read-only [Linear personal API key](https://linear.app/settings/account/security)
3. Optional: `GITHUB_TOKEN` when `gh` CLI is not authenticated (CI uses `GITHUB_TOKEN` automatically)
4. For email delivery, configure [Resend](https://resend.com) (see below)

Flags:

```bash
cd packages/daily-report
npx tsx src/index.ts --dry-run          # fetch + print, no writes or email
npx tsx src/index.ts --skip-retention   # write today only, no deletions
npx tsx src/index.ts --skip-email        # write file, skip Resend
npx tsx src/index.ts --date 2026-06-29  # override report date (testing)
```

Output: `docs/reports/ttrpg-handouts-generator-{yyyy-mm-dd}.md`

## Email delivery (Resend)

After the report file is written, the CLI sends the full markdown body by email via [Resend](https://resend.com).

| Variable | Purpose |
| -------- | ------- |
| `RESEND_API_KEY` | API key from Resend dashboard |
| `REPORT_FROM_EMAIL` | Verified sender, e.g. `reports@your-domain.com` |
| `REPORT_RECIPIENT_EMAIL` | Your inbox; comma-separated for multiple recipients |

Local runs skip email with a warning when these are unset. **CI fails** if email is not configured.

Subject format: `Daily report — TTRPG Handouts Generator — {yyyy-mm-dd}`

## Retention

Reports older than **7 days** are deleted when every tracked `TEC-NN` issue and `PR #N` from that file is resolved. Otherwise the file is kept.

## Scheduled run (GitHub Actions)

Workflow: [`.github/workflows/daily-report.yml`](../../.github/workflows/daily-report.yml)

| Trigger | When |
| ------- | ---- |
| `schedule` | Daily at 10:00 UTC |
| `workflow_dispatch` | Manual run from Actions tab |

### One-time setup

Repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Source |
| ------ | ------ |
| `LINEAR_API_KEY` | Linear → Settings → Security & access |
| `RESEND_API_KEY` | Resend → API Keys |
| `REPORT_FROM_EMAIL` | Verified domain sender in Resend |
| `REPORT_RECIPIENT_EMAIL` | Your email address |

Also ensure **`github-actions[bot]`** can push to `main` if you want reports committed automatically.

### Manual run

GitHub → **Actions** → **Daily report** → **Run workflow**

Options:

- **dry_run** — fetch only; no file writes, email, or commits
- **skip_retention** — write today's report without deleting stale files

### What the workflow does

1. Validates required secrets
2. Runs `packages/daily-report` unit tests
3. Generates the report and **emails it via Resend**
4. Commits `docs/reports/ttrpg-handouts-generator-*.md` when content changed
