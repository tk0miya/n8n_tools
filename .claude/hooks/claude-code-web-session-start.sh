#!/bin/bash
set -eu

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  npm ci
fi
