---
type: specification
component: course-print
status: current
updated: 2026-10-08
---

# Публичный native транспорт Body

[Core](../../quarto-course/docs/body-export.md) определяет producer Body и отбор
исходников. Print принимает `buildBodies(...).publicPackage` для выбранной работы;
API `preparePrint`/`renderPrint` используют native Pandoc/Typst без повторного
выполнения авторских движков и project hooks. Код и этот контракт относятся к одному Git ref; версия определяется его
descriptor. Документация установленного выпуска читается из того же тега.

Пакет `schema: course-body-package-v1` содержит `owner`, `release`, `apiVersion`,
`questions`, `works`, `resources`. Вопрос имеет канонический `key: owner/id`,
`source`, `visibility: public`, тип ответа и native Pandoc блоки
`condition`/`publicAnswer`. Обязательны `statementVisibility: open|restricted`
и boolean `hasPublicSolution`; необязательный `purpose` принимает
`demonstration|discussion|independent-study|control`.

`statementVisibility` описывает публикацию условия на сайте, а `visibility: public`
— безопасную выдачу участнику. Выбранное restricted условие допустимо в PDF.
`hasPublicSolution` передаёт факт открытого решения для проверки назначения;
само решение не входит в Print. Поля `closedKey`, `solution`, `gradingNotes`,
закрытые маркеры и приватные ресурсы запрещены для всех вопросов пакета.

Работа содержит `owner`, `id`, `key`, `source`, `kind`, `title`, `items`,
`assignments`; kind — `lab|seminar|practical|test`. `items` сохраняет порядок
уникальных qualified ключей вопросов. Обязательная карта `assignments` имеет
ровно эти ключи. Значение содержит `requirement: required|optional`,
`workMode: individual|pair|group` и необязательный
`stage: demonstration|classroom|homework`.

```json
{
  "items": ["course-a/exr-one", "course-a/exr-two"],
  "assignments": {
    "course-a/exr-one": {"requirement": "required", "workMode": "individual"},
    "course-a/exr-two": {"stage": "classroom", "requirement": "optional", "workMode": "pair"}
  }
}
```

Назначение demonstration требует `statementVisibility: open`,
`purpose: demonstration` и `hasPublicSolution: true`. В `test` и `practical`
допускаются только restricted вопросы. Необязательный `theoryTime` — положительное
конечное число минут, включая дробное; Print принимает его без расчёта времени.
Optional вопрос помечается в выдаче и не заменяет обязательный; формулу оценки
задаёт платформа. Body-карта использует qualified ключи, а не локальные ID.

PDF включает выбранные назначенные условия, поля ответа и ресурсы их native
Image/Link. Внутренние заголовки условия сохраняются, якоря исходных страниц
удаляются. `.assessment-preview`, внешние заголовки занятия, окружающая проза
и неназначенные задачи исключены producer Core. Поддерживаются manual, numeric,
single-choice, multipart, matching. Сложные якоря, QRC-ссылки, цитирования,
raw-разметка и неподдерживаемые узлы отклоняются.

Ресурс содержит `owner`, `source`, `effectiveBase`, `target`, SHA-256, bytes Base64
и публичную видимость. `effectiveBase` может быть абсолютным контекстом producer;
Print не открывает его. Безопасный относительный target, отсутствие aliases,
source/service paths и symlink, целостность bytes/hash проверяются до
материализации и компиляции. Упоминание имени файла в тексте ресурс не выбирает.

Core проверяет исходные декларации до student-проекции. Вызывающий код проверяет
завершение текущей native команды и передаёт текущий `publicPackage`; сохранённый
JSON не подтверждает новую сборку. Для каждой работы нужен отдельный каталог
результата. Неудачная компиляция не подтверждает успешную выдачу; caller проверяет
exit code. Runtime не вводит receipts, promotion/rollback или входные boolean
доказательства успешной сборки.

[README](../README.md) содержит установку и CLI, [диагностика](diagnostics.md) —
собственные отказы и внешние причины. Source и ID обозначают реальный вход;
позиции временного JSON не выдаются за строки QMD.
