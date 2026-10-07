# Print: план владельца

Статус: следующий этап, реализация не начата. Выполнять пункт 8 и затем
пункты 12–13/17–18 [линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
[Целевой контракт Core](../../../quarto-course/spec/authoring-model-next.md)
задаёт поля банка/работ/назначений. Quarto 1.11.5 / CUE 0.17.1;
широкую Windows CI matrix не добавлять.

## Изменения, документация и проверки

В `_extensions/course-print/infrastructure/transport.ts` и `_extensions/course-print/application/export.ts` сейчас есть жёсткое `q.visibility === public`, старые kinds `lab|test|exam|handout` и requirements map. Мигрировать эти TS shape/guards вместе с новым Core Body contract: отдельное statementVisibility open/restricted — о публикации условия; нынешнее visibility:public остаётся participant-safe transport. Participant пакет допускает назначенное restricted условие и его выбранные resources, но всегда отклоняет closedKey/solution/gradingNotes и closed markers. Обновить `_extensions/course-print/application/{contracts,materialize,compiler}.ts`, `_extensions/course-print/infrastructure/files.ts` и `_extensions/course-print/entrypoints/export.ts`. Сохранить validation-before-materialization, hash/path/output-alias проверки и нынешние публичные `preparePrint`/`renderPrint` API. Не создавать runtime-импорт Core или общий adapter пакет.

Сначала вынести только subprocess `command(cmd,args,input?,cwd?)` из transport в новый `_extensions/course-print/infrastructure/process.ts`; затем новый маленький `_extensions/course-print/infrastructure/diagnostics.ts`. ADAPTER сохраняется с Print/source/question/work/resource/field/hint; PRINT.INPUT_INVALID только у собственных CLI input guards. Pandoc/Typst nonzero хранит исходные tool/exit/stdout/stderr, не становится ADAPTER content failure; неизвестные exceptions сохраняют stack. После отказа новый PDF отсутствует и старые outputs не повреждены.

Обновить `README.md`, `docs/public-body.md` (убрать смешение condition-publication и key visibility), создать `docs/diagnostics.md`, обновить owner plan, `tests/{production,export,native}.test.ts`, `tests/native-sample.ts`, `tests/native-course/{corpus,work-one,work-two}.qmd`, `tests/native-course/{_quarto.yml,package.ts}`, `tests/student-package-cli.ts`, `tests/installed-cli.ts`, `examples/paper` config/QMD/build.ts и bank. Проверить ordinary native PDF вне банка и два bank варианта; пример ungraded handout заменить нормальной работой с явными optional назначениями.

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
