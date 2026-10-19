# A14 · Мультиязычность и curated collections в QETTYQ

**Дата:** 19 октября 2026 года  
**Область:** продуктовая модель `ru` / `kk` / `en`, локализованные факты, языки событий, chat locale, API/storage/ranking и редакционные подборки.  
**Статус:** целевой контракт для согласования; `src` не изменялся.

## 1. Главное решение

QETTYQ должен различать четыре независимых понятия:

1. **UI locale** — язык кнопок, ошибок, единиц и объяснений: `ru`, `kk`, `en`.
2. **Язык конкретного текстового поля** — на каком языке сохранены `name`, `title`, `description`, editorial note.
3. **Content/performance language** — на каком языке идёт фильм, спектакль, экскурсия или занятие.
4. **Chat input/output locale** — на каком языке пользователь написал сообщение и на каком языке ассистент отвечает.

Они не выводятся друг из друга. Русский UI не означает русскоязычный спектакль. Английское название фильма не доказывает английскую звуковую дорожку. Казахская страница источника не доказывает, что событие проходит на казахском.

```text
UI locale: ru
Event title shown: «Қыз Жібек» (canonical title, kk)
Performance language: kk
Subtitles: ru, en
Explanation language: ru
```

Все языковые свойства должны быть либо `observed` из указанного источника, либо `editorial_reviewed`, либо `unknown`. Fallback меняет отображение текста, но никогда не меняет язык события как факт.

## 2. Фактическое состояние проекта

- PRD задаёт русский как основной UI, `locale: 'ru' | 'kk'` в conceptual context и полную KZ-локализацию после P0. Английский сейчас не описан в общем контракте.
- `<html lang="ru">`, metadata, UI-строки, deterministic explanation и system prompt жёстко русские.
- `Place.name`, `address` и event `title`, `venue`, `dateLabel`, `priceLabel`, `category` — одиночные строки без locale/provenance на уровне поля.
- `src/data/events.ts` — curated pilot snapshot, не нормализованная модель occurrences; content/performance language отсутствует.
- OSM snapshot хранит только выбранное `name`; исходные `name:ru`, `name:kk`, `name:en`, если они были у объекта, в текущую модель не попадают.
- Нет locale selector, locale cookie, `Accept-Language` negotiation, localized cache keys и multilingual search index.
- `CityMap` вставляет title/date в Leaflet tooltip как готовую строку; локаль должна быть разрешена до передачи данных компоненту.

Следствие: добавлять декоративный переключатель KZ/EN сейчас нельзя. Сначала нужна модель полей, fallback metadata и проверенные словари UI.

## 3. Языковые идентификаторы

Во внутреннем приложении:

```typescript
type UiLocale = 'ru' | 'kk' | 'en';
type ContentLanguage = 'ru' | 'kk' | 'en' | 'none' | 'mul' | 'und';
```

- `none` — содержание без речи: инструментальный концерт, немой формат; только при подтверждении.
- `mul` — действительно многоязычное содержание, а не «язык не указан».
- `und` — язык неизвестен.

Во внешних данных принимаются валидные BCP 47 tags (`kk-Cyrl-KZ`, `en-US`), но для P0 они нормализуются к поддерживаемому base language. Исходный tag сохраняется в provenance. Нельзя без проверки превращать `qaz`, `kaz`, `kz` и произвольные строки в `kk`; адаптер источника использует явный mapping.

HTML использует полноценные теги `ru-KZ`, `kk-KZ`, `en`, а API — короткий `UiLocale`, пока региональные различия не влияют на текст.

## 4. Выбор UI locale

### Порядок разрешения

1. Явный выбор пользователя в настройках.
2. Session preference `uiLocale` / cookie `qettyq_locale`.
3. Первый поддерживаемый язык из `Accept-Language`.
4. Default `ru`.

Смена locale:

- не создаёт новую guest session;
- не сбрасывает reactions/context/plan;
- не меняет `preferredContentLanguages`;
- обновляет `<html lang>`, metadata, формат дат/чисел и следующие ответы ассистента;
- инвалидирует только presentation/cache layer по locale.

Locale — не чувствительное поле. Его можно хранить 30 дней в отдельной essential preference cookie. Точные координаты и интересы туда не попадают.

### URL-стратегия

- Приложение (`/`, `/discover`, `/plan`) может использовать session/cookie locale, не добавляя координаты или context в URL.
- Индексируемые публичные страницы (`/about`, `/privacy`, `/sources`) желательно иметь как `/ru/...`, `/kk/...`, `/en/...` с canonical/hreflang.
- Не смешивать две стратегии внутри одного route без redirect policy: explicit prefix имеет приоритет над cookie.

## 5. UI-строки

UI dictionary хранит только product copy, не POI/event facts:

```text
i18n/
  ru.json
  kk.json
  en.json
```

Ключи семантические: `recommendation.feasibility.uncertain`, а не полный русский текст. Параметры типизированы (`{minutes}`, `{amount}`, `{count}`). Не собирать предложение конкатенацией, потому что порядок слов и plural forms различаются.

### UI fallback

| Requested | Production fallback |
|---|---|
| `ru` | `ru` → controlled neutral English only for fatal developer error |
| `kk` | `kk` → `ru` |
| `en` | `en` → `ru` |

Каждый fallback пишется в технический `missingTranslation` trace без user/session data. В dev отображается key и тест падает для обязательных экранов; production не показывает ключи пользователю.

Релиз locale считается полным только если переведены: onboarding, 15 карточек, loading/error/empty/unknown, map controls, source/freshness, privacy/delete, chat clarification и plan. Переведённый landing при русском error state — не готовая локализация.

### Форматирование

- Деньги форматируются через locale formatter, валюта остаётся KZT; числовое значение не хранится строкой `«от 2 000 ₸»`.
- Время occurrence хранится ISO + timezone и форматируется locale-aware; `dateLabel` не является source of truth.
- Имена категорий переводятся по controlled taxonomy, но источник/название сущности не перезаписывается.
- Шрифт обязан покрывать `Ә Ғ Қ Ң Ө Ұ Ү Һ І ә ғ қ ң ө ұ ү һ і`; fallback font проверяется скриншотами.

## 6. Модель локализованных POI-полей

### 6.1. Сущность и переводы разделены

```text
places
  id, city_id, lat, lon, category, status

place_texts
  place_id
  field: name | short_description | address_label
  locale: ru | kk | en | other BCP47
  value
  text_kind: source_observed | provider_translation |
             editorial_translation | machine_translation
  review_status: observed | reviewed | unreviewed | rejected
  source_id, source_url, retrieved_at, valid_until
  source_revision_hash
```

Не хранить все языки непрозрачным JSON blob: нужны индексирование, уникальность `(place, field, locale, source)` и field-level provenance.

### 6.2. OSM ingestion

- `name:ru`, `name:kk`, `name:en` импортируются как отдельные observed fields.
- `name` сохраняется как canonical source label с `locale=und`, если язык надёжно не задан.
- `official_name:*`, `alt_name:*`, `short_name:*` не смешиваются с display name; они могут идти в multilingual search aliases с provenance.
- Отсутствующий `name:kk` нельзя заполнить транслитерацией и назвать OSM-фактом.
- Адресные части сохраняются структурированно; форматированный address label строится на чтении. Нельзя переводить собственное название улицы как обычный текст без источника.

### 6.3. POI display fallback

Для каждого поля сервер возвращает не строку, а resolved value:

```json
{
  "value": "Ұлттық музей",
  "requestedLocale": "kk",
  "resolvedLocale": "kk",
  "fallbackUsed": false,
  "textKind": "source_observed",
  "reviewStatus": "observed"
}
```

Цепочка имени:

1. observed/provider text exact locale;
2. reviewed editorial translation exact locale;
3. canonical source name, даже если он на другом языке;
4. reviewed text на `ru`, затем `en`;
5. «Название не указано» — только если canonical name отсутствует, что обычно делает POI непригодным для публичной выдачи.

Цепочка description:

1. exact locale observed;
2. exact locale editorial reviewed;
3. source original с видимым badge языка/fallback;
4. отсутствует — UI пишет «Описание не предоставлено».

Machine translation не включается в fallback молча. Если она разрешена, хранится отдельной записью `machine_translation`, показывает метку «автоперевод» и никогда не повышает factual confidence.

## 7. События: title/description и язык представления

### 7.1. Текст события

```text
events
  id, organizer_id, canonical_source_id

event_texts
  event_id, field: title|description, locale, value,
  text_kind, review_status, provenance

event_occurrences
  id, event_id, venue_id, start_at, end_at, timezone, status
```

Название/description принадлежат событию, но источник может публиковать разные версии. Конкретный occurrence наследует тексты события и может иметь override только при source evidence (например, специальная англоязычная версия спектакля).

### 7.2. Content/performance language — occurrence-level fact

```text
occurrence_languages
  occurrence_id
  role: spoken | audio | subtitles | interpretation | instruction | no_speech
  language: ru | kk | en | other BCP47 | und
  status: observed | unknown | conflicting
  source_id, source_url, retrieved_at
```

Примеры:

- фильм EN audio + RU subtitles;
- спектакль KK spoken + RU/EN surtitles;
- экскурсия RU instruction;
- инструментальный концерт `no_speech`, но intro language может быть unknown;
- одно и то же произведение 18:00 KK, 20:00 RU — два occurrence с разными language facts.

Нельзя выводить язык из title, имени театра, выбранной страницы сайта или страны производства. Если официальный источник пишет «на казахском языке», это field-level observed fact с URL и timestamp.

### 7.3. UI presentation

Карточка показывает компактно:

```text
Язык: қазақша · субтитры: русский, English
```

Если неизвестно: `Язык показа не указан`. Нельзя скрывать unknown и допускать пользователя по умолчанию.

Title может оставаться canonical (`Қыз Жібек`) при любом UI locale; translated title показывается вторичной строкой только если он получен из допустимого источника или reviewed translation.

## 8. Языковые фильтры пользователя

UI locale и content filters независимы:

```typescript
type LanguagePreferences = {
  acceptableSpoken: Array<'ru' | 'kk' | 'en'>;
  acceptableSubtitles: Array<'ru' | 'kk' | 'en'>;
  mode: 'any' | 'prefer' | 'strict';
  allowUnknown: boolean;
};
```

### Семантика

- `any`: язык не участвует в фильтрации; unknown видим.
- `prefer`: совпадение получает небольшой ranking boost; mismatched/unknown остаётся с предупреждением.
- `strict`: occurrence допускается, если spoken/audio совпадает **или** доступен приемлемый subtitles/interpretation path по явно выбранному правилу; unknown исключается.
- `allowUnknown=true` в strict переводит unknown в отдельный uncertain bucket, а не feasible.

Default — `any`. Нельзя автоматически ставить strict RU только потому, что UI русский. Фильтр показывается только для событий/занятий, где язык существенен; у парка он не нужен.

Для child-friendly и accessibility language не объединяется с safety: наличие русских субтитров не подтверждает age suitability или доступность зала.

## 9. Chat input/output locale

### 9.1. Input

Каждое сообщение имеет:

```json
{
  "text": "Бүгін ағылшын тіліндегі кино керек",
  "declaredLocale": null,
  "detectedLocale": "kk",
  "detectionConfidence": 0.94,
  "uiLocale": "ru"
}
```

Detection помогает выбрать parser/prompt, но не меняет UI locale автоматически. Mixed RU/KK/EN разрешён. При низкой confidence сервер возвращает `detectedLocale=und` и уточняет смысл, а не угадывает.

Multilingual synonyms нормализуются к одинаковым canonical tags и constraints:

```text
«выставка» / «көрме» / “exhibition” → tag:exhibition
«на английском» / «ағылшын тілінде» → acceptableSpoken:[en]
```

Исходный текст не используется как ranking token после нормализации и не сохраняется дольше необходимого.

### 9.2. Output

Default response locale = explicit `conversationLocale` или UI locale. Если пользователь пишет на другом поддерживаемом языке, UI предлагает «Отвечать на қазақша?»; одно сообщение не переключает locale без подтверждения.

LLM provider получает:

- `outputLocale`;
- canonical constraints/tags;
- localized evidence exact locale либо source-original с locale metadata;
- запрет переводить/создавать имена, цены, расписания и language facts.

System instructions существуют отдельно для `ru`, `kk`, `en` и проверяются golden set. Нельзя попросить модель «сама перевести всё» и считать это полной локализацией.

Deterministic fallback обязан быть полноценным во всех выпущенных UI locales. Если KZ fallback не готов, KZ не объявляется поддержанным production locale.

### 9.3. Chat contract

```json
{
  "messageId": "uuid",
  "uiLocale": "ru",
  "inputLocale": "kk",
  "outputLocale": "ru",
  "text": "Бүгін ағылшын тіліндегі кино керек",
  "contextRevision": 4
}
```

Ответ:

```json
{
  "detectedInputLocale": "kk",
  "outputLocale": "ru",
  "contextPatch": {
    "goal": "activity",
    "preferredTags": ["cinema"],
    "languagePreferences": {
      "acceptableSpoken": ["en"],
      "mode": "strict",
      "allowUnknown": false
    }
  },
  "needsConfirmation": ["languagePreferences.mode"],
  "clarification": "Нужна английская озвучка или подойдут английские субтитры?"
}
```

## 10. API contracts

### Locale negotiation

- Request: `Accept-Language`, optional explicit `uiLocale`; explicit authenticated/session preference wins.
- Response: `Content-Language`, `Vary: Accept-Language` для public localized responses.
- Персональные endpoints всё равно `private/no-store`; shared caches не используют session cookie как общий ключ.
- API не принимает произвольную locale строку: только allowlist `ru|kk|en`.

### Context

```json
{
  "uiLocale": "kk",
  "languagePreferences": {
    "acceptableSpoken": ["kk", "ru"],
    "acceptableSubtitles": ["kk", "ru"],
    "mode": "prefer",
    "allowUnknown": true
  }
}
```

### Localized candidate

```json
{
  "candidateId": "event-occurrence:123",
  "kind": "event_occurrence",
  "display": {
    "title": {
      "value": "Қыз Жібек",
      "requestedLocale": "ru",
      "resolvedLocale": "kk",
      "fallbackUsed": true,
      "textKind": "source_observed"
    },
    "description": null
  },
  "performanceLanguages": [
    { "role": "spoken", "language": "kk", "status": "observed" },
    { "role": "subtitles", "language": "ru", "status": "observed" },
    { "role": "subtitles", "language": "en", "status": "observed" }
  ],
  "languageFit": "compatible_with_subtitles",
  "unknowns": []
}
```

### Details and translations

Обычный list endpoint возвращает только resolved fields. Details может принять `includeTranslations=true` и вернуть допустимые варианты с provenance. Нельзя возвращать внутренние unreviewed machine translations публично.

API error codes локализуются на клиенте по code; серверный `message` — дополнительный и не источник UI copy. Logs хранят code, не локализованный текст.

## 11. Storage, search и cache impacts

### Storage

- Stable facts (`lat`, `startAt`, `price`) не дублируются по locale.
- Texts нормализуются в translation tables с revision/provenance.
- Occurrence languages отдельны от event texts.
- Search aliases отделены от display fields.
- Translation update не создаёт новый Place/Event и не меняет source fact revision.
- Delete guest data удаляет locale preference вместе с session scope, но public translations/collections не затрагиваются.

### Search

Индекс содержит токены каждого разрешённого текста с locale analyzer. Результаты дедуплицируются по entity ID до ranking: три перевода названия не дают три кандидата.

Query pipeline:

1. detect/declared query locale;
2. locale-specific normalization;
3. canonical tags/categories;
4. multilingual lexical matches;
5. one entity result with `matchedLocale` metadata.

Transliteration может быть дополнительным alias для поиска, но не display name и не source fact.

### Cache

Cache key минимум включает:

```text
datasetRevision + uiLocale + languagePreferences + contextHash + algorithmVersion
```

LLM explanation cache также включает output locale и evidence revision. Нельзя отдать английское explanation из соседней session только потому, что candidate IDs совпали.

## 12. Ranking impacts

Hard feasibility и safety выполняются до language scoring.

### Content language fit

| Preference mode | Match | Mismatch | Unknown |
|---|---|---|---|
| `any` | neutral | neutral | neutral + visible unknown |
| `prefer` | small boost | neutral/slight penalty | uncertainty penalty |
| `strict` | eligible | excluded | excluded or separate uncertain when `allowUnknown` |

Language match не должен занимать большой вес общей формулы. Рекомендуется часть `contextFit`, максимум 0.05 итогового score. Он не обходит time, budget, route, status или safety.

### Translation quality

Наличие перевода не делает место объективно лучше. `dataQuality` может учитывать понятность карточки для пользователя, но отсутствие `kk`/`en` перевода не должно полностью скрывать реальный допустимый POI. Fallback metadata и source-original позволяют показать его честно.

UI locale сам по себе не ranking preference. Content language filter — только явное действие/подтверждённый chat constraint.

## 13. Curated collections

### 13.1. Что такое collection

Collection — упорядоченный набор ссылок на существующие entities, объединённый редакционной темой или provider membership:

- «90 минут рядом с Байтереком» — QETTYQ editorial;
- «Выходные в Национальном музее» — provider-linked, если источник публикует такой набор;
- «События на казахском языке» — dynamic collection только при observed occurrence language.

Collection не является отдельной копией places/events и не может создавать price, hours, rating, start time или доступность.

### 13.2. Модель

```text
collections
  id, owner_type: qettyq_editorial|provider_linked
  provider_id|null, provider_collection_id|null
  status: draft|published|stale|archived
  city_id, starts_at|null, ends_at|null
  disclosure: editorial|provider|sponsored
  source_id|null, source_url|null, retrieved_at|null
  review_at, algorithm_version

collection_texts
  collection_id, field: title|description|editorial_note
  locale, value, text_kind, review_status, provenance

collection_items
  collection_id
  entity_kind: place|event|occurrence|idea
  entity_id
  position
  item_note_key|null
  membership_state: observed|editorial|derived
  source_id|null, source_url|null, retrieved_at|null
  valid_from|null, valid_until|null
```

Unique `(collection_id, entity_kind, entity_id)` предотвращает дубли. Provider-linked membership хранит источник и дату; editorial membership хранит редактора/версию, но не маскируется под provider recommendation.

### 13.3. Hydration без дублирования фактов

При чтении collection:

```text
membership IDs
  → hydrate current entity/occurrence
  → re-run status/freshness/safety
  → apply user time/budget/route filters
  → localize fields
  → render collection order among remaining items
```

Collection item не хранит копии `title`, `price`, `startAt`, `image`, `openingHours`. Если нужен immutable submission/demo snapshot, он хранится как отдельный audited export, не production source of truth.

Editorial note разрешает только субъективную рамку: «короткая прогулка у воды». Утверждение «всегда тихо» требует fact/evidence и не должно жить как бездоказательный note.

### 13.4. Provider-linked collections

- Только documented feed/API или ручная редакционная фиксация по разрешённой странице.
- Link to source обязательно.
- Наличие в provider collection не означает партнёрство QETTYQ.
- Provider position можно сохранить как observed order, но QETTYQ всё равно применяет hard constraints.
- Provider texts/media не копируются без соответствующих allowed uses.
- При исчезновении item membership помечается stale/removed; событие не переносится на новую дату.

### 13.5. Локализация collection

Collection title/description переводятся как editorial content с review status. Entity titles внутри всегда разрешаются через entity fallback chain. Перевод collection description не позволяет переводить/искажать факты item.

Если collection называется «English-friendly cinema», membership строится по observed audio/subtitle language; title locale коллекции не является evidence.

### 13.6. Collections и ranking

- Внутри explicit collection curated order — начальный soft prior.
- После ввода user context hard constraints применяются заново.
- Для general recommendations принадлежность редакционной подборке даёт максимум небольшой transparent boost и не заменяет relevance.
- Sponsored collection/item всегда помечается и не обходит filters.
- Один candidate, попавший в три collections, учитывается один раз; boost не суммируется бесконечно.
- Collection diversity проверяется после удаления infeasible/stale items.

### 13.7. API

```text
GET /api/collections?city=astana&locale=kk
GET /api/collections/:id?locale=kk&contextRevision=4
```

List response: localized collection title, owner/disclosure, item count after status filtering, source/freshness. Detail response: hydrated localized candidates, per-item feasibility, membership provenance и omitted summary (`3 события закончились`, `2 не подходят по времени`).

Admin authoring — не публичный P0 endpoint. Curated files/import выполняются через protected workflow с validation, duplicate check и source registry.

## 14. Unknown/conflict states

| Ситуация | Правильное поведение |
|---|---|
| Нет POI name в requested locale | Canonical source name + metadata `fallbackUsed=true` |
| Нет description | «Описание не предоставлено», не LLM-generated fact |
| Event title переведён, язык показа unknown | Показать перевод title и отдельно «Язык показа не указан» |
| Источники спорят о языке | `conflicting`, links to both, strict filter excludes |
| UI dictionary key missing | Logged defect + RU fallback; locale release gate fails |
| Chat message mixed-language | Parse known segments, confirm ambiguous constraint |
| Collection item expired | Hide from active collection; count in omitted summary |
| Collection fact changed | Hydrate current fact; do not show stale copied label |
| Machine translation available only | Label auto-translation or fall back to source original |

## 15. P0 / P1

### P0 для безопасного запуска locale layer

1. Ввести `UiLocale`, negotiation/cookie и typed UI dictionaries.
2. Полностью покрыть RU и подготовить schema/tests для KK/EN без публичного toggle.
3. Нормализовать place/event texts и вернуть localized value metadata.
4. Хранить occurrence language отдельно от title locale.
5. Добавить explicit language preferences в context; default `any`.
6. Сделать deterministic explanations и error/unknown states на каждом опубликованном locale.
7. Multilingual search dedupe by entity ID.
8. Golden tests: RU/KK/EN query → одинаковые canonical constraints; title fallback не меняет language fact.
9. Реализовать одну editorial collection поверх entity references без копирования facts.
10. Не включать KZ/EN selector до content QA и visual test казахских глифов.

### P1

- Human-reviewed KK and EN UI release.
- Source-observed multilingual POI names and descriptions.
- Chat language detection and opt-in conversation locale switching.
- Event spoken/audio/subtitle filters.
- Provider-linked collections после проверки условий источника.
- Translation review dashboard, stale source revision queue и glossary.
- Public locale-prefixed about/privacy/sources with hreflang.
- Machine translation только с явной маркировкой, budget/retention policy и review queue.

## 16. Acceptance tests

- `kk` UI показывает все казахские глифы без fallback tofu/обрезки на 360×800.
- Смена RU→KK на results не меняет candidate IDs, feasibility, price или route.
- EN title + unknown audio не проходит strict English-audio filter.
- KK spoken + RU subtitles проходит правило `compatible_with_subtitles`, если пользователь это разрешил.
- Один POI с тремя name translations появляется один раз в search/ranking.
- `Accept-Language: kk` не меняет content language preferences.
- Missing KK description показывает source-original с языковой меткой, не выдуманный перевод.
- Chat RU/KK/EN фразы нормализуют одинаковый canonical goal/tag.
- LLM output на KK не добавляет новые title/address/language facts.
- Collection item использует обновлённую цену/дату entity, а не stale copy.
- Expired occurrence исчезает из collection без удаления history.
- Sponsored/provider-linked/editorial disclosure видимы и локализованы.
- Locale cache не отдаёт RU explanation на KK request.
- Delete session удаляет locale/chat preferences session scope, но не public translations.

## 17. Решения для A0

1. Internal locale allowlist: `ru|kk|en`; BCP47 сохраняется у external text/language facts.
2. UI locale, text locale, performance language и chat locale — разные поля.
3. Canonical facts не дублируются по locale.
4. Machine translation не считается observed fact и не скрывается без метки.
5. Strict language filter требует observed compatible language; unknown не feasible.
6. Collections хранят memberships/notes, но hydrate current facts по entity ID.
7. Collection boost soft и transparent; hard constraints неизменны.
8. Сначала RU-complete infrastructure, затем проверенный KK, затем EN; декоративный toggle запрещён.

## 18. Следующий проверяемый шаг

A0 должен согласовать общие типы `UiLocale`, `LocalizedText`, `OccurrenceLanguage` и `LanguagePreferences`, после чего владелец data schema проектирует translation tables, а frontend — typed dictionary coverage. До этого текущие `name/title/dateLabel/priceLabel` нельзя массово механически превращать в объекты: это затронет ingestion, API, map, tests и presentation одновременно.
