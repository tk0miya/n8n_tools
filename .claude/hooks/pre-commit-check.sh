#!/bin/bash

# Hook input is JSON from stdin
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Only run for git commit commands
if [[ "$tool_name" != "Bash" ]] || [[ ! "$command" =~ git[[:space:]]+(commit|cherry-pick|merge|rebase) ]]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1

echo "Running pre-commit checks..." >&2

if ! npm run lint >&2; then
    echo "Error: lint failed" >&2
    exit 2
fi

if ! npm run typecheck >&2; then
    echo "Error: typecheck failed" >&2
    exit 2
fi

if ! npm test >&2; then
    echo "Error: tests failed" >&2
    exit 2
fi

if ! npm run build >&2; then
    echo "Error: build failed" >&2
    exit 2
fi

echo "All checks passed!" >&2
exit 0
