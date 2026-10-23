# Sybil Swarm: read-only readiness review

Исторический checkpoint до подтверждения репозитория. Позже пользователь подтвердил этот repo; отдельная установка без ключей и offline-проверки завершены, см. [итоговый отчёт](A-sybil-no-key-install-20261024.md). Ниже сохранены результаты первоначального read-only этапа. Платная продуктовая симуляция не запускалась.

Дата проекта: 24 октября 2026. Кандидат, найденный оркестратором: [nghiahsgs/Sybil-Swarm](https://github.com/nghiahsgs/Sybil-Swarm). **Пользователь пока не подтвердил точный репозиторий**: это проверка конкретного кандидата, не утверждение, что название однозначно определяет именно его.

Зафиксирован commit **`6f221cc632c7fc4e9212fe2e5acf28a881abc2e0`**. Исходники получены `git clone --no-checkout --depth 1` с `core.hooksPath=/dev/null` в ignored `.sites-runtime/sybil-review-rmz3ln/source`. Содержимое читалось через `git show`/`git grep`; код проекта, install/build/start/test команды **не исполнялись**. Секреты QETTYQ не читались и не передавались. Платных запросов не было.

## Главный вывод

Это **симулятор мнений синтетических покупателей**, не инструмент функционального браузерного QA. Он может сформулировать продуктовые гипотезы и возражения по описанию QETTYQ. Он не может на основании имеющегося кода доказать, что работает клавиатура iPhone, карта, фотографии, перестановка точек, RAG, сохранение или удаление памяти.

В `backend/app/services/input_parser.py` URL загружается `httpx`, затем BeautifulSoup извлекает title, meta description, до10 заголовков и до2000 символов первых20 абзацев. JS не исполняется. В исследованном дереве нет Playwright/Puppeteer/Selenium, click/navigation сценариев или screenshots. Главная страница JS-приложения может дать такому сборщику только оболочку и метаданные.

Далее `persona_generator.py` создаёт personas через LLM, `simulation_engine.py` получает их письменные оценки, `aggregator.py` считает долю сгенерированных `purchase_decision` и синтезирует отчёт. Эта доля **не измеренная конверсия настоящих пользователей**, не прогноз с проверенной калибровкой и не показатель прохождения тестов приложения. В презентацию QETTYQ её нельзя переносить как реальную бизнес-метрику.

## Лицензия и зависимости

- Корневая `LICENSE`: MIT, copyright2026 Sybil Swarm Contributors. Использование/изменение допустимы с сохранением notice; гарантий нет. Это не аудит лицензий всех транзитивных пакетов.
- Python>=3.11; backend объявляет FastAPI, uvicorn, litellm, SQLModel, pydantic-settings, httpx, BeautifulSoup, tenacity, sse-starlette с нижними границами, **без lockfile/точных hashes**. `llm_client.py` фактически импортирует `openai.AsyncOpenAI` напрямую, хотя README описывает litellm и пакет `openai` не объявлен прямой зависимостью: запуск зависит от транзитивного окружения.
- Frontend: Next16.1.6, React19.2.3 и другие пакеты; package-lock v3 содержит778 package entries. Все обнаруженные resolved URLs относятся к registry.npmjs.org. Это не доказательство безопасности содержимого.
- Lockfile отмечает install scripts у `msw2.12.10`, `sharp0.34.5`, `unrs-resolver1.11.1`. Корневых install lifecycle scripts в frontend/package.json нет. Перед установкой нельзя автоматически разрешать транзитивные lifecycle scripts без отдельной проверки.
- Makefile `install` выполняет editable pip install и npm install. Оригинальные Dockerfiles выполняют pip/npm install и Next build. Они **не запускались**. Docker образы/зависимости не pinned по digest/hash.

## Бюджеты: запуск с текущими ключами пока не допустим

В изученном коде **нет** общего USD hard cap, persisted cost ledger, атомарной резервации расходов, учёта usage, ограничения output tokens или общего лимита числа симуляций/чат-сообщений. Semaphore ограничивает параллельность, но не суммарные расходы. QETTYQ Google/OpenAI budgets автоматически в чужое приложение не переходят.

`llm_call` повторяется до3 раз, `llm_call_json` оборачивает его ещё до2 раз: возможно до6 внешних wrapper attempts для одной JSON-операции, плюс не настроенные явно retries SDK. Каждый вызов имеет timeout120s. Chat использует expert model напрямую, вне общего semaphore и без общего расходного ledger. Нельзя считать `TOTAL_AGENTS=10` денежным ограничением.

**Статически выявленный баг tiers:** `run_simulation()` не передаёт `settings.expert_agents` в `generate_personas()`. Последний использует default `expert_count=10`. Поэтому при минимальном запросе `total_agents=10` все10 персон попадают в EXPERT tier, даже если `.env` содержит `EXPERT_AGENTS=2`. Report generator при этом считает tiers из settings, а не фактических записей: отчёт может неверно указывать разделение bulk/expert.

Для10 агентов нормальный pipeline планирует минимум1 persona generation+10 evaluations+1 synthesis, без учёта повторов и дополнительного чата. Цена и остаток общего разрешённого бюджета **не измерялись**, нулевая стоимость не предполагается. README рекламное заявление о бесплатных Qwen tokens не проверено и не является основанием подключать нового провайдера.

## Дополнительные эксплуатационные риски до установки

1. `input_parser.py` проверяет DNS адрес только исходного URL, затем `httpx` следует redirects. Redirect targets не перепроверяются; отсутствует bounded response size до загрузки HTML и полный запрет внутренних/зарезервированных IPv6 диапазонов. Для пилота предпочтителен **только текстовый sanitized product brief**, URL-fetch отключить, исходящие соединения ограничить allowlist proxy.
2. Simulation REST/WebSocket endpoints не защищены логином/ключом/rate limit. Их нельзя выставлять на публичный домен. Compose по умолчанию публикует `8000:8000` и `3000:3000` на всех интерфейсах и включает restart unless-stopped.
3. Compose монтирует backend source read-write и env file. Так нельзя подключать QETTYQ repo, его SQLite, SSH, домашний каталог, browser profile или `.env.local`.
4. `.env.example` предлагает сторонний OpenAI-compatible API base. Нельзя копировать QETTYQ production key в такую конфигурацию: тогда секрет и запросы уйдут на указанный сторонний endpoint. Только проверенная provider/base allowlist, либо вообще без ключей.
5. Нет готового offline deterministic fake-provider режима. Startup создаёт SQLite tables; launch simulation без ключа возвращает400. Наличие только health/text/schema tests не доказывает реальный end-to-end pipeline.
6. Статический дефект chat prompt: `CHAT_SYSTEM_PROMPT` содержит выражение `{"Would buy" if purchase_decision else "Would NOT buy"}` внутри строки, которая затем обрабатывается `.format()`. Это не исполняемое Python expression, а неизвестное format field — вероятен KeyError ещё до LLM. Требуется отдельный unit test/fix.
7. Frontend Compose задаёт `NEXT_PUBLIC_API_URL=http://backend:8000` только runtime environment после Next build. Браузер снаружи Docker не обязан разрешать hostname backend, а Next public env обычно определяется сборкой. Нужна проверка корректной локальной API адресации, не обещание готового Docker запуска.

Это ограниченный read-only code audit, а не доказательство, что найден весь набор дефектов или что проект вредоносен.

## Безопасный план после основного RAG-релиза

1. Подтвердить, что пользователь имел в виду именно этот repo; сохранить pinned commit и MIT notice. Не устанавливать проект как skill/plugin или зависимость QETTYQ.
2. Подготовить отдельный локальный container/workdir без доступа к QETTYQ/SSH/user browser/production DB и **без секретов**. Loopback-only ports, отдельный disposable SQLite, no restart policy, непривилегированный пользователь, без Docker socket, read-only source. Зафиксировать зависимости и проверить license/advisory/lifecycle scripts; Python installation исполняет build backend, поэтому проводить её только внутри изоляции.
3. Сначала no-key install/build/health и offline mocked provider tests. Исправить tier mismatch, prompt formatting, отсутствующий cost cap, output token limit, общий retry budget и API egress. Проверить deny-by-default URLs и отсутствие прямых provider calls вне controlled proxy. Не объявлять mocked отчёт реальным пользовательским исследованием.
4. Если остаётся смысл продуктовой симуляции — использовать только sanitized описание QETTYQ и 10 синтетических personas. Перед любой оплачиваемой попыткой установить **общий с QETTYQ** hard spend ledger/proxy и ограниченную резервацию из уже разрешённого остатка, а не дополнительный бюджет. При неизвестном остатке paid запуск запрещён. Provider key не давать контейнеру, если proxy позволяет scoped credential с ограниченным маршрутом.
5. Результат маркировать «синтетические продуктовые гипотезы». Настоящий QA QETTYQ продолжать имеющимися unit/integration/browser E2E и физическим iPhone, независимо от Sybil.

## Доказательства проверки

Выполнены только `mktemp`, read-only network clone, `git rev-parse`, `git ls-tree`, `git show`, `git grep` и JSON parsing frontend lockfile собственным Node one-liner. Никакой установки/запуска/LLM simulation не проводилось. Исследованные основные файлы: `LICENSE`, README, pyproject, package/lock, Makefile, оба Dockerfiles/Compose, config, input_parser, llm_client, persona_generator, simulation_engine, aggregator, chat_service, API routes/schemas, database, test_health и CI.
