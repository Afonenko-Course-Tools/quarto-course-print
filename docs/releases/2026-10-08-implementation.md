---
type: implementation-report
component: quarto-course-print
status: completed
updated: 2026-10-08
---

# Print: внедрение 8 октября 2026

Это отчёт проверенных операций. Нормативные правила принадлежат
[текущим спецификациям](../../spec/index.md) того же ref; контракт выпуска
читается по точному immutable тегу.

Выпущен [v0.3.0](https://github.com/Afonenko-Course-Tools/quarto-course-print/releases/tag/v0.3.0), source SHA
`00c51f7342da376e85027a925dd9f1207783f924`, immutable Release ID `406377923`.
[PR #9](https://github.com/Afonenko-Course-Tools/quarto-course-print/pull/9)
прошёл проверки и слит с сохранением истории; дерево merged main равно tested PR head.
[Main CI](https://github.com/Afonenko-Course-Tools/quarto-course-print/actions/runs/37722356136)
завершился SUCCESS на указанном source SHA до публикации.

Core `v4.0.0`, Print `v0.3.0`; Quarto 1.11.5 / CUE 0.17.1.
Штатный remote-tag `quarto add` прошёл: все **29** установленных
пути и bytes совпали с upstream `_extensions` этого Git object, без overlay
и лишних файлов. Draft assets были скачаны и сверены до immutable публикации.

Frozen integration: 56 tests / 0 failed, installed CLI, student → full → student и participant privacy. Созданы три настоящих PDF (ordinary и два handout); pdfinfo/pdftotext и отдельная visual QA прошли.

Готовые группы выпущены в отдельном immutable
[demo-20261008](https://github.com/Afonenko-Course-Tools/quarto-course-print/releases/tag/demo-20261008)
на том же producer SHA; `BUILD.sourceDirty:false`. Native build, HTML, resources,
sourceLinks и actual outputs прошли; полный ready map совпал с downloaded archive.

| Группа | Asset | Файлов | Archive SHA-256 |
| --- | --- | ---: | --- |
| print | `paper.tar.gz` | 26 | `76635e7759ecd22d3da3126c56b6c0a181ae7a1e2322ff407b2af6da6ad4e99c` |

Native sourceRef — собственный tool tag, catalog source — demo tag; оба
указывают на тот же source SHA. Старые immutable tags/assets сохранены.

PDF proof подтверждает локальные bytes/состав и layout, без нового способа оценивания.

Нативный Windows прогон не заявляется. Узкие path/CUE-TEMP исправления Core 4.0.0
подтверждены fixtures; чужие warning streams сохраняются с фактическим exit.
Подробные receipts и общий результат — [центральный отчёт Core](https://github.com/Afonenko-Course-Tools/quarto-course/blob/main/docs/releases/2026-10-08-implementation.md).

Первый сохранённый owner history checkpoint: `63cc9de26a894d5b5132f6463f3bba6e044dd332`.
Шаг 17 выполнен; actual before/after receipt: `3 LOCAL / 1 REMOTE; main, all tags/Releases, serving gh-pages и API-confirmed OPEN bot heads сохранены`.
Более поздний docs/history main не переименовывает опубликованный source SHA.

Восстановление финальных снимков: [SOURCE-MAP](https://github.com/Afonenko-Course-Tools/quarto-course-print/blob/63cc9de26a894d5b5132f6463f3bba6e044dd332/docs/history/2026-10-08-completion/SOURCE-MAP.json). После проверки exact Git blobs только этот новый датированный snapshot-каталог удаляется из active docs; архивный commit остаётся reachable. Последние планы и cleanup receipts: [Git checkpoint](https://github.com/Afonenko-Course-Tools/quarto-course-print/blob/54b8f1439993efe1af4b38a8c041f05175567a3e/docs/history/2026-10-08-completion/final-journals/2026-10-08-implementation.md); [общая квитанция](https://github.com/Afonenko-Course-Tools/quarto-course/blob/35ab45a60d3859c4aa584499e4a49c5b8b6f14bf/docs/history/2026-10-08-completion/final-cleanup/03-verified-cleanup.json).
