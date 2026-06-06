import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envTestPath = resolve(process.cwd(), '.env.test');

if (!existsSync(envTestPath)) {
  throw new Error(
    'Missing .env.test for integration tests. Copy .env.test.example to .env.test and populate from `npx supabase status -o env`.',
  );
}

for (const line of readFileSync(envTestPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    continue;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    continue;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const value = trimmed.slice(separatorIndex + 1).trim();
  process.env[key] = value;
}
