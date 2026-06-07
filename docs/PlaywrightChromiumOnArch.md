# Playwright CLI and Chromium on Arch / CachyOS

This document records findings from troubleshooting `@playwright/cli` browser launch failures on Arch-based systems (CachyOS) where Google Chrome is not installed.

**Decision date**: 2026-06-06

---

## The Problem

When running `playwright-cli` (the global `@playwright/cli` agent tool), the daemon fails with:

```text
Error: Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome
Run "npx playwright install chrome"
```

---

## Root Cause

| Item | Detail |
|------|--------|
| **Source** | Global `@playwright/cli` v0.1.13 — not the project's Playwright test config |
| **Default behavior** | Tries to launch the **`chrome` channel** (real Google Chrome) |
| **Expected path** | `/opt/google/chrome/chrome` |
| **Typical Arch setup** | System Chromium at `/usr/bin/chromium`, no Google Chrome installed |

The project's `playwright.config.ts` was unaffected — it already points E2E tests at `/usr/bin/chromium` and Vivaldi via `launchOptions.executablePath`. This error only affects the **agent CLI tool** (`playwright-cli`), used by coding agents for browser automation.

### Browsers available on this system

| Browser | Path | Notes |
|---------|------|-------|
| Chromium (system) | `/usr/bin/chromium` | Installed via package manager |
| Vivaldi | `/usr/bin/vivaldi-stable` → `/opt/vivaldi/vivaldi` | Chromium-based |
| Google Chrome | *not installed* | Expected by default `chrome` channel |
| Playwright bundled | `~/.cache/ms-playwright/chromium-1223/` | Downloaded by `npx playwright install` |

---

## What Was Tried

| Approach | Result |
|----------|--------|
| `--browser=chromium` | Failed — CLI expects `chrome-for-testing`, not the bundled Playwright Chromium |
| `PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium` | **Works** — launches system Chromium with no download |
| `source ~/.zshrc` in fish | Failed — fish cannot parse zsh syntax (see below) |

---

## The Fix

Point `@playwright/cli` at the system Chromium binary via the `PLAYWRIGHT_MCP_EXECUTABLE_PATH` environment variable.

### Fish shell (default on CachyOS)

Set a universal exported variable — persists across all fish sessions automatically:

```fish
set -Ux PLAYWRIGHT_MCP_EXECUTABLE_PATH /usr/bin/chromium
```

Verify:

```fish
echo $PLAYWRIGHT_MCP_EXECUTABLE_PATH
playwright-cli open https://example.com
```

Remove later if needed:

```fish
set -Ue PLAYWRIGHT_MCP_EXECUTABLE_PATH
```

### Zsh / Bash

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium
```

One-off (any shell):

```bash
PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/bin/chromium playwright-cli open https://example.com
```

---

## Fish vs Zsh Confusion

Running `source ~/.zshrc` inside fish produces:

```text
Unsupported use of '='. In fish, please use 'set DISABLE_MAGIC_FUNCTIONS "true"'.
```

Fish and zsh use different variable syntax. **Do not source `~/.zshrc` from fish.** Use the fish universal variable above instead.

---

## Alternative Fixes

If you prefer a different approach later:

| Option | Command | When to use |
|--------|---------|-------------|
| **System Chromium** (chosen) | `set -Ux PLAYWRIGHT_MCP_EXECUTABLE_PATH /usr/bin/chromium` | No download; uses existing package |
| **Chrome-for-testing** | `playwright-cli install-browser chrome-for-testing` | Playwright-managed browser for the CLI |
| **Google Chrome** | `npx playwright install chrome` | Makes the default `chrome` channel work as-is |

---

## Project E2E Config (unchanged)

The project's `playwright.config.ts` already uses explicit browser paths and does not rely on the `chrome` channel:

```ts
projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: { executablePath: '/usr/bin/chromium' },
    },
  },
  {
    name: 'vivaldi',
    use: {
      launchOptions: { executablePath: '/usr/bin/vivaldi-stable' },
    },
  },
],
```

Run E2E tests with:

```bash
npx playwright test
```

This uses the project's local `@playwright/test` dependency, separate from the global `@playwright/cli` agent tool.
