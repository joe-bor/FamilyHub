#!/usr/bin/env bash
set -euo pipefail

export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
# `resolve-backend-version.sh` is tracked as mode 100644, so it is invoked
# through `bash` exactly the way `.github/workflows/ci.yml` invokes it.
export BE_IMAGE_TAG="${BE_IMAGE_TAG:-$(bash .github/scripts/resolve-backend-version.sh)}"
if [[ ! "$BE_IMAGE_TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Expected a bare-semver backend tag, got: $BE_IMAGE_TAG" >&2
  exit 1
fi

compose=(docker compose -f docker-compose.e2e.yml)

cleanup() {
  local command_status=$?
  trap - EXIT INT TERM
  set +e
  "${compose[@]}" down
  local cleanup_status=$?
  if ((command_status != 0)); then exit "$command_status"; fi
  exit "$cleanup_status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" up -d --wait
"$@"
