#!/usr/bin/env bash
# Parser unit tests for resolve_backend_version.
# Sources resolve-backend-version.sh to get the function only.
# NEVER makes network or SSH calls.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Source the resolver to pick up resolve_backend_version().
# shellcheck source=resolve-backend-version.sh
. "$SCRIPT_DIR/resolve-backend-version.sh"

PASS=0
FAIL=0

assert_success() {
  local desc="$1"
  local input="$2"
  local expected="$3"

  local actual
  actual="$(resolve_backend_version "$input" 2>/dev/null)"
  local rc=$?

  if [ $rc -eq 0 ] && [ "$actual" = "$expected" ]; then
    echo "PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (rc=$rc, got='$actual', want='$expected')"
    FAIL=$((FAIL + 1))
  fi
}

assert_failure() {
  local desc="$1"
  local input="$2"

  local actual
  actual="$(resolve_backend_version "$input" 2>/dev/null)"
  local rc=$?

  if [ $rc -ne 0 ]; then
    echo "PASS: $desc (correctly returned non-zero)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $desc (expected non-zero exit, got rc=0, output='$actual')"
    FAIL=$((FAIL + 1))
  fi
}

# --- Success cases ---
assert_success "prefixed tag v1.2.3 strips v"         '{"tag_name":"v1.2.3"}'  "1.2.3"
assert_success "unprefixed tag 1.2.3 passes through"  '{"tag_name":"1.2.3"}'   "1.2.3"
assert_success "minimum version v0.0.0"               '{"tag_name":"v0.0.0"}'  "0.0.0"

# --- Failure cases ---
assert_failure "missing tag_name key"              '{}'
assert_failure "null tag_name"                     '{"tag_name":null}'
assert_failure "blank tag_name"                    '{"tag_name":""}'
assert_failure "prerelease v1.2.3-rc1"             '{"tag_name":"v1.2.3-rc1"}'
assert_failure "non-semver v1.2 (only two parts)"  '{"tag_name":"v1.2"}'
assert_failure "literal latest"                    '{"tag_name":"latest"}'
assert_failure "build metadata v1.2.3+build"       '{"tag_name":"v1.2.3+build"}'
assert_failure "malformed JSON"                    'not json'

echo ""
echo "Results: $PASS passed, $FAIL failed."

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
