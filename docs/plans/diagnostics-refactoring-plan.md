> Исторический план/исследование. Актуальный маршрут от 8 октября 2026: [план владельца](2026-10-08-implementation.md).
> Исходный текст сохранён без правок; его старые статусы и конфликтующие правила не действуют.
> Нужные материалы сохранить в Git до удаления из активной ветки.

# План рефакторинга диагностики Print — 7 октября 2026

Для исполнения: subagent-driven-development либо executing-plans по выбранному
пользователем способу, задачи и review последовательно.

**Цель:** полезные русские сообщения с контекстом работы/вопроса/ресурса,
сохранение внешней диагностики и прежнего public-only Body.
**Архитектура:** CLI JSON → validatePackage → prepare → verifyResources →
materialize → native Pandoc/Typst → копирование проверенного PDF в output. Публичный renderPrint API
и validation-before-materialization сохраняются.
**Средства:** существующие Deno/Quarto/Pandoc/Typst, без runtime-импорта Core
и общего адаптерного пакета. **Основание:** [общие решения](../../../specs/course-change-plan.md#исследование-и-план-рефакторинга-7-октября-2026).
База main `2c8bab9`, подтверждена через GitHub. Здесь сохранены текущие правила
public-only, capability и resource hashes; новые платформенные возможности не вводятся.

Общие ограничения: устойчивые нынешние ID, в том числе широкий ADAPTER;
контрпримеры только tests; корректные русские примеры в документации;
native author warning policy и прежняя организация инструментальных проверок.
При ревью проверить: закрытые поля, неподдержанный AST/URL, неверный hash, output alias,
внешний nonzero до записи нового PDF. Эти случаи принадлежат двум задачам ниже.

## PR1 Отделить внешний запуск от Body validation

Создать: `_extensions/course-print/infrastructure/process.ts`.
Изменить: `infrastructure/transport.ts`, `application/compiler.ts`.
Интерфейс `command(cmd:string,args:string[],input?:string,cwd?:string)
→ Promise<string>` переносится из transport; возвращает stdout, сохраняет
stderr и причину с tool/exitCode/stdout/stderr при отказе. Body validators
не классифицируют Pandoc/Typst failure как ADAPTER.
Создать focused `tests/process.test.ts`; дополнить `tests/production.test.ts`.
Все runtime-пути этого плана относительно `_extensions/course-print/`;
сокращённые transport.ts/files.ts относятся к infrastructure, materialize.ts/
contracts.ts/compiler.ts — к application.

- [ ] Fake compiler с внешним ID, stdout/stderr и nonzero: причина сохранена,
  конечный PDF не появился; exit 0 с stderr не превращается в авторскую ошибку.
- [ ] Перенести только subprocess-функцию и обновить её импорты; ресурсные/AST
  предикаты оставить в transport. Никакого нового framework и сравнения stderr regex.
- [ ] Выполнить `deno test --no-config --no-lock --no-npm --cached-only --deny-net --allow-read --allow-write --allow-run --allow-env tests/process.test.ts tests/production.test.ts`;
  проверить прежние два native вызова компиляции и отсутствие запуска author hooks.
- [ ] Проверка изменений и отдельный коммит минимального разделения ответственности.

## PR2 Контекст собственных ошибок и CLI

Создать: `_extensions/course-print/infrastructure/diagnostics.ts`:
`diagnostic(code,message,context?,cause?) → Error & {code:string}`.
Изменить: `transport.ts`, `files.ts`, `application/export.ts`, `materialize.ts`,
`contracts.ts`, `compiler.ts`, `entrypoints/export.ts`.
Context: source/question/work/resource/field/hint из уже известных фактов;
source/ID вопроса передаётся в validateBody/verifyResources по месту вызова.
Широкий ADAPTER сохраняется; новый `PRINT.INPUT_INVALID` относится только
к прежним неименованным CLI usage/read/JSON guards.

- [ ] Дополнить export/production tests: ADAPTER с компонентом Print и field
  для closed fields, unsupported AST/link, hash/encoding; корректный пакет проходит.
  Output alias не изменяет вход и не создаёт конечный PDF.
- [ ] Перевести сообщения, добавить вопрос/работу/ресурс и исправление.
  CLI выводит ожидаемый diagnostic однократно; неизвестные exceptions сохраняют stack.
- [ ] Выполнить `CORE=/home/tolya/course-tools/quarto-course bash tools/check.sh`
  на обеих версиях Quarto: native full/student, Deno suites, installed CLI.
- [ ] Проверка изменений и коммит; public package contract, resource selection и порядок записи прежние.

## PR3 Документация и готовая группа

Создать: `docs/diagnostics.md`. Изменить: README, `docs/public-body.md`,
`examples/paper/_quarto.yml`, `examples/paper/bank/_quarto.yml`,
index/ordinary/bank QMD и README группы. У bank собственный lang и русский book.title.

- [ ] Русский справочник ID/смысла/исправления без ошибочных исходников;
  перевод активных собственных пояснений, native lang ru и source/repo/code-links
  по назначению. API/идентификаторы и foreign tool output сохраняются.
- [ ] Проверить только корректные demo scenarios и реальные PDF;
  `CORE=/home/tolya/course-tools/quarto-course bash tools/check-demo.sh`.
- [ ] Проверка изменений, PR и release из проверенного merged SHA; новый demo release
  передать потребителю по [плану групп](../../../specs/course-examples-release-plan.md#план-обновления-документации-и-демонстраций-7-октября-2026).

Полная текущая инструментальная проверка остаётся прежней; новое правило
нулевых предупреждений или обязательное накопление ошибок не вводится.
