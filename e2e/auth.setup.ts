import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as setup } from '@playwright/test';

const authFile = 'e2e/auth.json';
const setupPassword = 'e2e-setup-password';

function loadEnvTest(): { supabaseUrl: string; serviceRoleKey: string } {
  const envPath = resolve(process.cwd(), '.env.test');
  const content = readFileSync(envPath, 'utf-8');
  const values: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    values[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }

  const supabaseUrl = values.SUPABASE_URL;
  const serviceRoleKey = values.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('.env.test must define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for e2e auth setup');
  }

  return { supabaseUrl, serviceRoleKey };
}

setup('authenticate GM for e2e', async ({ page }) => {
  const { supabaseUrl, serviceRoleKey } = loadEnvTest();
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const email = `e2e-setup-${crypto.randomUUID()}@integration.test`;

  const { error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: setupPassword,
    email_confirm: true,
  });

  if (createError) {
    throw createError;
  }

  await page.goto('/auth/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Your password').fill(setupPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: authFile });
});
