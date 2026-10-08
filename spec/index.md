---
type: specification-index
component: course-print
status: current
updated: 2026-10-08
---

# Индекс спецификаций Print

Версия расширения определяется [descriptor](../_extensions/course-print/_extension.yml) того же Git ref.
Код, descriptor и документация выпуска читаются из одного точного тега. Изменения main после выпущенного тега — **unreleased**.

`current` означает правила кода на выбранном ref; `accepted-next` — согласованный контракт будущего выпуска, который ещё не реализован. `historical` сохраняет происхождение решений без нормативной силы. У каждого правила один владелец: общую модель задаёт Core, этот репозиторий задаёт только свой экспорт или сопровождение сайта. README, руководство, планы и примеры не образуют отдельного общего контракта.

| Документ | type | component | status | Нормативный владелец и область |
| --- | --- | --- | --- | --- |
| [Print: действующий контракт](../docs/public-body.md) | specification | course-print | current | participant Body → native Pandoc/Typst PDF; закрытые поля, ресурсы и целостность |
| [Диагностика](../docs/diagnostics.md) | reference | course-print | current | Собственные ID и внешние причины этого адаптера |
| [Body Core](../../quarto-course/docs/body-export.md) | specification | course-core | current | Общий producer transport и selected source input |
| [Авторская модель Core](../../quarto-course/spec/index.md) | specification/index | course-core | current | Банк, условия, решения и назначения |
| [Результат реализации](../docs/releases/2026-10-08-implementation.md) | implementation-report | course-print | historical | Шаги 8 и завершение общего маршрута |
| [Карта сохранённой истории](https://github.com/Afonenko-Course-Tools/quarto-course-print/blob/63cc9de26a894d5b5132f6463f3bba6e044dd332/docs/history/2026-10-08/README.md) | history | course-print | historical | Исходные планы, probes/evidence, refs и provenance |

Банк и назначения принадлежат текущему Core; этот адаптер проверяет свой вход
на собственной границе. Порядок выпуска и финальные проверки сохраняются в
[отчёте реализации](../docs/releases/2026-10-08-implementation.md).
