# Печатные задания

Авторская разметка текущего Git ref для кандидата `0.3.1` (**unreleased**).
Общая модель принадлежит Core `v4.0.0`; минимум — Quarto 1.11.5 и CUE 0.17.1.
[План владельца](../../docs/plans/2026-10-08-implementation.md) фиксирует
фактические проверки и дальнейший выпуск.

Для локального кандидата из корня репозитория Print:

```sh
CORE=/absolute/path/to/quarto-course bash tools/check-demo.sh
```

Установка закреплённых выпусков из каталога этой группы после публикации нового тега:

```sh
quarto add Afonenko-Course-Tools/quarto-course-print@v0.3.1 --no-prompt
cd bank
quarto add Afonenko-Course-Tools/quarto-course@v4.0.0 --no-prompt
cd ..
quarto run build.ts
```

Нативные ссылки на исходники текущего примера подготовлены для тега `v0.3.1`.
До его публикации используйте локальный checkout и проверку выше; наличие команды
установки не подтверждает существование тега или готовность нового выпуска.
Историческая готовая группа в неизменяемом выпуске `demo-20261008` соответствует
прежнему тегу инструмента `v0.3.0` и этим кандидатом не пересобирается.
Её `BUILD.json` сохраняет точный commit, зависимости, профиль и
`sourceDirty: false`; исторические теги инструмента/демонстрации и архив остаются
неизменными. HTML использует штатное внешнее действие
GitHub source, без source modal и копирования закрытых QMD в student output.

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
