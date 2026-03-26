#!/bin/bash
set -eu

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  eval "$(rbenv init - bash)"

  RUBYOPT="-rcgi" bundle install
fi
