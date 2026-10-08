---
type: plan
component: course-print
status: in-progress
updated: 2026-10-08
---

# Print: план владельца

Статус: текущие runtime и авторские документы подготовлены на рабочей ветке;
финальные совместные проверки, merge/CI и выпуск остаются отдельными gates. Выполнять пункт 8 и затем
пункты 12–13/17–18 [линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
[Текущие контракты Core](../../../quarto-course/spec/index.md)
задают поля банка/работ/назначений. Quarto 1.11.5 / CUE 0.17.1;
широкую Windows CI matrix не добавлять.

## Изменения, документация и проверки

В `_extensions/course-print/infrastructure/transport.ts` и `_extensions/course-print/application/export.ts` сейчас есть жёсткое `q.visibility === public`, старые kinds `lab|test|exam|handout` и requirements map. Мигрировать эти TS shape/guards вместе с новым Core Body contract: отдельное statementVisibility open/restricted — о публикации условия; нынешнее visibility:public остаётся participant-safe transport. Participant пакет допускает назначенное restricted условие и его выбранные resources, но всегда отклоняет closedKey/solution/gradingNotes и closed markers. Обновить `_extensions/course-print/application/{contracts,materialize,compiler}.ts`, `_extensions/course-print/infrastructure/files.ts` и `_extensions/course-print/entrypoints/export.ts`. Сохранить validation-before-materialization, hash/path/output-alias проверки и нынешние публичные `preparePrint`/`renderPrint` API. Не создавать runtime-импорт Core или общий adapter пакет.

Свежий main уже содержит `_extensions/course-print/infrastructure/process.ts` и `diagnostics.ts`; сверить существующую CLI/foreign границу, не повторять вынос subprocess из старого плана. ADAPTER сохраняется с Print/source/question/work/resource/field/hint; PRINT.INPUT_INVALID только у собственных CLI input guards. Pandoc/Typst nonzero хранит исходные tool/exit/stdout/stderr, не становится ADAPTER content failure; неизвестные exceptions сохраняют stack. После отказа новый PDF отсутствует и старые outputs не повреждены.

Обновить `README.md`, `docs/public-body.md` (убрать смешение condition-publication и key visibility), уточнить существующий `docs/diagnostics.md`, обновить owner plan, `tests/{production,export,native}.test.ts`, `tests/native-sample.ts`, `tests/native-course/{corpus,work-one,work-two}.qmd`, `tests/native-course/{_quarto.yml,package.ts}`, `tests/student-package-cli.ts`, `tests/installed-cli.ts`, `examples/paper` config/QMD/build.ts и bank. Проверить ordinary native PDF вне банка и два bank варианта; пример ungraded handout заменить нормальной работой с явными optional назначениями.

Проверки: новый `tests/process.test.ts` и `tests/production.test.ts` через `deno test --no-config --no-lock --no-npm --cached-only --deny-net --allow-read --allow-write --allow-run --allow-env ...`; затем `CORE=/home/tolya/course-tools/quarto-course bash tools/check.sh` и `CORE=/home/tolya/course-tools/quarto-course bash tools/check-demo.sh`. Требуются Quarto с Typst и Poppler; installed CLI/full/student уже входят в check. Restricted назначение должно дать PDF без решения/ключа; вне назначения и окружающей страницы контрольные маркеры отсутствуют.

## Завершение

Оформить актуальный индекс спецификаций, README и собственный справочник
диагностик; примеры показывают правильную русскую авторскую разметку.
Старые plans/probes сохранить в Git до удаления из активной ветки.

Сверить свежие required checks и owner PR, слить в main и проверить merged SHA.
Выпустить новую версию с точными уже выпущенными зависимостями; готовую группу
демо, если она есть, выпускать отдельным проверенным asset. Старые Releases
не заменять. Финальная очистка веток только после общего маршрута:
main + служебная gh-pages, если используется, + heads OPEN automatic PR.
Здесь сохранить commit/PR/tag/SHA, фактические проверки и ссылки на готовые assets.

## Выполнение шагов 1–2 — 8 октября 2026

Общий старт: 02:36 Europe/Minsk; дедлайн: 11:36. Рабочая ветка — `feat/authoring-model-20261008`, создана в существующем checkout; дополнительные репозитории/worktrees не создавались.

- [x] Fresh `git fetch origin --tags`, live remote heads, releases и OPEN PR: сохранены в [inventory/history](../history/2026-10-08/README.md). Открытых PR на момент чтения нет. Все старые refs/tags и пользовательские worktrees оставлены.
- [x] Dirty tracked/untracked owner-планы и выбранные root mixed документы сохранены exact snapshots: `d1d78bebb9d26ca9890efca9b9a50de7c5cc7871`. [Provenance](../history/2026-10-08/provenance.json) содержит исходный путь, mtime, bytes и SHA-256; старые evidence не считаются текущим CI.
- [x] Свежий `origin/main` `0d61ba7c8cf17af3a35230c7b6a2764b572d8da1` объединён в рабочую ветку коммитом `c7679b685d967c2b597b97c15d9c2adee7ab6faf`. В адаптерах add/add касается только старого diagnostics-плана; upstream вариант принят после сохранения исходного, оба остаются в Git.
- [x] Добавлен [spec/index.md](../../spec/index.md), type/component/status, links из README, явный main unreleased и accepted-next. Прежний план и historical snapshots удалены из активной ветки после exact Git-byte проверки; карта истории и исходные root файлы сохранены.

Текущая база: выпуск `v0.2.1` (`049ad21f0625c79e57d8a23f8878a6ffcf5f0d62`), descriptor `0.2.1`, ready demo `demo-20261007-ru2`.

Проверки: exact bytes/SHA-256 всех выбранных root snapshots; Git whitespace check; локальная проверка новых документационных links/меток; diff относительно свежего origin/main ограничен документацией и историей. Runtime suites и CI не запускались: эти шаги не меняют поведение. Meaningful ignored авторских исходников вне известных generated/cache/dependency trees не найдено; BUILD и hashes ready archives учтены, существующие результаты оставлены на диске.

Сохранение истории завершено до cleanup: исходные тексты восстанавливаются по preservation/merge SHA, а active docs/spec содержат действующие документы и dated owner-план. Root источники, runtime, generated результаты и пользовательские worktrees не удалялись.

Ограничение исполнителя: текущий агент наследует настройку родителя; отдельное включение ultra для этой документационной подзадачи через доступные инструменты не выполнялось. Блокеров шагов 1–2 нет; реализация следующего контракта, проверки, новые pins/releases и публикация ожидают последовательных шагов 8/12–18.


## Подготовка документации пункта 8 — 8 октября 2026

Документационный исполнитель работает по принятым Core решениям; модель не
менялась. Добавлена [сохранённая подготовка авторства](https://github.com/Afonenko-Course-Tools/quarto-course-print/blob/a03a8d827815543168727c8b3b8f9790932fc241/docs/authoring-next.md) `accepted-next`,
ссылки из README и индекса. Существующие current API/контракты не объявлены
мигрированными до проверки runtime. Примеры на этой ветке предназначены для
следующей модели; native ordinary Quarto сохранён вне bank opt-in.

- Свежая проверка: `git diff --check`; 28 локальных Markdown-ссылок
  README/spec/docs/плана/README примеров существуют; 4 авторских YAML
  файлов успешно прочитаны. Проверка исключает generated/dependency деревья.
- Активные примеры не содержат старых kinds exam/handout, solution `for`,
  fixture sentinel/literal текста и Quarto 1.10.x. Русский lang сохраняется,
  публичные native проекты задают `fail-if-warnings: true`.
- Машинные descriptors/workflows и runtime/tests не изменялись этим исполнителем.
  Старые выпущенные dependency/demo/source pins сохранены как baseline;
  **новые release pins ожидают решения о версиях и фактических Releases**.

- Статически сверены банковские области: `examples/paper/bank` — 5 задач / 2 работ. Для каждой задачи собственные difficulty/time и эффективная open/restricted policy; ID состава существуют, не повторяются, test/practical назначают только restricted. Это проверка разметки, не native AST/render.

Full dependent suites/CI/render против меняющегося Core здесь не запускались.
Следующий runtime исполнитель выполняет команды выше, проверяет текущие
student/full outputs и выбранный экспорт, после чего документальная подготовка
переносится в current README/контракт. Merge/push/release/публикация не выполнены.

Координация runtime: главы работы и контрольного банка теперь входят в shared
native состав student/full. Student должен показывать title/assessment-preview,
но не restricted body/ссылки назначений/их ресурсы/search. Старые demo-profile
assertions отсутствия самой страницы работы требуется заменить проверкой этой
проекции. Добавленный открытый разбор не входит в выбранную delivery/PDF/XML.

Ruling: process/diagnostics/CLI/cleanup уже существуют в свежем main; старое указание создать их заменено сверкой фактической границы.


## Текущие контракты и release-pinned примеры — 8 октября 2026

Документальный commit: `2090360aa1ffa0331d8c483e7fd9a7a9e48288bf`.
Принята версия `v0.3.0`; descriptor подготовлен отдельным runtime
исполнителем. На момент этой записи новые Releases ещё не опубликованы;
merge/main, финальный CI, готовая release-сборка и публикация выполняются root
по линейному плану. Эта запись не подтверждает общий финальный integration gate.

- Правила подготовки перенесены в действующие README/spec/тематические docs.
  `current` описывает код того же ref; документация выпуска читается из того же
  immutable tag. В README/examples нет временных заявлений о доступности Release.
- `docs/authoring-next.md` удалён только после проверки точного Git blob
  `26b6c8bd9e62f645793e7c2f1751d3528f7457d4` на commit
  `a03a8d827815543168727c8b3b8f9790932fc241`; восстановление записано в карте истории.
- Install/source/BUILD pins задают Core `v4.0.0`, Publisher `v5.0.0`, QRC `v3.0.0`
  и свою новую версию там, где эти зависимости используются. Native source-ссылки
  ведут на tool tag производителя; планируемый demo tag — `demo-20261008`,
  из того же clean producer SHA с `BUILD.sourceDirty: false`. Download не получает
  собственного demo Release. Механизм provenance/build runtime не менялся.
- Свежая статическая проверка: 7 YAML/front matter без повторных
  ключей, 26 существующих локальных Markdown-ссылок, 2 native
  source-конфигураций. У всех public base `_quarto.yml` — `lang: ru` и
  `fail-if-warnings: true`. Активные авторские документы не содержат Quarto 1.10,
  старой requirements карты/kinds, solution for и переходных contract ссылок.
- examples/paper/bank: 5 задач, 2 работ, 4 назначений
  Это проверка авторской разметки и ссылок, не native AST/render.
- `git diff --check` и staged whitespace — PASS. `deno fmt --check`
  существующих build/build-info scripts — PASS там, где они есть. Публичные
  API, runtime/tests/.github/CI этим документальным исполнителем не изменены.

Команды проверки и полные результаты: `/tmp/consumer-docs-final-20261008/verify.py`,
`bank-check.py`, `verify.log`, `bank-check.log`, `checks.json`, `bank-checks.json`.
Широкие native suites и release demo builds здесь не запускались параллельно:
их свежие результаты записывает отдельный integration исполнитель и root.
