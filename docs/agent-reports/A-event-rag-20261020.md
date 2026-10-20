# A1 · Актуальная афиша и серверный evidence

Дата: 20 октября 2026. Изменены только ingestion, согласованный `src/server/pilot/chat.ts`, собственные unit tests и документация. API/Smart Assistant/PilotApp/deploy — зона оркестратора и профильных агентов.

## Реальная причина дальних «ближайших» дат

Старый bounded adapter читал первые восемь карточек со временем в DOM. Верх [Sxodim Астана](https://sxodim.com/astana) включает продвигаемые записи; порядок не хронологический. Поэтому импорт мог пропустить сегодняшние/завтрашние события ниже и предложить более дальний промо-концерт. Это ошибка приоритета discovery, не повод переносить даты.

Исправление: ближайшие наблюдаемые date/time labels index используются только для приоритета восьми ограниченных detail fetch. Факт начала по-прежнему должен быть настоящим ISO из соответствующего Event JSON-LD; неоднозначная/прошедшая дата, отмена или неверный город не превращаются в живое событие. Cache API key v2 не переиспользует старый promo-order cache. Граница max8 и остальные права/HTTP guards не расширялись.

## HTTP evidence

Проверены действующие [условия Sxodim](https://sxodim.com/polzovatelskoe-soglashenie), публичный index и страницы событий. Одна фактическая проверка полного ограниченного адаптера завершилась:

```json
{
  "fetchedAt": "2026-10-20T16:15:55.319Z",
  "expiresAt": "2026-10-20T17:15:55.319Z",
  "indexCandidates": 22,
  "detailPagesRequested": 8,
  "importedOccurrences": 8,
  "rejected": 0,
  "mediaCopied": false
}
```

Ближайшая проверенная дата: 21 октября, 16:00 Астана, [страница события](https://sxodim.com/astana/event/lekciya-i-master-klass-udivitelnyy-mir-mongol-zurag). Source index изменился с предыдущего исследования; старые семь записей не объявлялись неизменной «живой» базой. Этот run не сохранялся поверх bundled snapshot и не подменяет публичный deploy smoke.

В восьми прочитанных JSON-LD не было `organizer.url`: все organizerUrl null. Сайт агрегатора не переименован в официальный сайт организатора. Новый optional organizerUrl извлекается только из явно предоставленного `Event.organizer.url`; неизвестный домен сервер автоматически не скачивает. На страницах [квиза](https://sxodim.com/astana/event/kviz-pliz-novichki-804) и [лекции](https://sxodim.com/astana/event/lekciya-darhana-zhagiparova-v-nergy-creative-hub-cherez-toi-k-apple) отдельно проверены реальные структурированные даты; расписание не выводилось из картинки или текста старой статьи.

## Интеграционный контракт

Новый server-only `retrieveEventEvidence(data,text,context,now)` возвращает:

- `items`: максимум три исходные LiveAstanaEvent, не изменённые генератором;
- `evidence`: EventEvidence[] с per-card sourceUrl/organizerUrl/fetchedAt/dataMode/freshness/typed price/unknowns;
- `excluded`: внутренний reason trace;
- `constraints`: эффективный календарный window, время/бюджет и явный `routeChecked:false`.

`answerPilotChatWithEvents()` добавляет `eventEvidence` и компактный `eventRetrieval`; старый filterChatEvents делегирует той же функции с прежней сигнатурой. Профиль/условия предлагаются к подтверждению, не сохраняются самовольно. Generic «хочу в театр» сохраняет прежний POI-сценарий; конкретные спектакли/афиша/дата включают event retrieval. Киносеансы не выдумываются при отсутствии отдельного источника.

Проверены lexical title/category matching, рок против классики, explicit category negation, OR категорий, локальное сегодня/завтра/выходные/неделя/даты, invalid date, непосредственное окно времени и известное окончание, нулевая/неизвестная/from цена, общий бюджет, stale/unavailable metadata. Указание «до N ₸» теперь предлагает strictBudget, а не молчаливое включение unknown-price.

Это bounded lexical retrieval, не универсальный natural-language planner: сложные временные обороты/сложные отрицания требуют будущей нормализации намерения и подтверждения пользователем. Отсутствие даты означает upcoming, не today. Нет расчёта ETA; неизвестный end/route остаётся uncertain, не «успеете».

## Проверки

Команды выполняются с Node runtime из `/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` в PATH:

```sh
node_modules/.bin/vitest run tests/unit/live-events.test.ts tests/unit/event-evidence.test.ts tests/unit/backend-pilot.test.ts tests/unit/ingestion-pilot.test.ts
node_modules/.bin/tsc --noEmit --pretty false
node_modules/.bin/eslint src/server/ingestion/sxodim-live.ts src/server/ingestion/live-events.ts src/server/ingestion/event-evidence.ts src/server/pilot/chat.ts tests/unit/live-events.test.ts tests/unit/event-evidence.test.ts
```

Финальный прогон `21:18 Asia/Aqtobe`: **99/99 targeted tests PASS**, TypeScript PASS, targeted ESLint PASS. Все unit records explicitly synthetic; HTTP refresh выше — отдельная реальная проверка. Ранее во время разработки обнаружены и исправлены кириллическая граница русской даты и словоформа «неделе»; упавшие проверки не скрывались и не ослаблялись.

Дополнительно `node_modules/.bin/vitest run tests/unit` в `21:18:53`: **20 files / 216 tests PASS**. Это фактический общий unit-прогон текущего рабочего дерева, не live AI/UI/deploy проверка.

Не запускались UI, платные API или deploy. Оркестратору требуется передать result.eventEvidence в AI adapter, сохранить trusted citations от сервера и синхронизировать ingestion/pilot-chat в Site.
