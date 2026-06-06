#!/bin/bash
# Risk #1 guard: run auth-gate integration tests when middleware or the
# Supabase client helper changes (High × High risk per test-plan.md §2).
#
# Requires local Supabase. If it is not running, prints a reminder and exits.
# Fails open so a test failure never blocks the agent.

input=$(cat)

file=$(echo "$input" | jq -r '.tool_input.path // empty')

# Only trigger on Risk-#1 anchors
if [[ -z "$file" ]]; then
  exit 0
fi

if [[ ! "$file" =~ src/middleware\.ts$|src/lib/supabase\.ts$ ]]; then
  exit 0
fi

echo "[hook:test-auth-risk] $file changed — checking auth-gate tests"

# Detect local Supabase via port (API runs on 54321 by default)
if ! nc -z 127.0.0.1 54321 2>/dev/null; then
  echo "[hook:test-auth-risk] Supabase not running — skipping integration tests"
  echo "[hook:test-auth-risk] Run: npx supabase start  then re-save to trigger"
  exit 0
fi

echo "[hook:test-auth-risk] Supabase is up — running auth-gate integration tests"

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

npm test -- --project integration \
  --reporter=verbose \
  "src/integration/middleware/auth-gate.integration.test.ts" \
  2>&1 | tail -30

exit 0
