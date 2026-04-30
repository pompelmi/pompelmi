#!/bin/sh
set -e

SCAN_PATH="${1:-.}"
FAIL_ON_VIRUS="${2:-true}"

# Resolve relative paths against the GitHub workspace mount point
WORKSPACE="${GITHUB_WORKSPACE:-/github/workspace}"
case "$SCAN_PATH" in
    /*) FULL_PATH="$SCAN_PATH" ;;
    *)  FULL_PATH="${WORKSPACE}/${SCAN_PATH}" ;;
esac

echo "::group::Updating ClamAV virus definitions (freshclam)"
# Remove any stale lock left from previous container runs
rm -f /run/clamav/freshclam.pid /run/lock/freshclam 2>/dev/null || true
freshclam --quiet 2>&1 \
    && echo "Definitions updated successfully." \
    || echo "Warning: freshclam update failed — scanning with cached definitions."
echo "::endgroup::"

echo "Scanning: ${FULL_PATH}"
exec node /action/scanner.js "${FULL_PATH}" "${FAIL_ON_VIRUS}"
