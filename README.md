# QETTYQ

QETTYQ — mobile-first сервис выбора досуга в Астане. Пользователь задаёт цель, время и бюджет, отмечает интересы карточками и получает до трёх вариантов из реального снимка OpenStreetMap с источниками и видимыми ограничениями.

**Живой интерактивный прототип:** <https://qettyq-app.ablecorgi64.chatgpt.site/>

## Что уже работает

- onboarding для цели, времени и бюджета;
- discovery-карточки с реакциями `Интересно` / `Не сейчас`;
- серверный детерминированный поиск и ранжирование;
- проверка временного окна и unknown-цены;
- 80 реальных POI Астаны из ограниченного импорта Overpass;
- provenance для каждой записи и ссылка на исходный объект OSM;
- гостевые сессии, идемпотентные реакции/undo и локальное удаление данных;
- честные режимы `snapshot`, `deterministic`, `estimated route`;
- адаптивный интерфейс и reduced-motion режим.
- отдельный showcase с 8 связанными экранами, Google Maps, 15 предпочтениями, планом, локальным помощником и управляемой browser-памятью в [`sites/qettyq-app`](sites/qettyq-app).

GPT-5.5 provider, точный пеший маршрутизатор и live-источник событий пока не подключены. Демо-события помечены как непроверенные; помощник честно работает в локальном deterministic fallback режиме. Архитектурный путь к Responses API подготовлен отдельно от клиентских секретов.

## Локальный запуск

Требуются Node.js 20.9+ и pnpm.

```bash
pnpm install
pnpm data:validate
pnpm dev
```

Откройте `http://localhost:3000`.

Проверки:

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm submission:check
```

Повторный импорт POI делает один ограниченный запрос к публичному Overpass API и перезаписывает локальный snapshot:

```bash
pnpm data:import:poi
```

Не запускайте импорт на каждый пользовательский запрос. Для production нужен подходящий extract, self-hosted Overpass или коммерческий провайдер. Данные © OpenStreetMap contributors, ODbL 1.0.

## Конфигурация

Скопируйте `.env.example` в `.env.local` только при необходимости. Секреты не хранятся в репозитории; текущий вертикальный сценарий работает без ключей и платных API.

Подробный фактический статус: [`docs/STATUS.md`](docs/STATUS.md). Исходный PRD: [`PRD.md`](PRD.md).

## Команда и материалы

**QETTYQ APP** · Tim Asproyanidi · Qaragandy · Boostseller.kz · +7 777 836 8576
Публичный репозиторий: <https://github.com/timyname/QETTYQ>
Презентация и архив для подачи находятся в [`exports/`](exports/).
