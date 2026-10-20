# A3 · backend и архитектура пилота · 20.10.2026

## Выполнено

Существующая основа сохранена: Next Route Handlers + domain functions + изолированная гостевая сессия. Новые функции работают с фактическим локальным POI-снимком, без внешних сетевых запросов и новых расходов. `PRD.md` прочитан полностью; установленное руководство Next Route Handlers прочитано до изменений.

- Публичный каталог без сырых provenance-полей в карточках. Обязательная OSM-атрибуция остаётся в metadata.
- Сохранение и чтение частичного контекста: стартовая точка nullable; никакой скрытой геопозиции Астаны вместо согласия пользователя.
- Чат с реальными карточками мест, предложенным контекстом и явными завершёнными этапами поиска. Это deterministic fallback, не генеративный RAG и не скрытые рассуждения модели.
- Сохранённые планы из 1–5 известных мест в заданном порядке, с оценкой времени, бюджета, unknown и изоляцией сессий. Повтор одинакового тела не создаёт дубликат.
- Удаление данных очищает также контекст и планы. Совместимость с существующими reaction/undo semantics сохранена.
- Исправлен recommend: обратная дорога не добавляется без выбора; Haversine не маркируется `feasible`; соблюдаются категории, строгий бюджет и цена для группы.

## Контракт для frontend

Сначала `POST /api/session` с `{}`. Браузер получает HttpOnly cookie; последующие same-origin fetch используют её автоматически. Native-клиент может использовать уже существующий `x-qettyq-session` из ответа. Cookie не передавать в публичные URL.

### Контекст

```ts
type Context = {
  cityId?: 'astana';
  goal?: 'food' | 'walk' | 'activity' | 'new'; // default activity
  minutes?: number; // integer 20..720, default 120
  budget?: number | null; // integer KZT 0..1_000_000, default null
  origin?: { lat: number; lon: number } | null; // default null
  destination?: { lat: number; lon: number } | null;
  returnToOrigin?: boolean; // default false
  likedTags?: string[]; // max 40
  partySize?: number; // 1..20, default 1
  budgetBasis?: 'person' | 'group'; // default person
  strictBudget?: boolean; // default false
}
```

Координаты ограничены покрытием пилота (lat 50.8..51.5, lon 70.8..72). Не подменять текущую локацию этими границами. Адресное геокодирование не добавлено. Точность пути не гарантируется.

| Метод и путь | Тело | Ответ |
|---|---|---|
| `GET /api/catalog?cityId=astana` | — | `items: PublicPlace[]`, snapshot metadata, attribution |
| `GET /api/session` | — | session dates, context, profile, active reactions, plans |
| `POST /api/context` | `Context` | проверенный сохранённый context |
| `POST /api/chat` | `{text:string,context?:Context,history?:{role:'user'\|'assistant',text:string}[]}` | reply, proposedContext, items, generationMode, steps, suggestions, warnings |
| `GET /api/plans` | — | `items: Plan[]`, ephemeral storage mode |
| `POST /api/plans` | `{placeIds:string[],context:Context}` | plan, replayed; 201 новый / 200 повтор |
| `DELETE /api/session/data` | `{}` | удаление reactions/profile/context/plans только текущей сессии |
| `GET /api/health` | — | локальная техническая доступность без secrets/config; внешние провайдеры не проверяются |

`PublicPlace`: id, name, category, lat, lon, address|null, tags, price|null, durationMinutes, durationState='estimated'. `sourceUrl`, sourceName, retrievedAt не входят в этот DTO. Атрибуция не должна исчезать из карты/лицензионного блока. Старый `/api/recommendations` сохраняет внутренний совместимый DTO с provenance — новый UI не должен его визуально дублировать. Полноценная защищённая админка пока не создана.

Карточки чата дополнены `distanceKm`, `travelMinutes`, `totalMinutes`, `feasibility`, `routeQuality`, `reason`, `unknowns`. При отсутствии origin все три числовые оценки пути **null**, не 0. Чат не сохраняет предложенные изменения автоматически: показать подтверждение, затем вызвать `/api/context`. Диалог передаётся с лимитом 20 сообщений, но его текст сервер не хранит и не использует как доказательство фактов о местах. Срок памяти/согласие на устройстве контролирует frontend.

`Plan`: id, createdAt, expiresAt, placeIds, stops, legs, routeQuality, travelMinutes|null, visitMinutes, bufferMinutes, totalMinutes|null, remainingMinutes|null, distanceKm|null, budget:{min|null,max|null,currency:'KZT',basis,partySize}, feasibility, warnings. `legs` имеют оценку прямого расстояния и **не имеют дорожной геометрии**. Не рисовать эти точки как подтверждённую дорогу. Для маршрута без origin полная длительность неизвестна. Известное превышение лимита даёт infeasible; отсутствие данных — uncertain. Сохранение не бронирует посещение.

Мутации блокируют cross-site Origin, валидируют JSON/размер. Chat ограничен 30 запросами/минуту/сессию; plans — 30/сессию. Событийные ID пока не допустимы для plans: требуются отдельные расписания и единый контракт ingestion.

## Проверки

PATH перед командами указывает bundled Node и fallback pnpm (без изменения глобальной конфигурации).

- `node_modules/.bin/vitest run tests/unit/backend-pilot.test.ts tests/unit/recommend.test.ts tests/integration/session-api.test.ts` — **exit 0, 23 теста**, после исправления предположения теста о наличии museum (такой категории в текущем снимке нет).
- `node_modules/.bin/tsc --noEmit` — первый запуск **exit 0**; повтор после параллельного переключения root `page.tsx` на ещё создаваемый `PilotApp` — **exit 2**, единственная ошибка `src/app/page.tsx:1 TS2307 Cannot find module '@/components/PilotApp'`. Передано владельцу frontend; полный typecheck повторить после интеграции.
- `node_modules/.bin/eslint src/server/pilot src/server/session/store.ts src/app/api/catalog src/app/api/context src/app/api/chat src/app/api/health src/app/api/plans src/app/api/session/route.ts src/app/api/recommendations src/domain/recommend.ts tests/unit/backend-pilot.test.ts` — финальный **exit 0**.
- Первая попытка без bundled PATH завершилась exit 127 (`node` не найден); конфигурацию системы не меняли.

Проверены: отсутствие подставной геолокации/ETA; null/0; внешняя мутация; schema validation; отсутствие вымышленных киносеансов; group pricing; отсутствие молчаливого return leg; прямой путь uncertain; изоляция планов; повтор сохранения; удаление; fabricated IDs; сохранность старых reaction/undo тестов.

## Ограничения и следующий шаг

Хранение **только в памяти процесса** с TTL гостевой сессии 24 часа. Перезапуск/несколько инстансов теряют/разделяют состояние; это не persistent SQL backend. Полноценные DB migrations, админская авторизация и организаторская публикация не заявляются готовыми.

Данные — snapshot 19.10.2026; фильмы/концертные сеансы в этом каталоге не подтверждены. Фотографии и источники ingestion принадлежат отдельной роли. Нет live routing, дорожной геометрии, такси-тарифа, live LLM и общей ссылки маршрута для друзей. Зафиксированные шаги чата не имитируют внутренний chain of thought.

Следующий проверяемый шаг root: подключить frontend к этим API, пройти путь session → контекст с ручной точкой → chat/cards → savePlan → delete, затем E2E и общий build. Никаких push/deploy или платных API-вызовов этим агентом не выполнялось.
