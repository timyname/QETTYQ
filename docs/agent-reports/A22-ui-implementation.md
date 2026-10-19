# A22 · production UI slice

Дата проверки: 20 октября 2026 года  
Область: semantic React/CSS поверх существующей session/data логики.

## Направление

Спокойный mobile-first интерфейс «современная Астана»: холодный светлый canvas,
нефритовые интерактивные элементы, лаймовый active-state и стекло только там,
где поверхность действительно лежит над картой или визуальным слоем. Изображения
15 категорий используются как media 3:4; текст, CTA, прогресс, dock и состояния — DOM.

## Реализовано

- `QButton`: primary/secondary/text/danger/icon, размеры 44/48/56/64,
  default/pressed/loading/disabled/success/error, стабильная ширина loading-label,
  видимый keyboard focus и reduced-motion режим.
- `BottomDock`: четыре утверждённых раздела `Для тебя` (дом), `Поиск` (лупа),
  `Карта` (карта), `Профиль` (человек); active item имеет `aria-current="page"`.
- `AppShell`: safe-area и резерв места под dock. Dock скрыт в первичной настройке,
  свайпах и на экране конкретного маршрута.
- `QOverlay`: sheet/dialog primitive с Escape, backdrop close, focus trap,
  возвратом фокуса и 44 px close control. К нему подключены выбор города и
  локальные настройки.
- Главная получила точный пользовательский вопрос, честные показатели без
  неподтверждённого числа мест, основные CTA и 44+ px targets.
- Свайпы сохранили существующий gesture/data-flow, но действия переведены на
  единый компонент; progress теперь имеет semantic progressbar.
- Результаты получили DOM-кнопки `Сохранить`/`Сохранено` и `В маршрут`.
- Dock связан с реальными состояниями приложения: персональная выдача, единый
  поиск/локальный помощник, карта и профиль.
- Настройки вынесены из dock в code-native кнопку-шестерёнку справа в header.
  Она открывает доступный `QOverlay` с языком, источниками и приватностью.
- `Планы` удалены из dock. Сохранённое и готовый маршрут доступны из профиля;
  экран конкретного маршрута по-прежнему открывается из контекста выдачи.
- Screen 14 перестроен из списка в персональную редакционную ленту по
  `design/QETTYQ_SCREEN_14_PRODUCTION_SPEC.md`: горизонтальный context rail,
  H1 `Для тебя`, один hero-кандидат и горизонтальная секция
  `Ещё по вашему настроению` из того же API response.
- Hero использует одобренную 3:4 category illustration с видимой маркировкой
  `Иллюстрация категории`; изображение не называется фотографией заведения.
  Название, факты, unknown, источник, причина и действия остаются DOM.
- Второй проход сверен с layer blueprint и asset manifest: hero-slot сохраняет
  crop из 3:4 master, карточка имеет 386 px reference-width, а `Bookmark`
  используется только для сохранения (`Heart` остаётся реакцией свайпа).
- `Подробнее` открывает отдельное detail-state; `Сохранить` имеет
  `aria-pressed` и polite live announcement. Необеспеченное действие `На карте`
  не показывается: текущая карта использует другой candidate set.
- Существующая логика API рекомендаций, local memory, карта и данные не заменялась.

## Визуальная проверка

- `docs/agent-reports/A22-home.png` — главная 430 px.
- `docs/agent-reports/A22-swipe.png` — 3:4 swipe card и code controls.
- `docs/agent-reports/A22-results-dock.png` — выдача, stateful actions и dock.
- `docs/agent-reports/A22-settings-430.png` — settings overlay на 430 × 932.
- `docs/agent-reports/A22-feed-screen14-full.png` — полный scroll-контур screen 14.

После изменения dock контрольные screenshots пересняты на reference viewport
430 × 932; full-page изображения сохраняют эту ширину.

Самопроверка выявила и исправила конфликт старого `.swipe-actions button` с
primary variant: CTA `Интересно` теперь имеет корректный нефритовый фон и белый текст.

## Выполненные проверки

```text
pnpm typecheck                              PASS
pnpm lint                                   PASS с 1 прежним warning в scripts/generate-ux-flow-board.mjs
pnpm test                                   PASS · 5 files / 18 tests
PORT=3030 pnpm test:e2e                     PASS · 5 tests
pnpm build                                  PASS · Next.js production build
```

E2E дополнен проверкой четырёх dock items, `aria-current` и перехода в единый
экран поиска/помощника.

## Не входит в этот slice

- Полный route-per-screen переход на адреса из overlay contract.
- Вынос `CandidateCard` в единый typed component для feed/map/chat.
- Реальная запись `savedIds` в session/local memory.
- Полные отдельные screen-flow для location picker, filters и delete confirmation.
- Полная RU/KK/EN локализация новых экранов dock.

Эти пункты не обозначаются как готовые.
