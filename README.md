---
type: documentation
component: course-print
status: current
updated: 2026-10-08
---

# Quarto Course Print

[Индекс спецификаций](spec/index.md) описывает контракт текущего Git ref.
Версия определяется descriptor этого ref; код и документация устанавливаемого
выпуска читаются из одного тега. Изменения main после выпущенного тега —
**unreleased**. Минимум — Quarto 1.11.5 и CUE 0.17.1.

Print создаёт публичный PDF из текущей native проекции Core `course-body-package-v1`. Вызывающий код использует Core `collectExport(courseRoot, {book, work, profiles})`, затем `buildBodies(result, {projectRoot, courseId, work, includeClosed:true})` и передаёт Print результат `publicPackage`. Идентификатор курса объявляется один раз в корне. Полный захват исходников включает контрольные QMD, исключённые из студенческого HTML, и не требует полной HTML-сборки.

```sh
quarto add Afonenko-Course-Tools/quarto-course-print@v0.3.0 --no-prompt
deno run --allow-read --allow-write --allow-run=quarto --allow-env \
  _extensions/Afonenko-Course-Tools/course-print/entrypoints/export.ts \
  public-package.json course-a/sec-work-one output header.json
```

Команда показывает путь при установке из GitHub; локальная установка может использовать `_extensions/course-print`. Указывайте фактический путь, созданный Quarto. Необязательный `header.json` содержит поля `date` и `group`. Ключ работы должен присутствовать в пакете. Результат включает `handout.pdf`, `public.json` и ресурсы, выбранные по точным native адресам Image/Link. Print запускает `quarto pandoc` и `quarto typst compile` со своим установленным Typst-шаблоном и шрифтами DejaVu/Latin Modern. Поддерживаются кириллица, выделение, код и формулы. Исходные движки и авторские project hooks повторно не запускаются.

До копирования результата компиляции Print отклоняет закрытые поля вопросов (`closedKey`, `solution`, `gradingNotes`), закрытые маркеры, некорректный транспорт, исходные и служебные пути ресурсов, псевдонимы и коллизии путей, неверные хеши ресурсов и неподдерживаемые возможности AST. Поддерживаются публичные формы manual, numeric, single-choice, multipart и matching. Обычные native заголовки сохраняют текст; якоря отдельных страниц удаляются. Сложные якоря, ссылки QRC, цитирования и raw-разметка не поддерживаются. Экспериментальный P0-транспорт больше не принимается. Символические ссылки в пути результата запрещены. Каждый экспорт компилирует текущие байты; receipts, сведения о toolchain, promotion/rollback и входные boolean-доказательства не являются частью runtime.

Для каждой работы используйте отдельный каталог результата. Неудачная компиляция не создаёт нового успешного результата: вызывающий код проверяет код завершения процесса. Одновременные сборки в общем каталоге не поддерживаются. Собственные ошибки содержат `ADAPTER`, компонент Print и известный контекст; ошибки входа CLI имеют `PRINT.INPUT_INVALID`. Отказы внешних инструментов сохраняют их исходные сообщения и потоки. Подробнее — [справочник диагностики](docs/diagnostics.md).

```sh
CORE=../quarto-course bash tools/check.sh
```

Полная проверка устанавливает настоящие пакеты Core и Print через `quarto add`, собирает авторские full/student-примеры, формирует native Body, проверяет закрытые данные и целостность ресурсов, компилирует PDF и запускает установленный CLI через `quarto run tests/installed-cli.ts REPO PACKAGE`. Проверяйте Quarto 1.11.5 с CUE 0.17.1; для проверки PDF нужен Poppler. Runtime не требует npm или сетевых зависимостей. См. [публичный транспорт](docs/public-body.md).

## Установка выпуска

Версия определяется descriptor того же Git ref. Код, descriptor и документация
установленного выпуска читаются из того же точного тега, что указан в команде.
Сохраните `_extensions` в Git курса; для обновления проверьте diff и выполните
проверки курса. Опубликованные теги неизменяемы; исправления получают новый тег.

## Общие назначения заданий

Работа `lab|seminar|practical|test` объединяет один или несколько списков
`.task-items`. Body сохраняет упорядоченные qualified `items` и обязательную
карту `assignments` с теми же ключами: `{stage?, requirement, workMode}`.
Print помечает optional вопросы и не применяет формулу оценки. В test/practical
все назначенные условия restricted. Stage demonstration требует открытой
канонической demonstration с фактическим публичным решением. Сайт и participant
выдача имеют разные границы: restricted условие разрешено в PDF, закрытые ключи,
решения и gradingNotes остаются запрещены. Полные правила —
[публичный транспорт](docs/public-body.md).

[Самодостаточная демонстрация](examples/paper/README.md) содержит обычный native PDF и два варианта на основе банка.
