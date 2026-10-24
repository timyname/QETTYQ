# Отчёт проверки

## v19 · контекст / source scope / реальные фото · 24.10.2026

- Изолированный tree25d6263e1ed283bb7914012dbc7ef6d26a186914: `node .../vitest/vitest.mjs run --maxWorkers=2` **960/96082files PASS28.22s**. Предварительный workspace931, затем963 PASS дофинальных media cases; foreign API/PWA тесты не включены в release tree. Typescript `tsc --noEmit`, scopedESLint всех изменённых TS и diff-check PASS.
- Source API tests8: unknown/throw/denied/expired/revoked не обходятся staticgrant, display=true/LLM=false остаётся публичным, разрешённый4й кандидат не теряется за deniedtop3, OSM-revoke скрывает catalog/chatitems. Нет сети. Named/reference suites58: RU/KK/EN ambiguity, exact/unknown/fuzzy/multi-branch, деньги/время, assistantнефакты, clienthint400, Google spy. Независимый агент поймал «Астанабалет→events→пустоеvenue»; root venueOnly исправил, прежнее assertion сохранено и прошло.
- Frozen eval через direct existing tsx CLI `scripts/eval-rag.ts --split=all`: deterministicRepeat=true,40cases/36outcomes/33allassertions, forbidden0(было1). Recall.810345/n29,nDCG.852822/n29 не выросли; holdout12/16 outcomes и12/16assertions. CorpusSHA5fab697ea45c3630ef91c03e8cfd76a04eb86fc03be2ab253d0fdf56d8cec1e1/goldSHAca73f28e49d02d335f52fc733e3a99a12ccad31ac589e0ac8b5ecad70ccb0917 неизменны.7gaps не объявленыPASS; no embeddings/hybrid.
- Existing Playwright runner с отдельным direct Next dev3089: real-place-photos (теперьиЯкитория390/430), real-publisher-photos, local-chat, memory-ai-consent, multistop-real-api, live-events: **19/19 PASS48.0s**. Реальные JPEG проходят настоящий gated media handler, остальные provider responses offline fixtures; paid API0. Root открыл реальные парк/интерьер/пруд, а не только файлы метаданных.
- Docker x86 build `docker buildx build --platform linux/amd64 --load --tag qettyq:vps-20261024-19 .` PASS77.8s. Final archive tracked-input diff empty; private publisher files22/3126396B провереныSHA/bytes/JPEG. Manifest-list30cdc782e47b85b97cf6eccb24d4b9f0c71497cd6c9d6cda36b2449286f22eab; sorted JSON publisher manifest1467c0d3f39dc70a5b745e180f55dd304c5eb7cdf99521189e068b7045561958.
- Production backup verified7dayretention, только app/no-build/no-deps переключён. Docker healthy178.2MiB/640MiB; SSH authorized_keys SHA unchanged9abd2d5bb7b3e791b345eeaf6bd608cb40930acb908e6dd9056cf1ab38135c40.
- Live HTTPS canary PASS: newguest savedmemory/useAIblocked → deterministic, fresh7000/90preserved, localfood→MEMORY_LOCAL_ONLY, «Астанабалет»послеfood→venue/noevent, unresolvedreference→clarify,10venuephotos/16posters,22publisher SHA/no-store+4Commons SHA. Canary memory и guest data удалены/проверены. ActualChrome Якиторияimage/articlecredit/address проверены; screenshot output/playwright/qettyq-v19-yakitoriya-live.png.
- Shared-budget read-only preflight exit2 expected: cap/reserved10000000microUSD, remainingCalls0/PUBLIC_ACCOUNTING_BLOCKED, providerCalls0. Это reservation, не invoice. Physical iPhone/geolocation/externalnavigation не проверялись; event-address marker пункт добавлен в очередь без ложногоPASS. Презентация/видео/заявка не менялись.

## v18 · GLM confirmation / cross-day memory / venue photos · 24.10.2026

- Завершённый GLM report прочитан в native ZCode; нормализованное извлечение в A-glm-zcode-audit-extracted-20261024.md. Это не upstream Sybil и не реальные пользовательские отзывы.720×960 runtime artwork не доказывает286px original; B4 hidden controls и B6 single-URL воспроизведены, B5 уточнён как tag-category count.
- Main workspace `pnpm test`: сначала860pass/1fail (две новые UI-копии без dictionary); добавлены переводы RU/KK/EN, assertions не менялись. Повтор869/86977files PASS18.87s, включая чужие незакоммиченные тесты; этот результат не приписывается release-only дереву.
- Изолированный build-input `pnpm test`: **864/86475files PASS19.01s**. `pnpm typecheck` и scoped `pnpm exec eslint`20 изменённых TS/test files PASS. `git diff --check` PASS. New API cross-day suite8cases использует actual handleChat/SQLite close-reopen/newguest/fixed Astana midnight; проверены25vs26date, expired-day clarification, forged clock rejection, current2500/90 precedence, exact/divergent replay, Google spy0, revoke и отсутствие private clock metadata в response.
- Targeted `PORT=3088 pnpm exec playwright test ... --workers=2`: glm-confirmed-ui, public-navigation, afisha-media-sizing, real-publisher-photos, real-place-photos, memory-ai-consent, local-chat, multistop-real-api, keyboard-overlay, safe-area-shell. Первый35pass/1fail: старый photo fault-injection test ожидал сброс detail→feed при reload. Новая B6-ссылка правильно восстановила detail; test обновлён, теперь явно проверяет restored detail/404 и переходит в feed для прежней fallback проверки. Финал **36/36 PASS1.0min**, assertion не отключён.
- Immutable Docker x86 build `docker buildx build --platform linux/amd64 --load --tag qettyq:vps-20261024-18 .` PASS84.9s; повтор из untouched final archive полностью cache-hit. Input tree8683af6ad622ed15d27274bed17acfc9d8743381; manifest-list82b709b95d7e3600a80ef2a8fc50393b44d7be8e35714b6cafd009b77a64cb4f.21 private JPEG validated by manifest SHA/bytes, total3027791B; git-tree-final-context diff empty перед build. QA dev отдельно изменил generated next-env только в QA-папке, final build archive не затронут.
- Перед deploy `docker exec qettyq-app node /app/backup.mjs` verified7dayretention. Только compose app/no-build/no-deps обновлён. Первая слишком ранняя private health curl завершилась reset; затем private/public HTTPS200 и Docker healthy176.2MiB/640MiB. SSH authorized_keys SHA неизменен.
- Live canary `node .sites-runtime/glm-followup-v18.G4vUNL/live-canary.mjs` PASS: newguest/no clienthistory, blocked-AI deterministic restore, current7000/nonstrict/90 preserved, local food→MEMORY_LOCAL_ONLY,8/749photo,16eventimages,21JPEG exacthash/no-store. Собственная память/guest data удалены и проверены. Платных вызовов0.
- Production read-only shared-budget CLI: cap/reserved10000000microUSD, remainingCalls0, PUBLIC_ACCOUNTING_BLOCKED, providerCalls0. Не invoice и не новая квота. Browser live Chaleur image/publiclink подтверждены; screenshot output/playwright/qettyq-v18-chaleur-live.png. Physical iPhone/native background/геолокация/внешний маршрут не тестировались; презентация/видео/заявка без изменений.

## v17 · фото / local memory / shared cap · 24.10.2026

- Final `pnpm exec vitest run --maxWorkers=2`:72files,829/829 PASS15.72s; полный typecheck и scopedESLint PASS. Ранний825 PASS;827-run во время Docker имел5s timeout старого CLI-test; без изменения timeout/проверки827 PASS19.45s. После нового status gate12 прежних AI tests выявили fixtures с unavailable-status при успешном provider mock: fixtures согласованы с их сценарием available, grounding assertions сохранены. Затем829 PASS. Начальная strict-budget tuple регрессия найдена и исправлена, не скрыта.
- Final targeted E2E: `afisha-media-sizing.spec.ts live-events.spec.ts memory-ai-consent.spec.ts ui-review-38.spec.ts --workers=1`,13/13 PASS49.4s.3новых media viewport360/390/430, extreme wide/tall,404/missing, длинное название, равные карточки/snap/nooverflow. Это не новый полный прогон всего E2E набора или physical iPhone.
- Memory42focused realSQLite+API cases входят в829, не добавлять повторно: scopes/renewguest/restart/TTL/revoke/delete/auth/isolation/GPS, sameAstana-day, budgettuple, blocked/throw AI status → local-only/no dependencies/fetch/Google. Sharedcap28focused (13new+15existing) также входят в829; atomic app/Sybil cap и offline mocked provider.
- Production read-only preflight streamed owner CLI: exit2,cap10000000/reserved10000000,remainingCalls0,reasonPUBLIC_ACCOUNTING_BLOCKED,providerCalls0. Никаких resets/refunds/new approvals/API keys. Native esbuild вызван напрямую после несовместимости pnpm wrapper с бинарником.
- Immutable linux/amd64 build candidatev16 PASS102.8s, не опубликован; finalv17 tree824563eec08b48ed7f34e1c853d6a41349fe3655 PASS58.0s,manifest a87580a98e2a988d2abc7941ff700cbb8e436d1bd3943334b9f120f945500983. OnlyQETTYQ app compose updated after verified SQLite backup; healthy186.9MiB/640MiB, SSH hash unchanged.
- Live HTTPS canary: server memory restore without client history/new guest/useAItrue+blocked cap; fresh7000+nonstrict+90min preserved; local food query notsentGoogle despite consent; ai_transfer absent; Uno photo visiblecatalog;16posters/6POIphotos/19exactJPEGSHA+no-store PASS. Own disposable memory deleted, GETdisabled verified and ownsession cleaned. Paid Google/OpenAI calls0.
- Chrome v17 две соседние реальные афиши визуально проверены: границы карточек/медиа/CTA одинаковы. Proofs output/playwright/v16/live-afisha-v17.png и live-afisha-v17-next.png. Новая Uno фотография downloaded bytes reviewed агентом, без AI-изменений.
- ZCodeGLM отдельное задание реально запущено; не засчитывается в829/E2E/Sybil simulation. Его найденные гипотезы требуют независимого воспроизведения; см.A-zcode-review. Native/device, презентация, видео и заявка в этом этапе не менялись.


## RAG/context v15 · 24.10.2026

- `pnpm exec vitest run --maxWorkers=4`:69files,788/788 PASS11.35s (финальный source). `pnpm typecheck` и scoped ESLint PASS. Ранний прогон776:1 failure был старым six-message expectation API; обновлён под новый20-turn контракт, provider6-test сохранён.
- Полный E2E `--workers=2`:95/96 PASS6.0m, один старый street-routing30s boundingBox timeout на видимой кнопке во время concurrent Docker compilation. Assertions/timeout не менялись. `street-routing.spec.ts --workers=1`:2/2 PASS19.6s. После независимого canary fix финальные `memory-ai-consent.spec.ts ui-review-38.spec.ts --workers=1`:8/8 PASS37.7s. Не заявляем один целиком зелёный96/96 запуск этого релиза.
- Docker/Next linux/amd64 immutable build PASS. v14 предварительно опубликован; live canary поймал food reparse и очищен finally. Корректирующий v15 tree a256261c976841449fc272a13ead6155e2da66f6 built50.5s, manifest66295b4270cdb948023a3a2b6d712fdb1f35561aae245e4eb33daee6e62e0fb4. Native compile24.17s относится к тому же client20-turn patch до backend-only correction; physical iPhone не установлен/не проверен.
- Independent SQLite19trace-store +11API cases: strict schema, TTL/restart/isolation/collision/capacity/delete/off; без провайдеров. Memory actual SQLite reopen после9exchanges сохраняет начало bounded диалога; revoke ai_transfer→null. Общие788 включают эти cases, не складывать числа повторно.
- A/B archived fbe5923/current:40 cases, gold/corpus hashes прежние, deterministicRepeat true; outcomes34→35/40, full assertions29→32/40; holdout11/16outcomes,11/16assertions,Recall0.50/n10,nDCG0.5732/n10. Generation claims не оценивались; source-denied pure-function finding1 остаётся.
- Production HTTPS v15: durable memory across guest renewal,18-message follow-up, confirmed strict5000, exact museum search PASS; mode deterministic/useAIfalse/googleConsentfalse, оплачиваемых вызовов0. Live events16/16posters, snapshot749/5POIphotos;18exactJPEG hashes+no-store PASS. Full own memory delete/GET disabled и own session cleanup выполнены.
- Chrome production: новая Qargyn афиша реально видна в деталях; proof `output/playwright/rag-context-r2-final-chat-20261024/live-qargyn-v15.png`. R2 public flag OFF подтверждён отсутствием trace header. VPS healthy189.9MiB/640MiB, backup verified, SSH digest прежний.
- Известны прежние synthetic safe-area hydration/MapLibre missing sprites/native large chunk warnings. Маршруты: regression only; презентация/видео/заявка не менялись. Sybil результаты отдельно, не считаются QETTYQ browser/real-user tests.


## Фото + память + RAG R1 · 24.10.2026

Фактически выполнено:

- `pnpm exec vitest run --maxWorkers=4`:64files,706/706 PASS (финальный rerun15.12s). Первый запуск с default worker fanout дал timeout существующего CLI теста; assertions/timeouts не ослаблялись.
- `PORT=3039 pnpm exec playwright test --workers=1 --output=output/playwright/media-memory-r1-final-20261024 --reporter=line`:96/96 PASS,6.3m. Frozen src. Ранние full runs95/96: screenshot protocol failure и HMR во время выбора карточки; latter trace подтверждён, test привязан к exact identity. После короткой подписи focused run10/14 выявил старый expected link label; обновлён только label, href/source checks сохранены.
- `pnpm typecheck`, scoped ESLint по изменённым source/eval/media/E2E файлам: PASS. Offline `pnpm eval:rag`: deterministicRepeat true,40 reviewed cases;34 outcomes и29 полных assertions. CLI success означает воспроизводимость, не100%качество поиска. Отчёт: RAG_EVAL_REPORT.md.
- Immutable Docker/Next build linux/amd64: PASS. `pnpm exec vite build --outDir .../.sites-runtime/media-memory-r1.zzlkMG/native-www` из mobile: PASS16.57s, warning крупных chunks; не установка на iPhone.
- Image:12 private publisher JPEG,1706916B, exact SHA aggregate совпал. Public HTTPS после deploy:10event+2place endpoints200/hash/no-store; unknown SHA404 для обоих lanes. Catalog749/5photos; events live16/10posters. Production Chrome map→RIBAMBELLE→details: real image/credit visible, proof `output/playwright/real-place-photos/live-ribambelle-v13.png`.
- VPS healthy; backup verified перед restart; SSH authorized_keys digest прежний. Existing secrets scan staged blobs:0 утечек. Google/OpenAI paid calls0. Browser MapGL использует существующий разрешённый demo; квота не расширялась.
- Остались предупреждения dev synthetic safe-area hydration/MapLibre missing sprites и native large chunks. `git diff --check` отмечал2 trailing blank EOF в новых файлах, не функциональную ошибку; проверки не отключались.
- Не доказаны physical iPhone install/restart, native memory cookie persistence, R2 traces, улучшение retrieval, полное photo coverage и новые презентация/видео/заявка.


## Multi-stop v12 · 21.10.2026

- `pnpm test`:646/646PASS,57files. Scoped ESLint и `pnpm typecheck` PASS.
- `PORT=3039 pnpm exec playwright test --workers=2 --output=output/playwright/multistop-v12-results --reporter=line`:83/83PASS,2.5min, exit0; clean single Next process. Новая regression: добавить3→Evaluateтретьего→all3→inline reorder→ordered routePOST. Существующие реальные HTTP/SQLite/hold-drag/unknown/provider-failure проверки сохранены.
- Immutable Docker tree `f37cb450e835102733652b18ce3334fd64e98e8f` Next build PASS. Private native Vite compile PASS7.48s, large-chunk warning остаётся. Нет утверждения об установке/проверке на физическом iPhone.
- Production healthy vps12,211.1MiB/640MiB, backupverified,SSHdigest unchanged. Actual Chrome three-stop evaluate/reorder/new street geometry PASS,22.4km,8h17m including estimated visits/buffer; старт — публичный музей, не GPS пользователя. Два бесплатных FOSSGIS запроса,Google/OpenAI0. Источники/фото не расширены.
- Артефакт: `exports/screenshots/multistop-v12/live-three-stops-reordered.png`. Подробные команды/границы: `agent-reports/A-multistop-release-20261021.md`.

## Скриншоты iPhone / native Origin / map search · 21.10.2026

- Финальный `pnpm test`:641/641PASS,55files. `pnpm typecheck` PASS; scopedESLint map/search/PilotApp/API/tests PASS. Первичный rootlint поймал Date.now() в callback, заменено монотонной request revision; правило не отключали.
- Полный чистый `PORT=3039 pnpm exec playwright test --workers=2 --output=output/playwright/iphone-ui-pass-results --reporter=line`:81/81PASS,2.9min. До этого76/81: обнаружены и исправлены credit/header после fullbleed, landscape attribution overlap, eventfixture selection и drag к остановке вне scroll viewport. Существующие проверки href/unknown/source/hit-test сохранены. Подробно `A-route-start-flow-20261021.md`, `A-safe-area-shell-20261021.md`.
- Search: новые unit+API tests проверяют alternateKKspelling только для retrieval, exactnumeric house tokens, unknown/expired addresses, no-store/session/cross-site/cleanup. MockMapGL проверяет actual fitBounds target after submit, empty response, enterKeyHintsearch. Самый поздний native-only flag добавлен отдельно и покрыт641unit+productionbuild; webfixture конфигурация не зависит от него.
- `git archive 87f62e3b482eb7ba1d51b1e0e2c55a68b3677874 … | docker build --platform linux/amd64 -t qettyq:vps-20261021-11 -`:PASS Next16.4.2 build+tsc. App-only compose update, backup verified, healthy. SSH authorized_keys SHA256 прежний `9abd2d5bb7b3e791b345eeaf6bd608cb40930acb908e6dd9056cf1ab38135c40`; другие проекты не менялись.
- Native `pnpm exec vite build --outDir …/.sites-runtime/iphone-ui.zYxSzA/native-www --emptyOutDir`:PASS2.41s, предупреждение largechunks оставлено, не скрыто. Source/mobile/www/signing не переписаны. Подключён физический iPhone, но новый bundle ещё не установлен и hardwarekeyboard/status-area QA не объявлены PASS. Существующий ACTIVE iPhone-sync процесс отдельный.
- Console: после отдельного owner approval добавлен точный `capacitor://localhost` рядом с HTTPSweborigin. Save/reload подтвердили chips; Map Tiles202/1000,monthBlock, demo21.11 неизменны. Снимок ограничений cropped ниже secret header: `exports/screenshots/iphone-ui-20261021/origins-saved.png`. Новый native flag provisioned без вывода ключа, другие env сохранены.
- Production HTTP own-session: namedvenue1,publicaddress2,negative0; sourceURLOSM/no-store/searchStoredfalse PASS. Web+nativeconfig enabled2GIS/allowednative true, secret values не выводились. Своя disposable session удалена. Latency1315/460/337ms — end-to-end HTTPS с coldstart, не localretrievalbenchmark.
- Media: bounded11Wikidata+8Commons metadata200 дали0новых approvedphoto; 12reviewcandidates из749POI. Отдельно1currentEvent JSON-LD/og:image→oneJPEG downloaded/decoded/SHA/visual/privateignore PASS. PublicDisplayAllowed=false, не считать фото подключёнными к карточкам. Отчёты `A-real-media-enrichment-20261021.md` и `A-private-event-media-download-20261021.md`.
- Платные Google/OpenAI calls0, caps/ledgers не сбрасывались. Physical nativeMapGL tile-load после Origin изменения остаётся непроверенным; не равен browser/mock/correctconsoleconfig.

## Активация demo MapGL и published style · 21.10.2026

- `pnpm test`:590/590 PASS,51files, финальный run04:44; `pnpm typecheck`:PASS. Scoped ESLint map/config/theme/tests+PolicyPages/i18n-policy/smoke-script PASS. Первое обновление policy поймало missing translation2ГИС (589/590), добавлен RU/KK/EN brand row и полный повтор590PASS. Проверки не выключались.
- Agent `PORT=3037 pnpm exec playwright test tests/e2e/dgis-map.spec.ts --workers=1`:10/10 PASS, browser mock only, external network aborted. Markers/click/manual origin/street line, client text no key, style/SDK/WebGL/key error failover, native credit geometry and synthetic58px safe-area. Не доказательство live tiles/реального iPhone. Подробно `agent-reports/A-mapgl-style-20261021.md` и `A-dgis-mapgl-qa-20261021.md`.
- Production `docker build --platform linux/amd64` from `git archive 4f70da76ed07e514084e5bc0affcb050b6e5d31a …`:PASS Next16.4.2/TypeScript, `qettyq:vps-20261021-10`, manifest SHA256 `2bb0757e51b4eb8baf3eac2c6c301cf6a0324e4135ce021433b9b871700f35d0`. Private index excluded unrelated dirty native/PWA sources; no env included.
- `docker exec qettyq-app node backup.mjs`:verified/seven-day retention. App-only `QETTYQ_IMAGE=… docker compose … up -d --no-build --no-deps app`; no proxy/other project changes. SSH authorized_keys SHA256 remains `9abd2d5bb7b3e791b345eeaf6bd608cb40930acb908e6dd9056cf1ab38135c40`.
- Console manual verification: demo active/block21.11.2026; Map Tiles saved1000/month with Блокировка. Initial raw Origin without scheme was not committed by UI; corrected to full HTTPS Origin, Enter creates chip, Save then reload confirms. Current key not rotated/new key not created, no paid conversion.
- Public browser live v9/v10: `data-map-engine=2gis`, `data-map-ready=true`, `data-map-theme=qettyq-published-style`; screenshot genuine tiles+markers. Card selection and origin pick PASS, picker closed and stayed on map. Public arbitrary test point—not user's GPS—used for one FOSSGIS call: street2.8km/≈38min, total≈91min with35estimated visit+18buffer. Native 2GIS deep link with start+destination confirmed, external app not launched. Google/OpenAI provider calls0.
- v9 first live screenshot discovered 2GIS credit under dock; v10 corrected via documented copyright topLeft + controls padding. Live rect82.5–101.5px; DOM hit-test confirms native link uncovered. Final proof `exports/screenshots/dgis-release/live-map-v10.png`; no unredacted console key screenshot saved.
- `node scripts/smoke-event-plan-release.mjs`:749POI/16events/8geocoded; approved config+published style; mixed real-event plan/reorder3/remove2/unknown duration PASS; disposable session cleanup PASS. This checks HTTP/real server plan, not provider network or physical device.
- Prior full61E2E belong to release8, not a new full-regression run; current targeted10 plus590 logic tests are the new evidence. Physical iPhone/native origins, background visits and 2GIS Routes are not claimed tested/connected.

## Keyboard / event plan / guarded2GIS · 21.10.2026

- `pnpm test`: **572/572 PASS,50files**. `pnpm typecheck` PASS. Scoped ESLint всех изменённых server/UI/provider модулей exit0; проверки не выключались. Новые тесты: venue+address conflicts/media policy, prepared2GISkeygate/SDKloader42, eventmixedplan nullable duration, schedulewait/lateness, routevisit ambiguity/accuracy.
- `PORT=3037 node node_modules/@playwright/test/cli.js test --workers=2 --output=output/playwright/qa-route-refresh/accepted-results`: **61/61 PASS,2.5мин**. После узкого CSS fix атрибуции отдельный landscape DOM hit-test/nonoverlap **1/1 PASS,1.9сек**, `output/playwright/qa-route-refresh/landscape-credit-final`. Ранние прогоны ловили in-flight parse/HMR и устаревшие selectors; последний замороженный run61полностьюзелёный, assertions времени/денег/источников сохранены.
- Реальные локальные HTTP session/context/catalog/plan endpoints:3stops→button reorder→2stops→320ms hold/drop; request и serverresponse order проверены, не optimistic-onlyUI. Isolated synthetic event map→internal detail→plan→2GISlink; неизвестная duration null, не0/90. Дорожные/AI/Google/афиша для E2E замоканы, платных вызовов нет.
- Keyboard offsetTop/visualheight и WKWebView innerheight resize проверены synthetic fixtures; popupclose/2sec fade/no feed layoutshift, header, 360/390/430/landscape, memory/delete/languages PASS. Это не физический iPhone/Safari тест. Проверенные screenshots перечислены в `agent-reports/A-map-chat-independent-qa-20261021.md`.
- Один bounded local 2GIS demo Places probe по общедоступному названию:HTTP200/meta200/1result/pointpresent. Значение ключа не выводилось. Live MapGL/routing не проверены и не включены: существующий serverkey не раскрыт; отдельный approvedbrowserkey отсутствует. SDK/renderer покрыты unit, browsermapgate по умолчанию disabled. Google/OpenAI API в этой задаче не вызывались, budgets/ledgers не сбрасывались.
- Immutable production tree `94a870b804bb476a520decfea9cfe39cb1c186fb`, Next16.4.2/amd64 Docker build PASS,27routes,TypeScriptPASS. Image `qettyq:vps-20261021-8`,SHA256`ace69dce83dfb4f4c60d65665f828310eb0eeee7c3ca8dff3c92738616a1be41`,108169574bytes. Финальная исходная правка послеE2E — только trailing-space, runtime semantics не менялась. Предрелизный SQLite backup verified, retention7days. Финальные public smoke результаты ниже.
- Data review: production16events/6coords перед релизом; reviewed2Jastar match дают ожидаемые8. Точные sourceURL/address guards/reviewdates в `A-event-geodata-20261021.md`; никакой fuzzy«театр единственный». HAS SANAT14-Д/Garage ambiguity остаются unresolved. Sxodim poster grants0; generatedfallback снят, approvedposters поддерживаются.
- Добровольный route-return prompt defaultoff, требует visits consent и уже выданной GPSpermission, работает толькоforeground; vicinity не пишется какvisit. Unitпроверяетaccuracy/nearbyambiguity, physicalreturn/visitUI пока не проверены. Презентация/видео/заявка/новаяiOSустановка этим тестом не подтверждаются.
- **Public release8 PASS**: `node scripts/smoke-event-plan-release.mjs` →749POI/16events/**8coordinates**,0generatedeventimages,0exposedbrowserkeys; реальное событие в mixed3stopplan, reorder3/remove2 и unknown duration PASS. `node scripts/smoke-vps-release.mjs https://qettyqapp.anamai.kz` → memoryoptin/SecureHttpOnly/profile/newsessionrestore/deletePASS, Googlenoconsent400. Только свои disposable планы/identity/session удалены, данные пользователей не тронуты.
- Контейнер release8 healthy, SQLitequick_checkok, SSHauthorized_keys digest прежний `9abd2d5bb7b3e791b345eeaf6bd608cb40930acb908e6dd9056cf1ab38135c40`, ключ сохранён. Общий прочитанный ledger snapshot OpenAI15/$7.50reserve,Google4/$0.40reserve; это резервы всего приложения, не invoice и не число вызовов данного теста. В этом этапе новых OpenAI/Google provider probes0, caps$10/$10 не сброшены. Существующие другие проекты не перезапускались.

## Фото, iPhone glass и leisure dialogue · 21.10.2026

- `pnpm test`: **493/493 PASS, 43 files** после финальной правки server validator; `pnpm typecheck` PASS. Immutable Docker Next16.4.2/amd64 build PASS, 26 routes, TypeScript PASS. Исходный build tree `b761eaf4be7433132ab9941b0eeae50f9af221f6`; image `qettyq:vps-20261021-7`, SHA256 `db555e68ded3ca9ca94fdabd5e27603e36ed5147c3a638312c1927d7e991086b`,108184202bytes.
- Чистый `PORT=3037 node node_modules/@playwright/test/cli.js test --workers=2 --output=output/playwright/photo-assistant-release-20261021-clean-results`: **56/56 PASS**,1.4мин. Native Vite preview:12/12 scoped PASS. Клавиатура560px/safe-area58+62/landscape/reduced-motion — synthetic Chromium fixtures; не физический iPhone/WebKit. Между проверенным UI release5 и release7 UI build-input изменений нет.
- Первый общий E2E поймал старые expectations, преждевременное измерение keyboard layout, dev-toolbar вне app и реальную возможность planner заменить прогулку Google-food. Expectations обновлены по контракту, keyboard assertion ждёт фактическое завершение layout без ослабления границы, product tap audit scoped app; known intent теперь имеет приоритет. Проверки не выключались.
- `pnpm lint`: exit0,0errors/1118warnings в полном workspace, включая существующие generated/mobile/vendor warnings. Первичный запуск ошибочно захватил ignored private `.sites-runtime` bundle; добавлен только ignore этой generated папки. Предупреждения не объявляются исправленными.
- Native `vite build --outDir /Users/phonelab/Documents/QETTYQ/.sites-runtime/photo-release.IMvF0s/native-www --emptyOutDir`: PASS,2.73s. Текущие mobile/www/ios и signing не переписаны. Существующий ACTIVE `qettyq-iphone-sync` ожидает окончания web-задачи; новая установка ещё не подтверждена.
- Одна реальная Google проверка в прежнем ledger: HTTP200/live,5заведений,4счасами,5фото,5authorcredits; no_store/external_google_only. Дополнительных Google probe после неё нет. Два проверенных Commons POI из749, не все кафе; SHA/license/provenance проверены, пустое или отозванное разрешение fail-closed. Отчёт прав: `agent-reports/A-place-photo-rights-20261021.md`.
- Public memory smoke PASS: opt-in/Secure HttpOnly/profile/new-sessionrestore/delete; Google без согласия400. Только собственная disposable identity, cleanup finally. Никакого скрытого server dialogue до consent.
- Два первых ручных paid AI smoke не дали generative PASS: safe fallback `UNSAFE_OR_UNGROUNDED_REPLY`; второй диагностирован `SENTENCE_STYLE`. Произвольный whitelist начал фраз снят; все grounding/schema/link/numeric/name guards сохранены. Добавлены RU/KK/EN regressions. Автоматических платных retry нет; итог последней ручной проверки ниже.
- **Финальный live AI PASS на release7**: `node scripts/smoke-assistant-dialogue.mjs --ai` → два уточнения, followup walk/120min/nullbudget, `mode:openai`, `reasoningMode:plan_retrieve_answer`,3места/3цитаты, `memoryStored:false`, Google не вызван; собственная сессия удалена. После публикации повторный memory smoke PASS. SQLite quick_check ok; прочитанный общий ledger snapshot: OpenAI13reservations/$6.50,Google4/$0.40. Это консервативные резервы общего приложения, не фактический invoice; caps$10/$10 и approval IDs не сброшены.
- VPS release7 healthy, public HTTPS200. SSH authorized_keys SHA256 прежний `9abd2d5bb7b3e791b345eeaf6bd608cb40930acb908e6dd9056cf1ab38135c40`; ключ по решению владельца сохранён. Только QETTYQ app image обновлён, чужие проекты/контейнеры не перезапускались.
- Live browser public430×932: language→feed→chat, естественный intro, disclosure и joined composer/dock видимы. Снимок `output/playwright/public-chat-20261021.jpg`; не эмуляция физического Dynamic Island. Геопозиция не разрешалась, платный запрос через браузер не отправлялся.
- Презентация/видео/заявка/App Store этим релизом не обновлялись. Route geometry regression покрыта общим E2E; новый платный road-provider probe не запускался.

## Google Cloud403 — исправлено · 21.10.2026 01:56 Asia/Aqtobe

- Через существующий Chrome Google Cloud проверены проекты/ключи сравнением SHA256 без вывода значений. Первый проект содержал другой старый ключ и не изменён. У выбранного ключа Places API(New) был disabled; существующий billing Pay as you go подключён.
- Places API(New) включён и UI показал Disable вместоEnable. Key restrictions сохранены как IPадрес сервера+1API Places(New), secret value не ротировался. Новая подписка/payment details/Cloud billing limit не создавались.
- **Один post-fix** `node scripts/probe-google-public.mjs`:HTTP200,statuslive,5items,5withHours,storage no_store,mapDisplay external_google_only,exit0. Собственная гостевая сессия удалена script finally; AI запросов0. Runtime не перезапускался.
- Read-only VPS ledger: Google2reservations/200000microUSD; старый403 не возмещён/не сброшен. OpenAI9/4500000microUSD не изменён. Server key SHA256 matchtrue. Это прикладные резервы, не Google invoice.
- Скриншот сохранён локально в ignored `.sites-runtime/google-places-enabled-20261021.png`; ключ на изображении не раскрыт. Подробно:`agent-reports/A-google-cloud-403-20261021.md`.

## Data Hub / OSM expansion / compact route · 21.10.2026

- Node24 `node node_modules/vitest/vitest.mjs run tests/unit tests/integration`: **388/388 PASS,38files**; `tsc --noEmit` PASS. Scoped ESLint новых server/API/UI/scripts PASS. Первый полный run поймал missing price-source translation; исправлено, новый полный run388PASS.
- `data:validate`:749 sourced POI; все прежние80 IDs сохранены. Publisher PBF проверен osmium header/type/224644381bytes/SHA256;307 latest alias не был принят за PBF. Первичный локальный2GB extract exit137 не использован;5GB successful offline retry. Никакого Overpass обхода/повторного source download.
- Address matcher6unitPASS + независимый adversarial review:14/14-А/14-2/142/14.2/corpus/substring street не сливаются. Реальный current feed:6 derived matches/16, остальные unknown; корпус53 ambiguous не принимается.
- UI **44/44E2E PASS одним чистым run**, workers2,2.9мин: `playwright test --workers=2 --output=output/playwright/final-ui-20261021-clean-results`. RU/KK/EN×4widths, GPS denied, map/manual return, datepersist при origin refresh, street geometry+consent invalidation, SQLite memory/PWA regressions. Старые network readiness assertions ждут тот же visible map/credit до20s при8s provider timeout, не отключены. После роста749POI fixed click попал в реальный cluster: helper выбирает свободную точку реальным DOM hit-test безforceclick.
- Docker immutable production build `6265e8fe` PASS (Next16.4.2/Node24/amd64). Релиз4 опубликован: healthy/HTTPS200, backupverified, внешние boostseller.kz/anamai.kz200, SSH hashunchanged. Secret provisioning: выбранный Google key и producer hash переданы stdin→QETTYQ-only atomic secret file; другие env записи сохранены, значений в логах нет.
- Public checks PASS:749POI/265hours/16events/6derived; hub unauthorized401 + validtoken/invalidschema400 + emptyapprovedcatalog200; никаких syntheticproductionrows. `smoke-vps-release.mjs` PASS: memory opt-in/SecureHttpOnly/write/newsessionrestore/delete и Google no-consent400 безрасходаquota. Свои identity/session очищены.
- **Один** `probe-google-public.mjs` получил HTTP503 adapter / upstreamGoogle403 (`GOOGLE_ACCESS_NOT_ENABLED`),0places. Не выдаётся за успешный поиск, повторов нет; проверить GoogleCloud Places API(New)/billing/keyrestrictions. Gmail4SENT, grants0; новых OpenAI вызовов0.

## Приоритетный проход · языки/память/контекст · 21.10.2026

- `pnpm test`:356/356 PASS,34files. Новые проверки: memory identity/isolation/revoke/delete/TTL; comma/dot/plus GPS redaction всех outbound; original date/rock/price constraints; semantic retrieval до top3; Google cap100×$0.10/consent/no-key/no-retry/mapless credit; one OpenAI reservation400+800 tokens и aggregate accounting.
- `pnpm typecheck`:PASS. Targeted ESLint `src/server src/client src/components src/app/api/{chat,memory,places} src/app/{privacy,sources} tests scripts/import-poi.ts src/instrumentation.ts src/domain/types.ts`:PASS. Временный конфликт параллельного mobile config затем исчез; проверки не отключались.
- `pnpm test:e2e --workers=2`:38/38 PASS, zero skips; 3languages ×4viewports, main/organizer/policy, memory UI and deletion. Exact resize assertion заменён на ожидание того же точного размера, не ослаблен. Подробности и237PNG в отдельном QA отчёте.
- `pnpm data:validate`:80 snapshot POI PASS. `pnpm data:import:poi`:502,старые файлы сохранены; read-only status endpoint406,повторного обхода не было.
- Production build: immutable tree `c3ba9306b03472d30ad2ef918f8cadeb269cb4b7` → Docker linux/amd64 `qettyq:vps-20261021-3`, image SHA256 `7b822fe95ffa03666d99c88213e1ec6b7b2e604655f644a5fbc409422daeb46c`. Next build/TypeScript PASS. Незавершённый iOS/PWA workspace не включён.
- Публичный HTTPS: реальный opt-in profile→restart qettyq-app→новая guest session→restore PASS; Secure/HttpOnly cookie, полный DELETE и повторный empty GET PASS. Тестовая identity очищена. Production Google503 `GOOGLE_SERVER_KEY_REQUIRED`, paid Google calls0.
- Реальный AI: первый HTTP проход intent/retrieval нашёл2события, final prose отклонена `UNSAFE_OR_UNGROUNDED_REPLY` → deterministic fallback (не PASS генерации). Один отдельный owner-only controlled query через настоящий runtime/ledger подтвердил `openai`,1source citation; без координат/личной истории/hosted tools. Все попытки сохраняют первоначальные невозвратные резервы, ledger не сбрасывался.
- Заключительный `node scripts/smoke-vps-release.mjs https://qettyqapp.anamai.kz --ai`: public HTTP200,mode=openai,reasoningMode=plan_retrieve_answer,model=gpt-5.5,2events/1citation PASS. Своя память и guest data удалены в finally. Никаких повторов внутри provider adapter; каждая ручная диагностическая попытка получила свой прежний durable reserve.
- Финальный SQLite audit:9completed reserves /$4.50 из прежнего$10 application cap,0reserved/blocked,0memory_clients после cleanup,`PRAGMA quick_check=ok`. Backup после проверки Result=success; все три QETTYQ timer active. boostseller.kz200/anamai.kz200; retained SSH key digest не менялся после установки.
- Public `/api/events`:200live/fresh,8future,0withCoordinates, fetchedAt `2026-10-20T19:17:36.068Z`; это ещё прежний свежий8-page cache. Новый24-page fetch не форсировался в обход lease. Отдельный почасовой refresh timer включён, manual service cache-hit Result=success, next planned `2026-10-20T20:20:11Z`.
- Backup service before update Result=success; Nginx test PASS +graceful reload. Browser public language gate подтверждён, screenshot `exports/qettyq-vps-language-20261021.png`. Старый SSH-key был удалён в прошлом релизе; новый ключ сохранён по новому явному указанию владельца.

Проверка реального HTTP/SQLite не равна физическому iPhone QA. UI mock paths не подтверждают live-источник или реальную дорогу; source/route limitations сохранены.

## Приоритетный проход · VPS + UI38 · 20.10.2026

- `pnpm test`: **300/300 PASS**,28файлов. Ранее выявлен1старый Referer expectation после смены canonical URL; исправлен на фактический новый hostname, проверки не отключались.
- `pnpm test:e2e --workers=2`: **16/16 PASS**,25.5с;6spec. Синтетические event/routing fixtures явно помечены и не считаются live provider proof.
- `pnpm typecheck`, `pnpm data:validate` (80snapshot POI), `pnpm submission:check`: PASS. `pnpm lint`: exit0,0errors,13старых unused-vars warnings в Penpot scripts.
- `pnpm build`: PASS. `docker build --platform linux/amd64 --progress plain -t qettyq:vps-20261020-3 .`: PASS (Next16.4.2, Node24.22.0). Первый install выявил, что Docker не копировал reviewed pnpm-workspace.yaml; файл добавлен, strict build-script policy не отключалась. Dynamic path tracing исправлен поддерживаемыми annotations; финальный образ не содержит `.env.local`, `src` или исходных пользовательских документов.
- Новый public HTTPS health200, HTTP301→HTTPS, Secure/HttpOnly/SameSite cookie; session201 и DELETE200/deleted:true. Certbot certificate18.01.2027; `renew --dry-run --no-random-sleep-on-renew` PASS. `nginx -t` PASS перед graceful reload. Два исходных домена boostseller.kz/anamai.kz остались200.
- Public `/api/events`:200 live/fresh8, fetchedAt2026-10-20T18:12:11.530Z. Старый Sites `/api/assistant/status`: PUBLIC_AI_DISABLED после env5 publish. Полный D1 ledger export0rows verified post-freeze; импорт в SQLite без reset.
- Два реальных public GPT-5.5 вызова:200/openai; второй2real event cards +2Sxodim citations. Первый reserve500000microUSD пережил пересоздание app, итог1000000/10000000 зарезервировано,18calls remaining. Cooldown подтверждён. Это резервы, не измеренный фактический долларовый invoice. Никаких hosted tools или неразрешённых новых API.
- Реальный VPS `/api/routing` POST:200/live/street/fossgis_foot,492м,393.6с,17vertices между публичными POI Арарат/Королевская охота; тестовая сессия удалена. Это не synthetic геометрия и не GPS пользователя.
- SQLite `PRAGMA integrity_check`:ok. Один app-only backup выполнен и проверен тем же integrity check; renewal/backup timers active. Production screenshot390×844: welcome/swipe/conditions/feed/event/map/plan. Физический Safari/iPhone не проверен.
- Финальное read-only чтение ledger:3completed reservations/$1.50; публичный счётчик изменяем, дополнительный запрос не приписываем двум контролируемым smoke. DB содержит93venues (80OSM +event venues),14events/occurrences,0hours,0memory_clients; это накопленная история, не14текущих live карточек.
- SSH cleanup:удалена только одобренная task-key строка; SHA256 остальных authorized_keys совпал с исходным. Повторный BatchMode SSH с временным ключом получил expected255/Permission denied. Чужие ключи и остальные доступы не изменялись.

Исторические результаты ниже не заменяют этот проход.

## Актуальный проход · live evidence, D1, public UI · 20.10.2026

- `pnpm test`: финально **261/261 PASS**, 23 файла; `pnpm test:e2e --workers=1`: **12/12 PASS**, 18.1 с. Production street-routing HTTP 200 после исправления Cloudflare redirect. Подробности в `docs/agent-reports/A-live-release-20261020.md`.
- `pnpm typecheck`: PASS. Ранее в этом проходе `pnpm build`, `pnpm data:validate` (80 snapshot POI) — PASS.
- Root E2E: 12/12 PASS. Built Worker preview: 12/12 PASS после стабилизации ожидания layout при resize (`expect.poll` с тем же условием отсутствия пересечения CTA/dock). Synthetic routing fixture не является доказательством реального внешнего маршрута.
- Sites v6 и v7 build helper: все 5 стадий PASS. D1 таблицы `qettyq_ai_public_reservations` / `qettyq_routing_throttle` подтверждены native overview. Публичные health/events/status endpoints отвечают, афиша live/fresh: 8 карточек и реальные публикации.
- Публичный AI status: `API_KEY_MISSING`; вызов модели публично не проводился, квота прежнего локального теста не сбрасывалась. Проверки бюджета/idempotency/cooldown/нет DB/provider failure — offline unit, не оплаченные запросы.
- Маршрутизатор локально вернул 708.5 м / 567.2 с / 58 вершин для двух публичных тестовых точек. Первый public Worker вызов завершился 503 до HTTP-ответа провайдера; недоказанное предположение об IP-блокировке не принимается за факт. Найдена несовместимость `redirect:'error'` в Cloudflare; финальная повторная проверка отражается в отчёте релиза.
- Проверены реальные Chrome UI: live-афиша со ссылками, полноэкранная карта/маркеры, навигация 4 tabs; 430×932. Ошибка очистки `null.getBoundingClientRect` исправлена. Реальный iPhone и сквозной публичный AI не проверены.

## Финальная интеграция live-афиши и glass · 20.10.2026

Завершающий прогон: Site `PORT=5173 pnpm test:e2e --workers=1`: 8/8 PASS,10.5s. Исходный organizer-тест не ослаблялся; readiness исправил реальную раннюю потерю клика. Новый тест использует явно synthetic events fixture, а не выдаёт mock за live.

Vinext build helper: exit0, все5 стадий. Sites v5 succeeded, production HTTP smoke: health200; events200 live/fresh7 с fetchedAt `2026-10-20T11:50:51.145Z`, cachehit; session201/chat200 с3событиями/delete200. `/api/maps-config` не отдаёт ключ. Production session smoke — одно наблюдение, не гарантия durable storage.

CUA mobile:430×932,390×844,360×800; на390 CTA632.6..680.6 при mainbottom738. На360 CTA601..649 при mainbottom694. Документ не удлиняется за viewport, контент имеет внутренний scroll. Proof: `exports/qettyq-glass-mobile.png`. LAN URL вернул200 с Mac; Safari на физическом iPhone не проверялся.

Имеет приоритет над числами прежних проходов ниже.

- `pnpm test`: PASS, 100 тестов в 12 файлах. Без реальных платных AI-вызовов.
- `pnpm typecheck`: PASS. `pnpm build`: PASS, включая `/api/events` и чат.
- `pnpm lint`: PASS по exit code, 0 ошибок и 13 предупреждений старых design scripts. Generated Playwright trace/report исключены, исходники src/tests продолжают проверяться.
- `pnpm data:validate`: PASS, 80 POI с provenance.
- Реальный сетевой smoke `/api/events`: HTTP200, live/fresh, 7 будущих событий; повтор hit с тем же fetchedAt. Это не mock. Координаты всех 7 unknown, ложные pins отсутствуют.
- Браузер CUA: открыты реальные афиша → детали и чат → «События» → 3 карточки, цены/язык/длительность unknown отображаются явно. Полный финальный E2E и публичный Worker smoke будут записаны после окончания.
- Важно: первый Site E2E дал 6 PASS / 1 FAIL — ранний клик по SSR-кнопке до hydration. Кнопки header теперь disabled до готовности. Не считать этот прогон успешным; требуется повтор.

Не подтверждены: генеративная модель/RAG, дорожный ETA, Google SDK, киносеансы, бронирование, production-аккаунты, реальный iPhone/Safari, совместное редактирование. Презентация v7 проверена отдельно; видео/заявка не выполнялись.

## Актуальный прогон локального web app · 20.10.2026

Ниже этого раздела сохранены старые отчёты; их числа не являются числом тестов текущего прохода.

| Команда / проверка | Фактический результат |
|---|---|
| `pnpm test` | PASS: 69 тестов, 11 файлов; включая ingestion, API, Host/Origin, swipe release/opacity, clustering и localDraftOnly |
| `pnpm test:e2e --workers=2` | PASS: 6 сценариев; 15 свайпов → условия → детали → план, drag/return/undo, 503, строгий бюджет, 4 tab/Leaflet, память/удаление, 360/390/430 и reduced motion |
| `pnpm typecheck` | PASS после интеграции PilotApp и OrganizerFlow |
| `pnpm build` | PASS на основной сборке PilotApp; финальный повтор после последней доводки фиксируется ниже |
| `pnpm data:validate` | PASS: 80 snapshot POI с provenance |
| `pnpm submission:check` | PASS: наличие обязательных документов и проверка env.example; это НЕ проверка полной готовности и не отправка заявки |
| `pnpm lint` | Ошибок приложения не найдено; предупреждения старых design scripts учитываются отдельно, временные vendor executables исключены как generated code |
| Browser QA через CUA | Открыты welcome/swipe/conditions/feed/map/profile. OSM-тайлы реально загружены. При визуальном осмотре найдено и исправлено перекрытие 80 pins через clustering |
| Презентация v7 | 10 слайдов; finalizer PASS, PDF10 страниц; 8 неизменённых слайдов совпали с v6; 7/10 обновлены и перепроверены |

Не проверены как live: OpenAI, дорожная маршрутизация, Google SDK, Ticketon/Kino sessions, live-event imports, booking, совместная сессия. Отдельный iPhone/Safari touch-прогон не проводился. Это не отчёт о полностью готовом production-продукте.

`git diff --check` на всём dirty tree показывает ранее существовавший trailing whitespace в пользовательском `docs/PRODUCT_UI_MASTER_SPEC.md:28`; этот несвязанный текст не исправлялся и не перезаписывался.

## Исторические отчёты

Дата последней проверки: 20 октября 2026. Среда: macOS arm64, bundled Node.js, pnpm.

| Проверка | Статус | Детали |
|---|---|---|
| `pnpm data:validate` | PASS | 80 snapshot POI с provenance |
| `pnpm test` | PASS | 18 unit + integration тестов |
| `pnpm test:e2e` | PASS | 5 mobile Chromium сценариев, 390×844, reduced motion; 15 реакций проходят полный путь |
| `pnpm typecheck` | PASS | TypeScript без ошибок |
| `pnpm lint` | PASS | ESLint без ошибок |
| `pnpm build` | PASS | Next.js production build после подключения 15 локальных 3:4 assets |
| Проверка изображений | PASS | 15 runtime JPEG, каждый 720×960; мастера сохранены отдельно |
| `pnpm submission:check` | PASS | Обязательные файлы доступны, `.env.example` без ключей |
| Presentation QA | PASS | 9-slide PPTX, 9-page PDF, montage и full-size inspection |
| Secret scan | PASS | Финальный submission ZIP без известных ключевых паттернов |
| P0 screen manifest | PASS | `jq`: 28 записей; 28 PNG присутствуют и не пусты |
| Screen master dimensions | PASS | Masters около 853×1844, единая portrait-пропорция; целевой viewport в контракте 430×932 |
| UX flow render | PASS | SVG-карта отрендерена Quick Look без ошибок; четыре ветки и 26 состояний видимы |
| Click-flow P0 | PASS | Пройдено `02→04→05→08→09→10→11→13→14`; dock появился только на `14`; также проверено `14→16→17→24` |
| 44-screen layer contract | PASS | JSON валиден; 44 уникальных ID 01–44; 17 docked screens используют точные 4 labels |
| Asset/icon manifest | PASS | 44 screen maps, 15 interest cards; все указанные Lucide exports существуют |
| Screen 14 production UI | PASS | Hero x=22/w=386, dock x=16/w=398, gear/settings overlay, semantic media/facts/actions; screenshot QA 430×932 |

Провайдерные mocks не выдаются за live smoke. Реальный сетевой вызов выполнен только для одного ограниченного импорта OSM. Детали E2E: `docs/agent-reports/A8-e2e.md`.

Визуальный QA экранов ограничен композицией. Сгенерированный текст не принимается
как финальный UI-copy; map-like фон не принимается как настоящая карта. Перед
релизом каждый экран должен быть воспроизведён кодом и пройти mobile screenshot QA.

## Penpot · 20.10.2026

Проверки относятся к дизайну, не к сервисам приложения.

| Проверка | Результат | Доказательство |
|---|---|---|
| Screen copy и graph spec | PASS | 44 уникальных основных ID; `flow-links.json`: 332 контрактных связи, 45 достижимых основных узлов с settings |
| Реальные native boards | PASS | В Penpot просмотр показывает 59 фреймов: 44 + settings + 14 вариантов колоды |
| Текст вне границ фрейма | PASS | `scripts/qa-penpot.mjs`, `visual-audit.json`: 0 выходов у 59 фреймов |
| Медиаслои | PASS | 15 локальных JPEG импортированы отдельными image fills, не цельными UI-скриншотами |
| Экспорт и осмотр | PASS | Native PNG 02,05,14,16,27,32,33,36,45 в `design/penpot/previews/`; визуально осмотрены 05,14,27,36 и браузерный просмотр карты/профиля/settings |
| Gear overlay | PASS | Открыт 45 из 14, «Готово» вернуло тот же экран14 |
| Dock hit areas | PASS после исправления | У 16 активных dock по 4 tab; в браузере проверены 14→32→27→16. Для tab добавлены явные native hit areas |
| Публичный deployment | NOT RUN | Владелец остановил публикацию до согласования дизайна |

Команды прохода: `node scripts/assemble-penpot.mjs assets`, `node scripts/build-penpot-scenes.mjs`, `node scripts/finish-penpot-design.mjs` (по результатам исправлены совместимость имён/весов шрифта/API), отдельные `assemble-penpot.mjs run design/penpot/*.js`, `node scripts/qa-penpot.mjs`. Выполнялись bundled Node 24.19 и официальный локальный Penpot MCP. Действия браузера проведены через CUA. Статический graph spec не выдаётся за реализацию всех conditional outcomes или API.

## Повторная доводка Penpot · 20.10.2026

| Проверка | Результат | Область доказательства |
|---|---|---|
| `node scripts/audit-penpot-controls.mjs` | PASS |147 native states; missing enabled control actions0, text collisions0, outside text0. Disabled undo первого шага и пустой Send исключены осмысленно |
| Surface audit14/14.dance/14.puppet | PASS | Native clipped parent386×592; photo386×515; CTA ends574 with18px bottom padding; outside descendants0 |
| Map containment | PASS |15 clipped map viewports; в каждом6 roads — непосредственные дети. Настоящий провайдер не проверялся |
| Chat clipping | PASS |7 transcript rails без внутренних drop shadows; composer/dock остаются отдельными |
| Browser chat | PASS |27 suggestion→27.draft Send→28 after-delay→29; «Другое место»→29.followup |
| Browser logo | PASS |27 logo→14 |
| Browser context | PASS |14 time chip→08 row→08.editor preset60→08.selected.short |
| Browser swipe continue | PASS после ремонта anchor |05.ready right circle→видимая плашка, отдельный второй click→08. Manual overlay position раньше уводила плашку вне экрана; заменена bottom-right anchor к кругу |
| Browser feed carousel | PASS |14→14.dance→14.puppet по next, previous→14.dance, Подробнее→21.alt, Назад→та же14.dance. Это click-проверка дизайна, не pointer-drag |
| Реальный drag/form/AI/storage/share | NOT RUN | Native prototype не имеет runtime-интеграций; сценарный click не выдаётся за live выполнение |
| App build/E2E/deploy | NOT RUN в этом проходе | Код приложения не менялся; прежние результаты выше не относятся к новым147 макетам |

Фактически исполнены bundled Node команды `redesign-penpot-swipes.mjs`, `complete-penpot-interactions.mjs`, `run-penpot-list-repairs.mjs`, `run-penpot-editors.mjs`, `finalize-penpot-controls.mjs`, `repair-swipe-overlay.mjs`, `redesign-feed-carousel.mjs`, `clip-map-surfaces.mjs`, `audit-penpot-controls.mjs`, `export-swipe-contract.mjs`, `export-penpot-review.mjs`, а также малые official MCP вызовы по сценарию. Два больших MCP скрипта превысили30s ответного timeout, но фактическое завершение отдельно прочитано через API и затем перепроверено. После этого операции разделены на небольшие batches. Native exports просмотрены для05/08/08.editor/19.selected.culture/14/27/29/29.followup; браузерный clickflow — через CUA.
# Дополнение 20.10.2026: AI и доказательства для презентации

- Единственный разрешённый live-тест серверного `answerSmartAssistant`: GPT-5.5 + `web_search`, HTTP 200, режим `openai`, одна цитата Visit Astana. Личные данные и геопозицию не передавали. Не считать это проверкой публичного AI или браузерного AI-сценария.
- После теста `GET /api/assistant/status`: `available:false`, `reason:TEST_QUOTA_EXHAUSTED`, `remainingTestCalls:0`. Квоту не сбрасывали.
- Chrome, 430×932: фактические скриншоты карты, плана A/B с выбранной вручную публичной точкой, ответа чата по правилам с карточками, афиши, бюджета, свайпов и памяти. Без моков ответов HTTP в этом проходе.
- В dev-логах при переходах карты обнаружена ошибка очистки `MapCanvas`: обращение к `null.getBoundingClientRect`. В этом проходе презентации код карты не менялся. Это открытая ошибка, не статус «без ошибок».
- Презентация v8: финализатор подтвердил 10 слайдов, 0 структурных/геометрических замечаний и повторный импорт PPTX. Все 10 страниц финального PDF просмотрены, наложений и обрезанных блоков не обнаружено. Проверка в нативном PowerPoint не проводилась. Отчёт: `docs/agent-reports/A9-pitch-v8.md`.
