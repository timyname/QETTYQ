# QETTYQ · live release · 20.10.2026

## Итог

- Сервис/UI: Sites **v8**, публичный deploy succeeded, https://qettyq-app.ablecorgi64.chatgpt.site/ . Последние карта, стекло, бюджет, маршрутный timeline и чат перенесены в опубликованный Worker.
- Данные: Sxodim live/fresh, 8 ближайших карточек с реальными source URL; OSM POI — отдельный snapshot. Кэш обновляется после часа при запросе, не cron. Это не весь город и не набор официальных organizer API. Нет подтверждённых координат — нет event pin. Прав на сторонние постеры пока нет, используются подписанные иллюстрации.
- Маршруты: **публичный реальный POST /api/routing — HTTP 200**, FOSSGIS / OSRM Foot, quality `street`, 708.5 м / 567.2 с / 58 вершин для двух публичных тестовых точек. Это пешеходная оценка, не SLA, не такси и не подтверждение проходимости/наличия мест. D1 ограничивает весь сайт: 1 запрос / 1.5 с, до 200 / UTC-сутки; отдельное согласие перед передачей точек.
- AI: код source-evidence RAG и глобальный D1 бюджет готовы, но публично **не активен**: `GET /api/assistant/status` HTTP 200, `configured:false`, `available:false`, `reason:API_KEY_MISSING`, hosted web search false. Локальный ключ автоматически не переносится. В этом проходе публичных платных вызовов 0. Требуется защищённый ввод существующего ключа в runtime Secret Sites `OPENAI_API_KEY`, не в чат. Это оставшийся инфраструктурный блокер.
- Память: локальная браузерная память и временные гостевые серверные сессии; D1 здесь хранит только лимиты, не полноценный пользовательский RAG/аккаунт.
- Презентация: v8 PDF/PPTX существует, 10 слайдов, проверена в предыдущем проходе; в этом релизе не пересобрана. Видео и заявка не отправлены.

## Источник и deployment

Site project `appgprj_6ad6581c26b4819199d7c985ff8e8ea6`.

Source SHA `3f907f946e4220c702bb809eafdfe079ee794662`.

Saved version `appgprj_6ad6581c26b4819199d7c985ff8e8ea6~appgver_e757350e46208191819085cb9bc1ffff`.

Deployment `appgdep_6ad79cad01b4819189a675bfd0e3424e`, succeeded, runtime revision 4.

Архив build output: `exports/qettyq-site-live-v8.tar.gz`. Это deployment archive, не архив исходников для локального Next.js.

D1 `DB` provisioned; native overview подтвердил `qettyq_ai_public_reservations` и `qettyq_routing_throttle`. Миграции создавались через `pnpm db:generate`, применённая история не переписывалась.

## Проверки и реально выполненные команды

- `pnpm test`: **261/261 PASS**, 23 файла, включая атомарность/отказы D1, общий AI reserve, evidence/unknown/negation, routing/redirect safety.
- `pnpm typecheck`: PASS.
- `pnpm lint`: 0 errors, 13 существующих warnings в design/penpot и старых design scripts; проверки не отключались.
- `pnpm test:e2e --workers=1`: **12/12 PASS**, 18.1 с; swipe/undo, бюджет 0 vs null, память/удаление, provider failure, mobile bounds, маршрут. В routing E2E ответ synthetic и явно так обозначен.
- Ранее в этом проходе `pnpm build` / `pnpm data:validate`: PASS, 80 snapshot POI.
- Site `pnpm exec tsc --noEmit`: PASS после исправления portable JSON types / DOM appendChild.
- Built Worker preview E2E: 12/12 PASS; повтор ожидания layout использует прежнее условие отсутствия CTA/dock overlap.
- Официальный Sites `build-site.mjs`: все 5 стадий PASS, v8 archive сохранён из точного pushed SHA через `site-workflow.mjs`.
- Production HTTP smoke: health/events/status успешны; реальный routing HTTP 200, тестовая сессия удалена (`DELETE /api/session/data` HTTP 200). Секреты/GPS пользователя в тесты/логи не передавались.
- Chrome 430×932: полноэкранная реальная карта/тайлы, dock, glass и live-афиша со ссылками просмотрены. Это не проверка физического iPhone.

## Найденная и исправленная ошибка

В v6/v7 provider request завершался до HTTP-ответа. Причина воспроизведена без внешних вызовов в установленном Miniflare/workerd: Cloudflare не реализует `redirect:'error'`. Node принимал этот параметр, поэтому локальный тест проходил.

Заменено на `redirect:'manual'`; 3xx отклоняются, Location не используется, второй запрос не отправляется. Это исправление совместимости, не обход блокировки провайдера. Дополнительный тест проверяет 302 + single fetch. После deploy v8 один production smoke вернул реальную геометрию.

Документация: https://developers.cloudflare.com/workers/runtime-apis/request/ . FOSSGIS policy/атрибуция: https://routing.openstreetmap.de/about.html . Google Routes-on-map policy: https://developers.google.com/maps/documentation/routes/policies .

## Следующий проверяемый шаг

Защищённо добавить runtime Secret `OPENAI_API_KEY`, перепубликовать уже сохранённую v8 и выполнить один AI-запрос в разрешённом общем резерве $10 с проверкой D1/citations/cooldown. Approval ID и резерв не сбрасывать. Не выдавать подготовленный код за работающий публичный AI.
