#!/bin/sh
set -e

case "${N8N_TOOLS_PATH:-}" in
  /*)  ;;  # absolute path — OK
  "")  printf "Content-Type: application/json\r\n\r\n"
       printf '{"success":false,"error":"N8N_TOOLS_PATH is not set"}\n'
       exit 0 ;;
  *)   printf "Content-Type: application/json\r\n\r\n"
       printf '{"success":false,"error":"N8N_TOOLS_PATH must be an absolute path"}\n'
       exit 0 ;;
esac

pw_ver=$(jq -r '.version' /files/n8n_tools/node_modules/playwright/package.json)
image="mcr.microsoft.com/playwright:v${pw_ver}-noble"

result=$(timeout 600 docker run --rm \
  -v "${N8N_TOOLS_PATH}:/files/n8n_tools:ro" \
  "$image" \
  /files/n8n_tools/node_modules/.bin/tsx /files/n8n_tools/src/playwright-runner/cli.ts 2>&1)
exit_code=$?

printf "Content-Type: application/json\r\n\r\n"
if [ "$exit_code" -eq 0 ]; then
  printf '%s\n' "$result"
else
  error="${result:-docker run failed with exit code ${exit_code}}"
  printf '{"success":false,"error":%s}\n' "$(printf '%s' "$error" | jq -R -s '.')"
fi
