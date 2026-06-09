// risk: test-plan.md #2 — player is denied a handout they should see via a valid share link
// seed: e2e/seed.spec.ts
//
// What this test protects: an anonymous player navigates to /share/<token> and receives
// the fully-rendered handout. The integration test (share-token-read) covers the raw DB
// contract; this test covers the Astro SSR page layer that the integration test bypasses.
//
// Note: no cleanup after the happy-path test — no DELETE endpoint exists. The timestamp
// suffix in the title ensures no unique-constraint collisions across runs. In CI the
// Supabase instance is fresh per run, so accumulation is not a concern there.

import { test, expect } from '@playwright/test';

// Mirrors playwright.config.ts use.baseURL; needed for manually-created contexts that
// do not inherit the project's default `use` configuration.
const BASE_URL = 'http://localhost:4321';

test.describe('Risk #2 — valid share link serves published handout to anonymous player', () => {
  test('anonymous player loads published handout via share link', async ({ page, browser }) => {
    const handoutTitle = `E2E share test ${Date.now()}`;
    const handoutContent = '## Dungeon Entrance\n\nA narrow **passage** leads deeper into the dark.';

    // Setup: create a draft handout as the authenticated GM
    const createResponse = await page.request.post('/api/handouts', {
      data: {
        title: handoutTitle,
        markdownContent: handoutContent,
        backgroundCategory: 'fantasy',
        tags: [],
      },
    });
    expect(createResponse.status()).toBe(201);
    const { id: handoutId } = (await createResponse.json()) as { id: string };

    // Publish the handout to mint a share token.
    // data: {} is required — Playwright only sets Content-Type: application/json when a
    // body is present, and the Cloudflare workerd rejects bodyless POSTs as cross-site
    // form submissions (CSRF guard).
    const publishResponse = await page.request.post(`/api/handouts/${handoutId}/publish`, { data: {} });
    expect(publishResponse.status()).toBe(200);
    const { shareToken } = (await publishResponse.json()) as { shareToken: string };

    // Anonymous player: new context with no session cookies
    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    try {
      await anonymousPage.goto(`${BASE_URL}/share/${shareToken}`);

      // Risk #2: the handout title must be visible — fails if the page 404s instead
      await expect(anonymousPage.getByRole('heading', { name: handoutTitle, level: 1 })).toBeVisible();

      // Rendered markdown body must also be present
      await expect(anonymousPage.getByRole('heading', { name: 'Dungeon Entrance', level: 2 })).toBeVisible();
    } finally {
      await anonymousContext.close();
    }
  });

  test('unknown share token shows not-found page to anonymous player', async ({ browser }) => {
    // A well-formed but nonexistent token must show the not-found UI, not a crash
    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    try {
      await anonymousPage.goto(`${BASE_URL}/share/00000000-0000-0000-0000-000000000000`);
      await expect(anonymousPage.getByRole('heading', { name: 'Handout not found' })).toBeVisible();
    } finally {
      await anonymousContext.close();
    }
  });
});
