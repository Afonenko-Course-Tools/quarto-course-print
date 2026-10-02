# Публичный transport тела курса

Print принимает `schema: course-body-package-v1` как закрытый набор полей публичной проекции. Это контракт передачи данных между проверенным производителем и потребителем; сам JSON не доказывает происхождение из owner-сессии. Тип `PublicBodyPackage` экспортирован из `infrastructure/transport.ts`.

| Объект | Обязательные поля |
| - | - |
| Пакет | `schema`, `owner`, `release`, `apiVersion`, `questions`, `works`, `resources` |
| Задание | `owner`, `id`, `key`, `source`, `visibility`, `answerType`, `condition`, `publicAnswer` |
| Работа | `owner`, `id`, `key`, `source`, `kind`, `title`, `items` |
| Ресурс | `owner`, `source`, `effectiveBase`, `target`, `sha256`, `data`, `visibility` |

Все поля обязательны; неизвестные поля отклоняются. `owner` соответствует общему каноническому имени `^[a-z][a-z0-9-]*$`. `release` — непустая строка; `apiVersion` — непустой список неотрицательных целых чисел штатного Pandoc JSON. `questions`, `works`, `resources` — списки. Источники `source` и ресурсный `effectiveBase` — канонические относительные пути внутри owner без абсолютного префикса, обратных слешей, URI, пустых частей и `.`/`..`. `effectiveBase` сохраняет путь главного QMD, а не basename включённого файла или фиктивную точку.

`id` задания имеет форму `exr-*`, работы — `sec-*`, суффикс содержит lowercase буквы, цифры и дефисы. `key` равен `owner/id`; имена уникальны. `source` сохраняет owner-relative provenance и не заменяет канонический ключ. `visibility` задания и ресурса равен `public`. `answerType`: `manual`, `single-choice`, `numeric`, `multipart` или `matching`. `condition` и `publicAnswer` — списки нативных Pandoc-блоков. Работы имеют `kind: lab|test|exam`, непустой `title` и фиксированный непустой упорядоченный список неповторяющихся ключей существующих заданий. Семантику ownership, вариантов ответов и membership проверяет общий контракт Core; Print проверяет transport bindings без дополнительного педагогического валидатора.

Закрытые ключи, решения, grading notes и приватные Header/identity seals остаются у производителя. Поля `closedKey`, `solution`, `gradingNotes` запрещены даже в невыбранном задании. Все публичные тела проходят прежний ограниченный capability guard: закрытые маркеры, native Cite, RawBlock/RawInline, произвольные якоря, метки фигур/уравнений и неотображённые локальные URL отклоняются. Своего парсера или numbering Print не добавляет.

Ресурс содержит конкретные Base64 bytes в `data` и lowercase SHA-256 в `sha256`. Print декодирует и хеширует все ресурсы до записи. Значение `checked:true`, opaque receipt или один hash без данных не заменяют эти bytes. `target` — уникальный безопасный путь `resources/...`; фактически копируются только точные Image/Link targets публичного документа. Прозовое упоминание пути не выбирает файл. Owner policy и current producer resource seal проверяет вызывающая сторона через producer API; Print не открывает файл из `source` и не определяет его видимость по имени.

`preparePrint` / `renderPrint` используют прежние entrypoints и рецепт. Перед `renderPrint` caller обязан получить текущую публичную проекцию после успешной проверки producer handle и конечных URL. Прежнее доверенное `upstreamCurrent:true` остаётся обязательным; arbitrary `checked:true` не подтверждает producer integrity и не включает печать. Повторное использование, текущие PDF/ресурсы, восстановление при отказе и установленный recipe сохраняют прежние guards.

Legacy `experimental: p0-native-ast-v1` поддерживается отдельно для закреплённой fixture Core, с прежней формой входа. Одновременные `schema` и `experimental`, неизвестная схема или неизвестная experimental capability отклоняются. Вручную заданный public transport fixture проверяет установленный Print и не выдаётся за production owner evidence. General body export, другие engines/carriers, private teacher Print, rich QRC binding и полная пагинация остаются вне этой поставки.
