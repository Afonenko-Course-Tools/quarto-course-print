#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
core=${CORE:?Set CORE to the current native Core checkout}
quarto=${QUARTO:-quarto}
deno=${DENO:-deno}
stage=$(mktemp -d "${TMPDIR:-/tmp}/print-native.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
cp -R "$repo/tests/native-course/." "$stage/"
cd "$stage"
"$quarto" add "$core" --no-prompt
"$quarto" add "$repo" --no-prompt
"$quarto" render --profile full --fail-if-warnings
"$quarto" run package.ts
cp public-package.json "${BODY_OUTPUT:-$stage/public-copy.json}"
cp teacher-package.json "${TEACHER_OUTPUT:-$stage/teacher-copy.json}"
cd "$repo"
BODY_PACKAGE="$stage/public-package.json" "$deno" test --no-config --no-lock --no-npm --cached-only --deny-net --allow-read --allow-write --allow-run --allow-env tests
python3 -m unittest discover -s tests -p 'test_*.py'
python3 tests/installed_check.py "$repo" "$stage/public-package.json"
cd "$stage"
"$quarto" render --profile student --fail-if-warnings
"$quarto" run package.ts
python3 -c 'import json; p=json.load(open("public-package.json")); assert p["questions"][1]["answerType"]=="single-choice"; assert not any(x in json.dumps(p) for x in ("TEACHER_SECRET","GRADING_SECRET","closedKey"));'
