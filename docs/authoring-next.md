---
type: authoring-guide
component: course-print
status: accepted-next
updated: 2026-10-08
---

# Назначенные условия в Print

Это подготовка согласованного следующего выпуска, а не обещание опубликованной версии. [Целевой контракт Core](../../quarto-course/spec/authoring-model-next.md) задаёт общую модель; [план владельца](plans/2026-10-08-implementation.md) фиксирует порядок внедрения и свежие проверки. Существующие публичные API владельца сохраняются. После реализации и проверки эти правила переносятся в действующий контракт и README. Минимум следующего выпуска — Quarto 1.11.5, CUE 0.17.1.

Print продолжает принимать `buildBodies(...).publicPackage` и компилировать выбранную работу через native Pandoc/Typst. API `preparePrint`/`renderPrint`, checks ресурсов и validation-before-materialization сохраняются.

`statementVisibility: open|restricted` описывает публикацию условия на сайте. Body `visibility: public` описывает participant-safe часть выдачи. Поэтому выбранное restricted условие допустимо в PDF; `closedKey`, `solution`, `gradingNotes`, закрытые маркеры и приватные ресурсы по-прежнему запрещены. Получение full исходников producer не даёт Print права читать закрытый payload.

Body сохраняет `schema: course-body-package-v1`. Работа имеет `kind: lab|seminar|practical|test`, упорядоченные qualified `items` и обязательную карту `assignments`. Её ключи точно совпадают с `items`, например:

```json
{
  "items": ["course-a/exr-one", "course-a/exr-two"],
  "assignments": {
    "course-a/exr-one": {"requirement":"required", "workMode":"individual"},
    "course-a/exr-two": {"stage":"classroom", "requirement":"optional", "workMode":"pair"}
  }
}
```

Локальные `exr-*` aliases в Body-карте не допускаются. Print помечает optional вопрос и не рассчитывает платформенную оценку. Stage/workMode не меняют время самой задачи и не предоставляют права на решение. Все вопросы `test` и `practical` должны иметь `statementVisibility: restricted`.

PDF включает только назначенные условия, поля ответа и выбранные по native Image/Link ресурсные slots. Внутренний заголовок условия сохраняется; `.assessment-preview`, внешние заголовки занятия, окружающая проза и неназначенные задачи не входят в выдачу. `examples/paper` показывает ordinary native PDF вне банка, открытый разбор и два варианта restricted задач.

Сейчас release pins ещё указывают на последние опубликованные теги. Новые install/demo/source refs появятся только после решения о версиях и успешных releases; новый URL до этого не выдумывается. Готовый asset должен содержать точный producer commit и фактические зависимости в `BUILD.json`. Эта подготовка не подтверждает render, CI или выпуск.
