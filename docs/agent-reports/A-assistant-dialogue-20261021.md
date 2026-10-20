# A1 · Диалог помощника по досугу

21 октября 2026. Пилот Астаны. Статус: backend dialogue helper реализован и проверен офлайн; API/UI/deploy координирует root. **Это ограниченный сценарный помощник с существующим GPT-5.5-слоем, не заявление о полном функциональном равенстве ChatGPT.**

## Разрешения и источники решения

Прочитаны навыки `openai-platform-api-key` и `openai-docs`. Credential gate сначала остановил API-backed изменения: в процессе не было ключа, `.env`/значение ключа не читались. После прямого подтверждения владельца «используем существующий ключ OpenAI, бюджеты не увеличиваем» root разрешил продолжить. Новые ключи, SDK, модели, платные тестовые запросы и бюджет не добавлялись.

Прочитана актуальная официальная документация [conversation state](https://developers.openai.com/api/docs/guides/conversation-state) и [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Историю можно передавать явно; соблюдение JSON Schema само по себе не доказывает истинность фактов. Сохранены существующие Responses/GPT-5.5/provider accounting и server-side evidence guards, без миграции на Agents SDK и без новых hosted tools. Тексты пользовательских сообщений/источников остаются недоверенными данными.

## Что было до изменения

- `answerPilotChat()` разбирал только текущую реплику. «Хочу девушку сводить на свидание» не давало осмысленного сценария: слова не описывают категорию каталога.
- Короткий follow-up вроде «завтра» не переносил дату/формат/исключения из предыдущего запроса в retrieval.
- Planner `general/clarify` мог заменить предметный результат общим вопросом. Root отдельно исправляет API-интеграцию; сам provider/planner этим агентом не менялся.
- Повторный `parseContext()` читал отвергнутое «кофе» в «парк без кофе» как food. Сам category selector также мог выбрать cafe вместо park.
- Денежная сумма не содержала надёжно разобранного scope «на двоих / на всех / for two»; натуральные «два часа / one hour / екі сағат» не разбирались.
- Consent-memory, TTL, удаление, browser history и ограничение model history уже существовали. Создание новой БД/профиля не требовалось.

## Реализованный контракт

Файл: `src/server/assistant/leisure-dialogue.ts`.

```ts
prepareLeisureDialogue({
  text, history, context, language, now
}) => {
  action: 'clarify' | 'retrieve',
  reply, questions: [{ field: 'format' | 'date' | 'budget', text }], // <=2
  intent: 'date' | 'food' | 'events' | 'places' | 'general',
  context, retrievalText, explicitFields, excludedTags,
  historyUsed, reset, warnings
}
```

`filterDialogueCandidates(items, dialogue)` применяет детерминированные отрицания к названию/категории/наблюдаемым тегам. Отдельный `positiveCategoryQuery(text)` из `src/server/pilot/chat.ts` не позволяет отрицательному слову управлять selector. Оригинальные ограничения цены/времени и food/event matching не заменяются модельным выводом.

Свойства:

1. Статeless replay только ограниченных **user** turns. Assistant messages не становятся предпочтениями, ценами, датами или иными фактами.
2. Уточнения — только недостающие релевантные поля, максимум два за один ответ. Конкретный запрос «японский рамен до 5000 тенге» сразу идёт в retrieval; автоматическое onboarding-сообщение «Подбери места по моим условиям» тоже не застревает в clarifier.
3. «Привет» получает короткое приветствие/возможности без принудительного бюджета и времени, без источников/API-запросов на этой стадии.
4. Последние явные дата/формат/кухня заменяют прежние. Отрицания сохраняются на коротких follow-ups; явный поздний положительный выбор снимает соответствующее отрицание.
5. «А теперь / новый запрос / now instead / енді» отсекает историю прежней темы. Подтверждённые настройки `context`, особенно strict budget, сами не ослабляются. Явное «бюджет неважен / no budget limit / бюджет маңызды емес» допускает unknown/null budget.
6. Голая сумма без валюты и без ожидаемого ответа на вопрос о бюджете **не считается тенге по догадке**. «Завтра прогулка,5000» оставляет budget unknown; «5000 тенге» распознаётся. Голое число принимается только после сформированного budget question. Это согласованное решение root, не ошибка, скрытая ослаблением теста.
7. «На двоих / нас 2 / for two / екеуміз» — явный party size; «на всех / total budget / барлығына» — общий бюджет. «На человека / per person» — персональный. Свидание само по себе **не означает автоматически двоих**, не создаёт gender/relationship/profile data. «For two hours» не превращается в двух людей.
8. Цифровая и ограниченная словесная длительность разбирается кодом: два часа, one hour, екі сағат; полчаса, half an hour, жарты сағат; полтора часа, one and a half hours, бір жарым сағат. Это доступное время пользователя, не выдуманное время посещения/дороги. Диапазон ограничен существующим context contract.
9. Дни трактуются в Астане UTC+05. «Дүйсенбі» не ошибочно определяется как «сенбі» по суффиксу. Старые даты удаляются из search phrase, актуальная дата передаётся отдельно в детерминированном retrieval text.
10. Decimal GPS в тексте/истории редактируется существующим redactor; функция не восстанавливает координаты, не вызывает Google и не передаёт Google content модели.

## Примеры проверенных последовательностей

| Ввод | Поведение |
|---|---|
| RU: «Хочу девушку сводить на свидание» | «Что вам ближе: прогулка, ужин или событие? На какой день планируете?» Без случайных карточек и выводов о партнёре |
| Затем «В субботу кафе,15000 тенге на двоих,2 часа» | Retrieval: food, явно two/group,15000KZT,120min, ближайшая суббота кодом; без придуманных цены/атмосферы |
| Затем к ожидаемому budget question «Неважно» | budget=null, strict=false; не повторять тот же вопрос циклически |
| EN: «I want to take my girlfriend on a date» → «Dinner on Friday,15000KZT for everyone,two people» | Локализованные уточнения, затем явно заданные Friday/food/group budget |
| KK: «Кездесу үшін көмектесіңіз» → «Дүйсенбіде кафе. Бюджет маңызды емес» | Локализованные вопросы; Monday кодом, food, unknown budget без догадки о нулевой цене |
| «Парк без кофе» | Полный actual-baseline test сохраняет walk и отдаёт sourced park/garden, не переключается в cafe |
| «Концерт,без балета» → «На завтра» | Исключение ballet сохраняется; дата обновляется; неизвестная цена/длительность события не становится нулём |
| «А теперь просто кофе» после другой темы | Старые разговорные дата/жанр/бюджет не replay; подтверждённые настройки UI не снимаются автоматически |

## Точки интеграции root

1. Вызвать helper после auth/schema/consented history, **до baseline, OpenAI, внешней афиши и Google**.
2. `clarify`: пустые cards/events, локализованный deterministic reply. Использовать существующий `recordExchange`; это не новый обход consent.
3. `retrieve`: `dialogue.context` и `dialogue.retrievalText` применяются к baseline и retrieval callback. Raw user text остаётся историей/входом существующего planner; ни planner, ни его query не могут снять кодовые ограничения.
4. Отфильтровать итоговые items/events/evidence через deterministic exclusions. Для POI category selector использовать `positiveCategoryQuery` при необходимости также в planner callback.
5. Даты, адреса, source URL, actual price/unknowns приходят из неизменённых карточек данных. История — пользовательский контекст, **не** evidence о реальном мероприятии. Наличие мест/бронирование/полученный маршрут не обещаются.
6. Prompt/provider changes и UI/API принадлежат root; агент их не редактировал. Root сообщил, что API short-circuit и existing-memory integration уже внедрены и проверяются его/A8 тестами.

## Память и пределы

Helper сам ничего не сохраняет. Он не вызывает profile/consent/memory endpoints. Существующие browser retention, opt-in SQLite dialogue, отдельный consent на AI transfer, TTL, revoke и delete остаются без изменений. Условия, явно переданные человеком, используются для текущего диалога; они не становятся бессрочными профайловыми предпочтениями автоматически.

Важный предел: существующий `normalizeChatHistory()` удерживает шесть последних сообщений, а не шесть полных пар/весь архив. Длинный диалог может потерять ранние незафиксированные условия после выхода за окно. Это документированный ограниченный MVP; вечной памяти/полного ChatGPT-контекста не заявляем. Для следующего этапа нужен отдельно согласованный bounded session summary с provenance/удалением и без скрытой профилизации, а не бесконтрольная отправка всей истории модели.

## Проверки и freeze

```sh
pnpm exec vitest run tests/unit/leisure-assistant-dialogue.test.ts tests/unit/leisure-assistant-api.test.ts tests/unit/backend-pilot.test.ts tests/unit/reasoned-assistant.test.ts tests/unit/smart-assistant.test.ts tests/unit/public-chat-api.test.ts tests/unit/hosted-api.test.ts
pnpm exec eslint src/server/assistant/leisure-dialogue.ts src/server/pilot/chat.ts tests/unit/leisure-assistant-dialogue.test.ts
pnpm typecheck
```

Новый файл: `tests/unit/leisure-assistant-dialogue.test.ts`, **31 case**. После исправления KK negation/словесных длительностей combined сначала **131/131 PASS**, затем с независимым A8 API-файлом **143/143 PASS** (7 files, финальный запуск 02:48:01 по локальному выводу); scoped ESLint PASS, typecheck PASS после исправления чужого test status fixture его владельцем. Тесты offline, provider mock/без реального Google/OpenAI. Ранее падавшие проверки фиксировались кодом, не skipped.

Существующие budgets/ledger/Reservations/timeout/output caps, ключ, модель, shared contracts, Google Places/photo, DB migrations, packages, configs и UI этим агентом не менялись. Биллинг не вызывался. Это статус локального backend scope; production/E2E/публикацию подтверждает root отдельно. После финального прогона исходники переданы root во freeze.
