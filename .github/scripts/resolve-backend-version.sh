#!/usr/bin/env bash
# resolve-backend-version.sh
#
# Defines resolve_backend_version() for sourcing and, when executed directly,
# fetches the latest GitHub release and prints the bare semver version.
#
# Requires `jq` (preinstalled on GitHub Actions `ubuntu-latest`; no preflight).
#
# IMPORTANT: no set -e at the top-level/source scope — that would leak into
# any script that sources this file and break failure-case assertions in tests.

# resolve_backend_version RELEASE_JSON
#
# Parses the GitHub releases JSON snippet supplied as $1.
# Prints the bare semver (MAJOR.MINOR.PATCH) to stdout and returns 0 on success.
# Returns non-zero and prints nothing usable on any failure (null/missing tag,
# blank tag, prerelease suffix, non-semver, malformed JSON).
resolve_backend_version() {
  local json="$1"
  local tag

  # -e: exit non-zero if the selected value is null or false
  # -r: raw string output (no surrounding quotes)
  tag="$(printf '%s' "$json" | jq -er '.tag_name')" || return 1

  # Reject blank string (jq -e passes "" with rc=0, but we must not accept it)
  if [ -z "$tag" ]; then
    return 1
  fi

  # Strip one leading 'v' (e.g. v1.2.3 -> 1.2.3); leave unprefixed tags alone.
  local bare="${tag#v}"

  # Accept ONLY numeric MAJOR.MINOR.PATCH — no pre-release suffixes, no extra dots.
  # This case is just a fast shape pre-filter; the IFS split and per-component
  # digit checks below do the real enforcement.
  case "$bare" in
    [0-9]*.[0-9]*.[0-9]*)
      # Further validate: all three components must be purely numeric.
      local major minor patch rest
      IFS='.' read -r major minor patch rest <<< "$bare"
      if [ -n "$rest" ]; then
        # More than three dot-separated parts
        return 1
      fi
      # Each component must be non-empty and consist solely of digits.
      if ! printf '%s' "$major" | grep -qE '^[0-9]+$'; then return 1; fi
      if ! printf '%s' "$minor" | grep -qE '^[0-9]+$'; then return 1; fi
      if ! printf '%s' "$patch" | grep -qE '^[0-9]+$'; then return 1; fi
      ;;
    *)
      return 1
      ;;
  esac

  printf '%s\n' "$bare"
}

# Main execution path — only runs when this script is executed directly,
# not when it is sourced by another script (e.g. the test harness).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  set -euo pipefail

  # REPO can be overridden via env to target a different repository.
  REPO="${REPO:-joe-bor/family-hub-api}"

  release_json="$(curl -sf \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${REPO}/releases/latest")"
  resolve_backend_version "$release_json"
fi
