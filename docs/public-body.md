# Public native Body transport

`schema: course-body-package-v1` contains exactly `owner`, `release`, `apiVersion`, `questions`, `works`, and `resources`. `owner` is the Course namespace; `release` is an author label.

Questions contain canonical `owner/id` keys, a current source, public visibility, an answer type, and native Pandoc condition/publicAnswer blocks. No private fields are permitted, including on questions outside the selected work. Works bind unique canonical questions and include source, kind, title and an explicit stable work ID (`^[a-z][a-z0-9-]*$`).

Resources contain owner, source, effectiveBase, target, SHA-256, base64 bytes and public visibility. The producer resolves the actual source/effective base and rewrites native URL slots to the exact project-relative target. effectiveBase may be an absolute producer context; Print never opens it. Targets must be safe relative paths without aliases, hidden/service directories or source files. Only Image/Link slots select files; prose is not selection.

Core validates authored and generated declarations before student projection. The caller checks successful native completion and supplies `buildBodies(...).publicPackage`. Print checks closed-field shape and byte integrity, then compiles native Pandoc/Typst. It cannot reconstruct fresh producer results from an old JSON package.

Works allow kind handout as an ungraded selection, and optional requirements
map local exr-ID to required/optional. Unknown members/values fail before PDF.
Selection happens in Core before bodies/resources are validated. Full export
source capture is independent of student HTML inclusion.
