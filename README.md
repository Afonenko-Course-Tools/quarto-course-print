# Quarto Course Print — экспериментальный P0

Узкий потребитель общего пакета `p0-native-ast-v1`, используемого также Moodle и пробой PrairieLearn. Он создаёт публичный бланк из нативных блоков Pandoc в изолированном стандартном проекте Quarto Typst. Исходный авторский QMD и веб-сборка потребителю не нужны. Преподавательский PDF не создаётся.

## Получение общего входного пакета

Для производителя нужны Quarto и CUE в PATH. Укажите в `CORE` распакованный исходный Core — каталог с `tests/probes/export-boundary`. Из каталога этого адаптера выполните:

```sh
CORE=/absolute/path/to/extracted/core-source
deno run --allow-read --allow-write --allow-run --allow-env \
  "$CORE/tests/probes/export-boundary/package.ts" \
  "$CORE/tests/probes/export-boundary/fixtures/corpus.qmd" "$PWD/content-package.json" \
  "$CORE/tests/probes/export-boundary/fixtures/work-one.qmd" \
  "$CORE/tests/probes/export-boundary/fixtures/work-two.qmd"
```

В явном составе источников `corpus.qmd` объявляет два задания, а `work-one.qmd` и `work-two.qmd` — отдельные работы. Каждая работа использует `assessment.kind: lab`, явный `sec-*` ID первого заголовка и один список `.assessment-items`. Ключи — `course-a/sec-work-one` и `course-a/sec-work-two`; обе работы используют `course-a/exr-manual`. Контейнеры `#assessment-*` отклоняются. Полученный пакет без изменений подходит другим потребителям P0.

## Печать и проверка

Проверены Deno **2.7.14**, Quarto **1.11.5**, Pandoc **3.10**, Typst **0.15.1**. Производитель использует CUE **0.17.1**. npm и сетевые импорты во время печати не нужны.

```sh
deno run --allow-read --allow-write --allow-run --allow-env \
  _extensions/course-print/entrypoints/export.ts \
  content-package.json course-a/sec-work-one output
P0_PACKAGE="$PWD/content-package.json" deno task test
```

Необязательный четвёртый аргумент — JSON с полями `date` и `group`. Заголовок берётся из первого заголовка страницы работы; бланк содержит дату, группу, имя и публичные поля ответов. Тестам дополнительно нужен `pdftotext` из Poppler.

Результат: `output/handout.pdf`, `output/public.json` и выбранные публичные ресурсы рядом с PDF для локальных ссылок. Временный проект получает только публичные узлы и нужные файлы. Пустая техническая QMD-оболочка подключает валидированный JSON через Lua; это не авторский QMD и не повторный разбор Markdown-условий.

Для воспроизведения числового, составного и matching-бланка:

```sh
deno run --allow-read --allow-write --allow-run --allow-env \
  "$CORE/tests/probes/export-boundary/package.ts" \
  "$CORE/tests/probes/export-boundary/fixtures/answers.qmd" "$PWD/answer-package.json"
deno run --allow-read --allow-write --allow-run --allow-env \
  _extensions/course-print/entrypoints/export.ts \
  answer-package.json course-a/sec-work-answers answer-output
```

| Возможность | Фактическая граница P0 |
| - | - |
| Публичная работа manual/choice, математика, таблица, изображение без метки, файл, внешний URL | PDF сформирован; шапка и поля визуально проверены |
| Numeric/multipart/matching | Общий модуль создаёт публичный AST; поля, подписи и все варианты банка напечатаны |
| LMS-импорт/оценивание этих форм | Печать этого не доказывает; реальные платформы здесь не проверяются |
| Решения, key, grading-notes и отметки correct, включая demo-sol | В публичный документ не входят; преподавательского PDF нет |
| Закрытое задание, закрытая ссылка, неразделённый маркер правильности | Отказ `ADAPTER` до PDF |
| Метки фигур/уравнений, цитаты, raw-узлы и произвольные якоря | Консервативно отклоняются; собственного parser/numbering нет |
| Производственная политика видимости, print-items, full web, общий download | Не реализованы этой пробой |

Ресурсы выбираются по точным Image/Link URL нативного AST. Упоминание имени в прозе или совпадение по префиксу не копирует файл. Хеш и владелец проверяются; пустые компоненты, `.`/`..` и повторные разделители пути отклоняются до записи. Общий производитель разделяет вложенные/соседние решения и замечания, передаёт все вхождения ответов CUE и отклоняет неподдерживаемые условия профиля до публичной проекции.

Контракт не обещает общего переноса богатого AST. Даже если отдельная проба умеет одну размеченную формулу на целевой странице, этот адаптер принимает более узкое подмножество. Производственная схема Core не меняется.

## Установка

В чистом каталоге потребителя проверено:

```sh
quarto add /absolute/path/to/quarto-course-print --no-prompt
```

Установленный entrypoint выполнен без node_modules и с запретом сети. Манифест описывает экспериментальный контракт; активация только явной командой, без автоматического производственного render-hook.

Официальные источники проверены 2026-10-01: [Quarto Typst](https://quarto.org/docs/output-formats/typst.html), [Pandoc Lua filters](https://pandoc.org/lua-filters.html). Шаблон оформления не скопирован: используется установленный стандартный шаблон Quarto.
