# Quarto Course Print

Print creates a public PDF from the current native Core `course-body-package-v1` public projection. The caller first requires a successful ordinary Quarto render and reads its current NativeRun, then calls Core `buildBodies` and passes `publicPackage` to Print. Retained sidecars are not a release inventory.

```sh
quarto add Afonenko-Course-Tools/quarto-course-print@v0.1.1 --no-prompt
deno run --allow-read --allow-write --allow-run=quarto --allow-env \
  _extensions/Afonenko-Course-Tools/course-print/entrypoints/export.ts \
  public-package.json course-a/sec-work-one output header.json
```

The command uses the GitHub installation path; local installation may use `_extensions/course-print`. Use the path actually created by Quarto. `header.json` is optional and may contain `date` and `group`. The work key must appear in the package. The output contains `handout.pdf`, `public.json`, and resources selected by exact native Image/Link targets. Print always invokes `quarto pandoc` and `quarto typst compile` with its installed Typst template and bundled DejaVu/Latin Modern fonts. Cyrillic, emphasis, code and mathematical text remain supported. It does not rerun source engines or project hooks.

Print rejects privileged question fields (`closedKey`, `solution`, `gradingNotes`), closed markers, malformed transport, source/service targets, target aliases/collisions, resource hash mismatches and unsupported AST capabilities before compiler output is copied. Numeric, single-choice, multipart, matching and manual public prompts are supported. Ordinary native question headings keep their text and drop per-page anchors. Rich anchors, QRC references, citations and raw markup remain explicitly unsupported. The experimental P0 transport is no longer accepted. Output symlinks are rejected. Each export compiles current bytes; receipts, toolchain identities, promotion/rollback and upstream boolean assertions are not part of the runtime.

Use a dedicated output directory for each export. A failed compile cannot establish a new successful result; the caller must check its process exit. Shared-project concurrent builds are unsupported.

```sh
CORE=../quarto-course bash tools/check.sh
```

The full check installs real Core and Print payloads with `quarto add`, renders authored public/full examples, builds actual native Body packages, checks privacy/resource integrity, compiles PDFs and checks the installed CLI with `quarto run tests/installed-cli.ts REPO PACKAGE`. Run with Quarto 1.10.18 and 1.11.5 and CUE 0.17.1; PDF checks also need Poppler. No npm/runtime network dependency is required. See [public transport](docs/public-body.md).

## Release installation

Release `v0.1.1` matches the version in `_extension.yml`. Install the explicit tag shown above and commit the installed `_extensions` files in the course repository. To upgrade, install the next published tag with `quarto add`, review the changes and run the course checks. Published tags are immutable; corrections receive a new version and tag.
