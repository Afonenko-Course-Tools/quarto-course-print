#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
export DEMO_SOURCE_COMMIT="$(git -C "$repo" rev-parse HEAD)"
if [[ -n $(git -C "$repo" status --porcelain) ]]; then export DEMO_SOURCE_DIRTY=true; else export DEMO_SOURCE_DIRTY=false; fi
core=${CORE:?Set CORE to the current Core source}
stage=$(mktemp -d "${TMPDIR:-/tmp}/course-adapter-demo.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
cp -R "$repo/examples/paper/." "$stage/"
rm -rf "$stage/_site" "$stage/artifacts" "$stage/_extensions" "$stage/bank/_extensions" "$stage/bank/_generated" "$stage/bank/.quarto" "$stage/.quarto"
cd "$stage/bank"
quarto add "$core" --no-prompt
mkdir -p _extensions/Afonenko-Course-Tools
mv _extensions/course-core _extensions/Afonenko-Course-Tools/course-core
cd "$stage"
quarto add "$repo" --no-prompt
quarto run "$repo/tests/demo-profiles.ts" print "$stage" "${DEMO_PROFILE_PROOF:-$stage/bank/_generated/demo-profile-proof}" --render-group
if [[ -n ${DEMO_OUTPUT:-} ]]; then mkdir -p "$(dirname "$DEMO_OUTPUT")"; [[ ! -e "$DEMO_OUTPUT" ]] || { echo "DEMO_OUTPUT must be a fresh directory" >&2; exit 1; }; cp -R "$stage/_site" "$DEMO_OUTPUT"; fi
