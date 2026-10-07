Incoming Body provider local baseline completed at exact detached commit `9690514a6c92dfde377d2be551ca861022387506`, tree `305d461d5737d627f52ff7d01a035af7992b2c7f`. The isolated worktree `/home/tolya/course-tools/quarto-course-body-baseline` is clean. Primary Core remains clean at `5ea107e3338f2cb90dc3c7cf47884875d2fe384f`.

| Existing check | Stock 1.10.18 | Stock 1.11.5 |
|---|---|---|
| Resource CUE/path/provenance matrices and direct Pandoc collector (`OWNER_RESOURCES_NATIVE=0`) | Pass | Pass |
| Diagnostics CUE transport/semantic, Graphlib isolated/diamond/self-loop/cycles, duplicate occurrences, style guards | Pass after cache retry | Pass |
| Vocabulary synchronization (`--check`) | Pass | Pass |
| Legacy navigation model unit-test file | Pass | Pass |
| Static TypeScript graph: all 20 production Core entrypoints and 7 existing tests, including every Body test | Pass | Pass |

CUE is exactly `v0.17.1`. Its three production Body schemas (`answer.cue`, `components.cue`, `package.cue`) also pass symbolic consistency checks (`cue vet -c=false`); this adds no invented native facts. Type checks use each stock Quarto bundled Deno, initialized bundled import map/cache, and `--deny-import`. Workspace XDG and temporary directories are recorded per channel. Exact Quarto version assertions passed.

The first stable diagnostics command exited 1 during fresh bundled import-cache initialization: literal `NotFound` while copying a cache entry. The resource and diagnostics commands had initialized the same fresh cache concurrently. Cache initialization concurrency is an inference, supported by a serialized retry of the unchanged command passing. The original failure and retry remain separate records and literal logs.

There were zero engine renders, zero private owner sessions or authority reused, and no Source, remote, workflow, or PR changes. Body contract/integrity/API tests require a completed genuine native owner observation; they were type-checked only. This is an incoming-provider local baseline, not Task4 acceptance or Body/Nav integration. `report.json` contains commands, environment, exit codes, timestamps, stdout/stderr paths, byte counts, SHA256 hashes, exclusions, and the preserved invocation failure.
