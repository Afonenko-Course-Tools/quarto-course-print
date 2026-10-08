---
type: plan
component: course-print
status: in-progress
updated: 2026-10-08
---

# Print: план владельца

Статус: выпуск v0.3.0 выполнен на чистом проверенном main,
immutable release и native remote-tag install подтверждены. Шаги12–15
завершены; Course PR#4 OPEN/новый CI SUCCESS после удаления docs, шаги17–18 ожидаются.

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

## Итоговый журнал 8 октября: проверенные выпуски и передача

Tool v0.3.0: source `00c51f7342da376e85027a925dd9f1207783f924`, PR#9 merged/main CI37722356136 SUCCESS, immutable Release406377923; actual native remote-tag install29 files exact bytes. Frozen integration: 56 tests / 0 failed, installed CLI, student → full → student и participant privacy. Созданы три настоящих PDF (ordinary и два handout); pdfinfo/pdftotext и отдельная visual QA прошли.
Ready demo-20261008: immutable Release406393277 на том же sourceSHA, BUILD.sourceDirty false, native build/check/downloaded archive equality PASS.

Шаг16: ожидает `https://github.com/BSU-RFCT-Afonenko-Courses/Cybersecurity/pull/4` / `fd62bdb3de1d2c9fce8a51dde9fcb7636e58cb9c` / `SUCCESS — https://github.com/BSU-RFCT-Afonenko-Courses/Cybersecurity/actions/runs/37742519419`; курс не merge/deploy/branch-cleanup. Шаги17/18 pending до actual before/after cleanup receipts и first durable history commit. Позднейший docs/history main не заменяет опубликованный producer/site sourceSHA.

Общий gate14/15 выполнен: Template PR19/CI37737745573 SUCCESS/MERGED, native publication main52316a7/gh-pages8dc11b5; actual Pages/live/CUA proof /tmp/template-patch-pages-20261008/.

Course16 native final PASS: Core 4.0.1/618 exact bytes, fixtures48+CUE8, student107.247/full120.018/student111.065/site0.358 all0, native bank href+11.1 both views, selected Body40.629s/root-only owner/real open-manual90/required-individual/0resources/noZIP, student178bytes unchanged and author43 unchanged. Actual proof /tmp/cybersecurity-core-patch-20261008/verified-final-native.json. Новый OPEN PR/head/required CI ещё ожидаются.

## Подтверждённый финальный журнал — 8 октября 2026, 07:19 UTC

Шаги 12–15 завершены: восемь текущих инструментов immutable выпущены,
штатная установка по тегам и native ready результаты проверены; Core 4.0.1
и demo-20261008-1 сохранены отдельно от предыдущей immutable линии.
[Template PR #19](https://github.com/Afonenko-Course-Tools/quarto-template-course/pull/19)
MERGED после [CI SUCCESS](https://github.com/Afonenko-Course-Tools/quarto-template-course/actions/runs/37737745573).
Published source main `52316a762da3a9c054b5ac6a7a89620e46c7c150`,
native gh-pages `8dc11b599406f65af420aef39babdb15375df61b`. Пять clean-main
native gates и task publish exit 0; exact 63 Core/549 ready/599 site bytes,
61 HTML/2459 local links,22 HTTP/Pages built/Root CUA Source-search-catalog PASS.
[Руководство](https://afonenko-course-tools.github.io/quarto-template-course/).

Шаг 16: [новый PR #4](https://github.com/BSU-RFCT-Afonenko-Courses/Cybersecurity/pull/4) **OPEN**, прикреплён к задаче,
head `fd62bdb3de1d2c9fce8a51dde9fcb7636e58cb9c`, tree `a9fdc3fe043bcaf75249dc2f7c839324287924e1`.
Сохранены пользовательские 9853/master8e histories; 701 одобренный путь
совпадает с Git bytes, включая все32 Course receipts/history files и8 raw logs.
Core 4.0.1 installed618 exact paths/bytes; NativeRun48/CUE8, student107.247/
full120.018/student111.065/site0.358s exit0; оба bank href/native11.1; Body40.629s,
root-only owner, real open/manual90-minute estimate, required/individual,
closed participant fields absent/resources0/noZIP. Student178bytes, author43
и runtime667 сохранены. Exact native proof: `/tmp/cybersecurity-core-patch-20261008/verified-final-native.json`.
[Required CI 37742519419](https://github.com/BSU-RFCT-Afonenko-Courses/Cybersecurity/actions/runs/37742519419) **SUCCESS** на exact head
fd62bdb3de1d2c9fce8a51dde9fcb7636e58cb9c; публикационный uploader student
SKIPPED, merge/deploy не выполнялись. Шаг16 выполнен. Курс не merge/deploy/branch cleanup.

Шаги 17–18 pending: first durable nine-owner final history, fresh branch/tag/
Release/worktree guards, exact refs cleanup и final docs handoff ещё не выполнены.
Теги/Releases/source producer SHA, serving gh-pages, OPEN automatic heads
и все пользовательские worktrees/Course ветки сохраняются.

Подтверждение07:23 UTC: Course PR#4 остаётся OPEN; CI37742519419 completed SUCCESS
на headfd62bdb3de1d2c9fce8a51dde9fcb7636e58cb9c. Exact receipt: /tmp/cybersecurity-final-pr-20261008/verified-pr-ci.json.
Шаг16 выполнен;17–18 ещё pending.

## Прямое позднее указание: удалить Course docs — 07:33 UTC

По запросу пользователя каталог `/home/tolya/Cybersecurity/docs` полностью
удалён: 36 файлов перед удалением побайтно совпали с Git
`fd62bdb3de1d2c9fce8a51dde9fcb7636e58cb9c`; untracked/symlink материалов нет.
README,43 авторских источника и runtime667 не менялись. Старый owner plan и
технические snapshots остаются только в Git; Course docs не восстанавливать
и не создавать заново под другим путём. Действующая передача —
[PR #4](https://github.com/BSU-RFCT-Afonenko-Courses/Cybersecurity/pull/4) и итоговый отчёт Core.
Фактический новый head `b6b085cf0541785d11159bd9a106cd131dfabaf0`, tree `f6a3732feca1bad1fd4c4ed4e533edbb6b230e5b`; PR OPEN.
Предыдущий CI37742519419/fd62 SUCCESS является историческим результатом.
Новый [CI 37743840665](https://github.com/BSU-RFCT-Afonenko-Courses/Cybersecurity/actions/runs/37743840665) **SUCCESS** на exact новом head;
шаг16 выполнен. Публикация SKIPPED, курс не merge/deploy. Шаги17–18 ещё pending.
Exact cleanup receipt: `/tmp/cybersecurity-docs-cleanup-20261008/verified-cleanup.json`.

Финальный актуальный gate07:37 UTC: PR4 OPEN/headb6b085cf0541785d11159bd9a106cd131dfabaf0,
CI37743840665 completed SUCCESS, deploy SKIPPED, docs ABSENT. Все36 удалённых
Course docs файлов восстановимы из Gitfd62, README/runtime667/author43 сохранены.
Шаг16 выполнен;17–18 pending. Exact receipt: /tmp/cybersecurity-docs-cleanup-20261008/verified-pr-ci.json.


## Финальный архивный checkpoint: шаги 17–18 (2026-10-08T07:58:45.289496+00:00)

Шаг 17 выполнен: 46 LOCAL и 11 REMOTE веток удалены; 11 checkout переведены
в detached HEAD без изменения HEAD/bytes/status. Все tags и 61 Releases
сохранены; main, native serving gh-pages и API-confirmed OPEN bot heads
сохранены. Все 13 исходных пользовательских checkout и Course исключены
из удаления. Квитанции before/after/operations/verified-cleanup сохраняются
в Core архивном checkpoint до очистки активных исторических документов.

Шаг 18: итоговый маршрут подготовлен к проверенной передаче. Последние планы,
ROOT START/AGENTS, root ledger и квитанции сохранены этим Git checkpoint
до удаления exact known completed plans/stub/metadata/root snapshots и
новых датированных completion trees. Текущие контракты остаются в spec/index;
итоговые факты — docs/releases/2026-10-08-implementation.md. Финальная
проверка удаления и ссылок записывается после операции; итоговый docs commit
и push выполняются после независимого review.

Текущий Course PR #4 OPEN: b6b085cf0541785d11159bd9a106cd131dfabaf0,
CI 37743840665 SUCCESS, publication SKIPPED. Course docs отсутствует:
36 файлов сохранены в Git fd62bdb3de1d2c9fce8a51dde9fcb7636e58cb9c
до удаления по прямому указанию пользователя. Course не merge/deploy;
его README, 667 runtime и 43 authored источника не менялись при очистке.
