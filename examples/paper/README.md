# Печатные задания

Подготовка следующего выпуска (`accepted-next`). Эти исходники показывают
согласованный новый банк; совместный runtime/render ещё проверяется по
[плану владельца](../../docs/plans/2026-10-08-implementation.md).
Минимум — Quarto 1.11.5 и CUE 0.17.1. [Правила миграции](../../docs/authoring-next.md).

Для локального кандидата из корня репозитория Print:

```sh
CORE=/absolute/path/to/quarto-course bash tools/check-demo.sh
```

Последняя опубликованная группа закреплена на Core `v3.0.2`, Print `v0.2.1`
и [demo-20261007-ru2](https://github.com/Afonenko-Course-Tools/quarto-course-print/tree/demo-20261007-ru2/examples/paper).
Эти refs описывают прежнюю готовую группу; pins новых исходников будут заменены
точными опубликованными тегами после проверки. Новый demo URL пока не объявлен.
`BUILD.json` готового результата должен сохранить точный producer commit,
фактические зависимости и профиль. Готовый HTML использует внешние native
GitHub source-ссылки, без копирования закрытых QMD в student output.

## Банк и два варианта

Core устанавливается в `bank`, адаптер — в корень группы. `course.id` объявлен
один раз в корне; `build.ts` явно выбирает книгу `bank` и каждый вариант.
`exercise-bank: true` и default `open` заданы в native конфигурации банка.
Каждое задание имеет собственные difficulty/time; контрольные условия явно
restricted. Открытый разбор `exr-public-demo` содержит публичное решение,
а ссылки на него находятся в `.assessment-preview` вариантов, вне состава.

Student и full используют одинаковый набор глав и отдельные outputs
`_book/student`/`_book/full`. Student оставляет заголовки работ и preview,
убирая restricted условия и ссылки назначений; full показывает полный банк.
Full остаётся профилем по умолчанию демонстрации. При переключении
student → full → student закрытые условия, ресурсы и поисковые записи не
должны оставаться в student. Выбранный export получает текущий полный источник
независимо от последнего HTML-профиля.

```sh
cd bank
quarto render --profile student
quarto render --profile full
quarto render --profile student
```

Назначенное optional контрольное задание не заменяет обязательное.
Неназначенная открытая задача остаётся в банке и отсутствует в обеих выдачах.
Preview, внешние заголовки работы и окружающая проза не экспортируются;
внутренний заголовок условия сохраняется.

`build.ts` передаёт participant `publicPackage` в Print. Restricted condition
допустимо в печатной выдаче; closedKey, solution и gradingNotes остаются вне неё.
Получаются PDF вариантов и ordinary native PDF из `ordinary.qmd` вне банка.
Для проверки настоящих PDF нужен Poppler; runtime не требует npm или сети.
[Диагностика Print](../../docs/diagnostics.md).
