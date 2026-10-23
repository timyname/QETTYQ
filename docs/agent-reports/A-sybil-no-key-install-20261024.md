# Sybil Swarm · подтверждённая изолированная установка без ключей

24 октября 2026. Пользователь подтвердил именно [nghiahsgs/Sybil-Swarm](https://github.com/nghiahsgs/Sybil-Swarm). Продолжение [read-only аудита](A-sybil-readiness-20261024.md), а не отмена его ограничений.

## Что действительно установлено

Backend Sybil Swarm **0.1.0**, upstream commit **`6f221cc632c7fc4e9212fe2e5acf28a881abc2e0`**, установлен через реальный `pip install '.[dev]'` исключительно внутри отдельного Docker image под **UID10001**. На host Python/npm код Sybil не исполнялся. Upstream source checkout чистый: `git status --short` пуст; код Sybil не исправлялся.

- Локальный image tag: **`qettyq-sybil-review:no-key-20261024`**.
- Итоговый image ID: **`sha256:eb7db2242b092ad9ac2df6e2d286dd5b4fef6c2996bbabd1faba4cf6e92f002e`**.
- Config digest: `sha256:925cd5ab03e306721118f239f442b295ba55c768fc3009d0d532b0feae7dd5ce`.
- Размер image по Docker inspect: **760881924 байта**. Это локальный image, не деплой VPS и не публичная публикация.
- Базовый image при сборке разрешился в `python:3.12-slim@sha256:a0f57064cbdcd6285fa45f51237ab0b35ea8ebaed06a1f5973e89e19dfb86704`, Python3.12.15, Linux/arm64.
- `pip check`: **No broken requirements found**. Это проверка dependency consistency, не полный vulnerability/license audit.
- 82 установленных distributions зафиксированы внутри image в `/opt/venv/installed-packages.txt`, SHA256 **`9ed7097dfbf7d727e2302787e69b576d7ba8039e218c26385a841be5055f8ad2`**. В частности: FastAPI0.162.0, SQLModel0.0.48, litellm1.106.2, OpenAI SDK2.54.0, pytest9.1.1.
- MIT LICENSE включён в image; SHA256 `c0e7ee4a0e235fd99673ae10e41beb822652dbb41a94913902891483a8239772`.

Рабочая область: ignored `.sites-runtime/sybil-review-rmz3ln/`. Собственный Dockerfile: `Dockerfile.no-key`, SHA256 `e657396871759942008c58a2a79c787cc19b470c9e92fbb03f5edfbd8c9d65c1`. Собственные offline checks: `review_checks.py`, SHA256 `8911dba33d76d09028394dd00679dc29d886c4d39043f36cc87b453b09305e74`.

`.dockerignore` — allowlist: только upstream LICENSE, backend pyproject/app/tests и наши offline checks. Ни `.env.example`, ни `.env.local`, QETTYQ DB, SSH, пользовательский browser profile, домашний каталог, Docker socket или secret mount в image/runtime не передавались. Сборка использовала сеть только для базового image/PyPI dependencies; runtime сеть полностью выключена.

## Выполненные проверки

**10/10 offline tests PASS**: четыре родных health/text/schema теста плюс шесть аудиторских проверок. Первый проверочный запуск:1.29s, exit0. Повторный запуск итогового image с default CMD также PASS.

Проверено фактически:

1. ASGI `/health` отвечает200; синтетическая disposable SQLite создаётся в tmpfs.
2. Text parsing и request schema работают на синтетическом тексте.
3. Все три provider credentials отсутствуют, API base пуст; UID действительно10001.
4. Запуск simulation без ключа возвращает400 до provider execution.
5. Прямой loopback URL блокируется parser guard без внешнего доступа.
6. Mocked persona generation вызывает только локальный AsyncMock.
7. Локальная арифметика aggregator проверена на двух synthetic responses.

**Два зелёных regression-reproduction checks не означают исправление:** они подтвердили, что при `EXPERT_AGENTS=2` default generation на10 personas всё равно назначает10 EXPERT, и что chat system prompt выбрасывает KeyError при `.format()` ещё до LLM. Эти upstream bugs **остались неисправленными**. Следовательно10/10 здесь — прохождение ограниченного offline harness, не «Sybil полностью исправен» и не «QETTYQ прошёл проверку Sybil».

## Фактическая изоляция запуска

Использован одинаковый sandbox для test run и проверки package/license fingerprints:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=128m,mode=1777 \
  --memory 1g --memory-swap 1g --cpus 1 --pids-limit 128 \
  --user 10001:10001 qettyq-sybil-review:no-key-20261024
```

Нет опубликованных портов, host mounts, persistent volumes или фонового сервиса. Контейнеры `--rm` завершились; синтетическая SQLite/tmpfs уничтожены с ними. Локальный image и isolated source сохранены для следующего этапа.

Default CMD выполняет только:

```sh
python -m pytest -c /opt/sybil/pyproject.toml -v -p no:cacheprovider \
  tests /opt/review/review_checks.py
```

Команда сборки (из isolated workdir):

```sh
PATH=/Users/phonelab/.docker/bin:/Applications/Docker.app/Contents/Resources/bin:/usr/bin:/bin \
  docker build --file Dockerfile.no-key --tag qettyq-sybil-review:no-key-20261024 .
```

Сборка сначала встретила две **не скрытые** ошибки окружения/собственного Dockerfile: отсутствующий credential helper в PATH, затем PermissionDenied для nonroot pip egg-info в root-owned workdir. Исправлены только PATH конкретной команды и создание/chown isolated workdir до USER. После этого фактическая установка завершилась успешно. Docker выдаёт3 `SecretsUsedInArgOrEnv` предупреждения из-за имён API-переменных; их значения намеренно пустые, что отдельно проверено runtime. Секретов в layers нет.

## Что не сделано и следующий gate

- Frontend не устанавливался и не запускался: этот этап не даёт browser automation и не требует ещё одного dashboard/порта.
- Ни один реальный LLM вызов или QETTYQ review simulation не запускался; оплачиваемые provider requests **0**. Existing Google/OpenAI budgets не увеличены и не использованы этим этапом.
- Sybil не установлен как Codex plugin/skill/global package и не подключён к production QETTYQ. QETTYQ код/config/DB не менялись этим агентом.
- Не получены реальные пользовательские отзывы, конверсия или прогноз спроса. Возможный будущий отчёт будет только **synthetic product hypotheses**.
- Перед любым key-enabled запуском нужны общий с QETTYQ атомарный USD hard cap/usage ledger, bounded token/retry budgets, устранение tier/chat ошибок, безопасный credential gateway и соответствующая авторизация. Нельзя просто передать production key этому контейнеру или считать10 агентов гарантией лимита.

Функциональный QA приложения по-прежнему выполняется существующими QETTYQ unit/integration/E2E и физическим iPhone; Sybil сам не умеет кликать по приложению, проверять keyboard/map/persistence или снимать screenshots.
