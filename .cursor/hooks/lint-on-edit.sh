#!/bin/bash
# Runs eslint --fix on the just-edited file (ts/tsx/astro only).
# Fires after afterFileEdit; fails open so a lint error never blocks the agent.

input=$(cat)

# Extract the file path from the tool input
file=$(echo "$input" | jq -r '.tool_input.path // empty')

# Nothing to lint if path is missing or empty
if [[ -z "$file" ]]; then
  exit 0
fi

# Only lint TypeScript and Astro files
if [[ ! "$file" =~ \.(ts|tsx|astro)$ ]]; then
  exit 0
fi

# Resolve absolute path (hook runs from project root)
if [[ "$file" != /* ]]; then
  file="$(pwd)/$file"
fi

# Run eslint --fix on the specific file; suppress output, fail open
npx eslint --fix "$file" --no-error-on-unmatched-pattern 2>/dev/null || true

exit 0
