# Quarto Course Print

Print создаёт PDF из проверенного публичного пакета `course-body-package-v1`. Отдельно сохраняется экспериментальный fixture-контракт `p0-native-ast-v1`, используемый историческими пробами Moodle и PrairieLearn. Адаптер создаёт публичный бланк из нативных блоков Pandoc в изолированном default staging. Документированные `quarto pandoc` и `quarto typst compile` используют установленный шаблон, partial и шрифты. Исходный авторский QMD и веб-сборка потребителю не нужны. Преподавательский PDF не создаётся.

## Производственный публичный transport

`schema: course-body-package-v1` обозначает только публичную проекцию: owner, release, Pandoc API version, канонические задания, фиксированные работы и конкретные публичные bytes ресурсов. Точный [контракт](docs/public-body.md) закрывает набор полей. `closedKey`, `solution`, `gradingNotes`, произвольные `checked`/receipt поля, закрытые маркеры и неподдерживаемые нативные узлы отклоняются, в том числе в невыбранном задании. Пакет с одновременно `schema` и `experimental` неоднозначен и отклоняется. Print не выделяет public части из private производственного пакета и не открывает исходные QMD.

Вызывающая сторона получает эту проекцию через актуальную проверку producer API Core: принадлежность owner-сессии, receipt, исходников, native наблюдений и ресурсной политики проверяет производитель. Проверка Print подтверждает форму transport и реальные SHA-256 переданных bytes; произвольная JSON-строка или `checked:true` не доказывают producer integrity. Параметр `upstreamCurrent:true` остаётся обязательным lifecycle-контекстом вызывающей стороны; перед его передачей нужно проверить producer handle. Installed transport-тест с вручную заданным публичным пакетом не доказывает реализацию producer API или выполнение owner engine.

## Печать и проверка

Рабочая цепочка публичной печати: успешный native render Core → завершение
owner → текущий `validateOwnerBodies` → `publicPackage` → `renderPrint` → PDF.
При составном выпуске потребитель вызывается после разрешения конечных ссылок;
выбор PDF для ZIP выполняет отдельный Download. Print не начинает сборку Core
и не выполняет повторно код документа.

Нужны Quarto с Pandoc/Typst и Deno в PATH для показанного CLI. Проверочные
сценарии рассчитаны на Quarto **1.10.18 / 1.11.5**, Deno **2.7.14**; закреплённому
fixture-производителю дополнительно нужен CUE **0.17.1**. npm и сетевые импорты
во время печати не нужны. `current-public-package.json` в следующем примере
должен быть получен из актуальной публичной проекции Core, а ключ работы —
соответствовать её `works`.

```sh
printf '%s\n' '{"date":"2026-10-01","group":"A"}' > header.json
printf '%s\n' '{"upstreamCurrent":true}' > context.json
deno run --allow-read --allow-write --allow-run --allow-env \
  _extensions/course-print/entrypoints/export.ts \
  current-public-package.json course-a/sec-work-one output header.json context.json
```

Четвёртый аргумент — JSON шапки (`{}` или поля `date` и `group`), пятый — явное подтверждение вызывающей стороны `upstreamCurrent:true`: пакет прошёл актуальную проверку, нужные вычисления и разрешение конечных URL. Это доверенное утверждение, не способ обновить старый пакет. При неизвестной актуальности сначала нужен upstream refresh; без подтверждения печать отклоняется. Заголовок берётся из первого заголовка страницы работы; бланк содержит дату, группу, имя и публичные поля ответов. Тестам дополнительно нужны `pdftotext` и `pdffonts`, замеру — `pdfinfo` из Poppler.

Результат: `output/handout.pdf`, `output/public.json`, выбранные публичные ресурсы и служебный receipt `.course-print.json`. Каталог целиком принадлежит одной работе. В download выбирайте PDF и необходимые ресурсы; JSON/receipt не обязаны быть публичной загрузкой. JSON читается штатным Pandoc reader напрямую: авторский QMD, Lua-оболочка, book hooks и повторные вычисления не запускаются.

Перед записью проверяются public projection, политика и hashes всех ресурсов пакета. Новый результат готовится целиком и заменяет принадлежащий цели каталог: устаревшие файлы не сохраняются. Чужой непустой каталог и symlink отклоняются. Если receipt отсутствует или не читается, принадлежность каталога нельзя подтвердить: непустой output отклоняется. Если owner/target читаются, но reusable fields повреждены, результат пересобирается. При ошибке старый результат не становится текущим; caller должен отметить preview устаревшим. Неудачная замена откатывается; если файловая система не позволила и откат, ошибка указывает сохранённый recovery-каталог. Это не crash-safe транзакция всего выпуска. После аварийного завершения процесса может потребоваться убрать его `.print-lock` вручную, убедившись, что процесс завершён.

## Проверяемое повторное использование

Без `toolchainIdentity` каждый вызов компилирует заново (`reusable:false`). Для reuse caller передаёт `toolchainIdentity`: 64 lowercase hex SHA-256 **действительно установленной immutable поставки Quarto/Pandoc/Typst**. Caller проверяет соответствие установки этому архиву; адаптер доверяет утверждению и не подменяет его строкой версии или собственным обходом частных каталогов Quarto. После изменения toolchain identity надо обновить. Не подставляйте произвольный hash ради hit.

```ts
import { renderPrint } from "./_extensions/course-print/application/export.ts";
const result = await renderPrint(currentPackage, workKey, freshTarget, header, {
  upstreamCurrent: true,
  toolchainIdentity: verifiedDistributionSha256,
  previous: previousOwnedTarget,
});
```

`previous` необязателен: по умолчанию проверяется существующий целевой каталог. API возвращает `status` (`built`/`reused`), `reusable`, `fingerprint`, `engineCalls` и `timings` в миллисекундах. Hit копирует проверенные bytes в свежий candidate; вёрстка не запускается. Отпечаток включает публичный AST, выбранные Image/Link ресурсы, шапку, конечные URL, installed template/partial/fonts и toolchain identity. В experimental fixture ключ и решение не входят в render hash; производственный пакет этих полей вообще не принимает. Release ID и невыбранный материал не входят в render hash; актуальная проверка пакета всё равно обязательна.

Typst `--deps --deps-format=json` проверяется после сборки. Depfile не перечисляет шрифты и linked attachments, поэтому они входят в явный индекс. Системные и embedded fonts отключены: установлены DejaVu 2.35 (Sans и Mono regular/bold/oblique/bold-oblique) и Latin Modern Math 1.959. Шаблоны Pandoc 3.10 и fonts имеют provenance, SHA и licenses в [манифесте поставки](_extensions/course-print/assets/manifest.json) и
[каталоге лицензий](_extensions/course-print/assets/licenses). Неизвестный compiler input блокирует сборку; неизвестная upstream зависимость требует refresh, а не анализа QMD собственным parser. `assets` в API — необязательный каталог **доверенного полного recipe**, не произвольная настройка из авторского содержимого.

Для нового выпуска coordinator передаёт только актуальные цели в свежий release staging. Удалённая цель и её ссылка туда не переносятся. Этот адаптер не ведёт глобальный registry и не координирует выпуск пяти книг.

| Возможность | Поддержанный публичный корпус |
| - | - |
| Публичная работа manual/choice, математика, таблица, изображение без метки, файл, внешний URL | Печать условия и публичных полей ответа с шапкой |
| Numeric/multipart/matching | Общий модуль передаёт публичный AST; Print сохраняет поля, подписи и варианты банка |
| LMS-импорт/оценивание этих форм | Печать этого не доказывает; реальные платформы здесь не проверяются |
| Решения, key, grading-notes и отметки correct, включая demo-sol | В публичный документ не входят; преподавательского PDF нет |
| Закрытое задание, закрытая ссылка, неразделённый маркер правильности | Отказ `ADAPTER` до PDF |
| Метки фигур/уравнений, цитаты, raw-узлы и произвольные якоря | Консервативно отклоняются; собственного parser/numbering нет |
| Политика Core, печатный план занятия и доставка | Публичную проекцию проверяет Core; `.print-items`, закрытая выдача и полная вёрстка раздатки требуют отдельных контрактов. Download подключается координатором |

Ресурсы выбираются по точным Image/Link URL нативного AST. Упоминание имени в прозе или совпадение по префиксу не копирует файл. Хеш и владелец проверяются; пустые компоненты, `.`/`..` и повторные разделители пути отклоняются до записи. Общий производитель разделяет вложенные/соседние решения и замечания, передаёт все вхождения ответов CUE и отклоняет неподдерживаемые условия профиля до публичной проекции.

Контракт не обещает общего переноса богатого AST. Даже если отдельная проба умеет одну размеченную формулу на целевой странице, этот адаптер принимает более узкое подмножество. Публичная печать требует документированного participating Body API Core. Проверка Print не подтверждает педагогическую валидность произвольного JSON, поддержку всех engines/carriers или готовность LMS-доставки.

## Отдельный экспериментальный корпус P0

Для производителя нужны Quarto и CUE в PATH. Временный companion Core закреплён на `4f5caf9a15b9bd36476cad8a646e81521fbd29d1` из `Afonenko-Course-Tools/quarto-course`; текущая незамерженная ветка не используется. Получите отдельный чистый checkout этого SHA (или исходный архив этого commit), затем укажите его каталог в `CORE`. Из каталога адаптера:

```sh
CORE=../core-print-fixture
deno run --allow-read --allow-write --allow-run --allow-env \
  "$CORE/tests/probes/export-boundary/package.ts" \
  "$CORE/tests/probes/export-boundary/fixtures/corpus.qmd" "$PWD/content-package.json" \
  "$CORE/tests/probes/export-boundary/fixtures/work-one.qmd" \
  "$CORE/tests/probes/export-boundary/fixtures/work-two.qmd"
```

В явном составе источников `corpus.qmd` объявляет два задания, а `work-one.qmd` и `work-two.qmd` — отдельные работы. Каждая работа использует `assessment.kind: lab`, явный `sec-*` ID первого заголовка и один список `.assessment-items`. Ключи — `course-a/sec-work-one` и `course-a/sec-work-two`; обе работы используют `course-a/exr-manual`. Контейнеры `#assessment-*` отклоняются. Полученный пакет без изменений подходит другим потребителям P0.

Для воспроизведения числового, составного и matching-бланка:

```sh
deno run --allow-read --allow-write --allow-run --allow-env \
  "$CORE/tests/probes/export-boundary/package.ts" \
  "$CORE/tests/probes/export-boundary/fixtures/answers.qmd" "$PWD/answer-package.json"
deno run --allow-read --allow-write --allow-run --allow-env \
  _extensions/course-print/entrypoints/export.ts \
  answer-package.json course-a/sec-work-answers answer-output header.json context.json
```

Для этого корпуса `P0_PACKAGE="$PWD/content-package.json" deno task test`
запускает тесты адаптера. Старый fixture-пакет и текущий публичный пакет имеют
разные контракты; результат одной проверки не заменяет проверку другой.

## Установка

В каталоге потребителя:

```sh
quarto add Afonenko-Course-Tools/quarto-course-print --no-prompt
```

Для локального checkout рядом с потребителем: `quarto add ../quarto-course-print --no-prompt`.
Путь установленного entrypoint зависит от способа установки:
из GitHub это `_extensions/Afonenko-Course-Tools/course-print/entrypoints/export.ts`,
локально — `_extensions/course-print/entrypoints/export.ts`. Примеры выше
выполняются из checkout адаптера и используют его короткий путь.

Установленный entrypoint выполнен без node_modules и с запретом сети. Манифест явно описывает производственный публичный transport и отдельный экспериментальный контракт; активация только явной командой, без автоматического render-hook.

## CI и локальная проверка поставки

```sh
git clone https://github.com/Afonenko-Course-Tools/quarto-course.git ../core-print-fixture
git -C ../core-print-fixture checkout --detach 4f5caf9a15b9bd36476cad8a646e81521fbd29d1
CORE=../core-print-fixture bash tools/check.sh
```

Скрипт проверяет точный SHA и чистоту Core, создаёт experimental вход заново, запускает tests, затем `git archive HEAD` → штатный `tar` → `quarto add` в чистом consumer отдельно для experimental пакета и вручную заданной public transport fixture. Поэтому перед этой проверкой изменения расширения должны быть закоммичены. Проверяются byte-for-byte installed assets, реальный PDF/ресурсы и ошибка freshness, запрещён доступ Deno к developer checkout. Установленный entrypoint не импортирует исходный repo. Для PR CI использует одинаковые проверки с Quarto `release` и `pre-release`; значения каналов подвижны, action revisions закреплены полными SHA. Установленный render в Linux CI выполняется в отдельном network namespace (`sudo unshare --net`, затем сброс прав через `setpriv`). Локально `--deny-net` ограничивает только Deno, не его дочерние процессы; если namespace недоступен, это не полный offline proof.

```sh
# Для замера нужен ваш проверенный identity; результаты создаются вне исходного Git.
deno run --allow-all tools/benchmark.ts content-package.json ../print-bench "$VERIFIED_TOOLCHAIN_SHA256"
```

Замер изменяет копию fixture-пакета и учитывает материальный этап Print без upstream collect/validate и
вычислений. Reuse должен иметь `engineCalls: 0`; время зависит от документа и
среды и не является гарантией для холодной машины. Автоматическая пагинация
может разделять условие и поле ответа; полный дизайн раздатки и keep-together
больших заданий остаются отдельной работой.

Документация инструментов: [Quarto Typst](https://quarto.org/docs/output-formats/typst.html), [Pandoc templates](https://pandoc.org/MANUAL.html#templates), [Typst deps](https://typst.app/docs/changelog/0.14.0/), [Quarto Typst CLI](https://quarto.org/docs/cli/typst.html).
