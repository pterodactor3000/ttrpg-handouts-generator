import { test, expect } from '@playwright/test';

test('creates a new handout', async ({ page }) => {
  const handoutTitle = `Test handout ${Date.now()}`;

  const createResponse = await page.request.post('/api/handouts', {
    data: {
      title: handoutTitle,
      markdownContent: '# Test description',
      backgroundCategory: 'fantasy',
      tags: [],
    },
  });
  expect(createResponse.status()).toBe(201);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: handoutTitle, level: 3 })).toBeVisible();
});
