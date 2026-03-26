#!/bin/bash
set -eu

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  eval "$(rbenv init - bash)"
  echo 'eval "$(rbenv init - bash)"' >> "$CLAUDE_ENV_FILE"
  echo 'export RUBYOPT="-rcgi"' >> "$CLAUDE_ENV_FILE"
  RUBYOPT="-rcgi" bundle install
fi
