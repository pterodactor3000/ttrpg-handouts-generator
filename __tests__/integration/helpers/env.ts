export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} for integration tests. Copy .env.test.example to .env.test and populate from \`npx supabase status -o env\`.`,
    );
  }
  return value;
}
