import { test, expect } from '@playwright/test';

test('creates a new handout', async ({ page }) => {
  await page.getByRole('button', { name: '+ New handout' }).click();
  await page.getByRole('textbox', { name: 'Handout title...' }).fill(`Test handout ${Date.now()}`);
  await page.getByRole('button', { name: 'High Fantasy' }).click();
  await page.getByRole('textbox', { name: '# My Handout' }).fill('# Test description');
  await page.getByRole('button', { name: 'Save handout' }).click();
  await expect(page.getByText('Draft saved — click Share to publish.')).toBeVisible();

  await page.getByRole('button', { name: 'Back to dashboard' }).click();
  await expect(page.getByText(`Test handout ${Date.now()}`)).toBeVisible();
});
