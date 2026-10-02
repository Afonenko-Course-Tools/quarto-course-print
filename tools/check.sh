#!/usr/bin/env bash
# The companion Core checkout is an immutable experimental test producer only.
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
core=${CORE:?Set CORE to a clean checkout of the documented companion revision}
core=$(cd "$core" && pwd -P)
revision=4f5caf9a15b9bd36476cad8a646e81521fbd29d1
[[ $(git -C "$core" rev-parse HEAD) == "$revision" ]] || { echo "Wrong companion Core revision: expected $revision" >&2; exit 1; }
[[ -z $(git -C "$core" status --porcelain --untracked-files=all) ]] || { echo 'Companion Core checkout must be clean' >&2; exit 1; }
stage=$(mktemp -d "${TMPDIR:-/tmp}/print-check.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
export DENO_DIR="$stage/deno" DENO_NO_UPDATE_CHECK=1
fixture="$core/tests/probes/export-boundary"
flags=(--no-config --no-lock --no-npm --cached-only --deny-net --allow-read --allow-write --allow-run --allow-env)
quarto --version
quarto pandoc --version
deno --version
cue version
python3 --version
printf 'Experimental companion Core: %s\n' "$revision"
deno run "${flags[@]}" "$fixture/package.ts" "$fixture/fixtures/corpus.qmd" "$stage/package.json" \
  "$fixture/fixtures/work-one.qmd" "$fixture/fixtures/work-two.qmd"
cd "$repo"
P0_PACKAGE="$stage/package.json" PRINT_PUBLIC_PACKAGE="$stage/public-package.json" deno test "${flags[@]}" tests
python3 -m unittest discover -s tests -p 'test_*.py'
python3 tests/installed_check.py "$repo" "$stage/package.json"
python3 tests/installed_check.py "$repo" "$stage/public-package.json"
