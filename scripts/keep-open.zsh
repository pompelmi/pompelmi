#!/usr/bin/env zsh
set -o pipefail
"$@"; code=$?
if (( code != 0 )); then
  echo "⚠️  Command failed with exit $code — keeping terminal open."
fi
exit 0
