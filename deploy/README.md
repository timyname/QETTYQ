# QETTYQ · isolated VPS deployment

Scope: existing Hetzner x86_64 server; preserve all other apps, proxy hosts,
mail, DNS records, certificates and access. No server-side application build.

## Layout and isolation

- `/opt/qettyq/releases/compose.vps.yaml`: app-only Compose definition.
- `/opt/qettyq/secrets/runtime.env`: owner-approved existing OpenAI key, runtime
  only, mode0600, never part of Git/image/build arguments.
- `/opt/qettyq/secrets/d1-ledger.json`: verified old ledger import proof,
  root-owned/group-readable by UID10001. Missing proof disables paid AI.
- `/opt/qettyq/data/qettyq.sqlite`: WAL/FULL persistent application database.
- `/opt/qettyq/backups/`: verified daily SQLite snapshots, seven-day retention.
- App UID/GID10001; read-only root filesystem, dropped capabilities, no-new-privileges,
  bounded tmpfs, 640MiB memory /0.65CPU /120PIDs, rotated logs.
- `127.0.0.1:3187` is diagnostics only, never bound publicly. The existing
  `proxy_net` network permits the reverse proxy to reach `qettyq-app:3000`.
- Nginx Proxy Manager custom include points only to `/data/nginx/qettyq/*.conf`.
  Existing generated proxy hosts and `custom/http.conf` are not rewritten.
- Only hostname `qettyqapp.anamai.kz`; HTTP redirects to HTTPS except ACME.
  Separate Certbot config/work/log directories under `/data/qettyq-*`.

## Build / release

```sh
docker build --platform linux/amd64 -t qettyq:RELEASE .
# Transfer this exact image through authenticated, host-pinned SSH.
# Upload compose.vps.yaml; inject only the approved runtime secret by stdin.
QETTYQ_IMAGE=qettyq:RELEASE docker compose -f /opt/qettyq/releases/compose.vps.yaml up -d --no-build
curl --fail http://127.0.0.1:3187/api/health
# Refresh only the proxy workers' upstream DNS after recreating this app.
docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
```

The Docker context is an allowlist. `.env*`, SSH keys, local databases, exports,
user documents and Sites credentials never enter the context. Base Node24 image
is pinned by digest; lockfile and reviewed pnpm build-script policy are required.

Freeze the previous AI writer **before** exporting D1. Keep the same approval ID
and all reservations, including failed/unknown ones. Do not fabricate an empty
proof, reset the SQLite database or switch to volatile accounting. Plain public
GPT-5.5 evidence generation remains within the original $10 application approval;
hosted web search is disabled. This is not an account-wide OpenAI billing cap.

## Proxy / certificate

Install `qettyq-http.conf` only after the app passes its private health check.
Test the complete proxy with `docker exec nginx-proxy nginx -t` before graceful
reload. Create only the approved A record; do not change apex/MX/TXT/NS.
Issue a domain-only webroot certificate using the existing Certbot binary:

```sh
docker exec nginx-proxy /opt/certbot/bin/certbot certonly --webroot -w /data/qettyq-acme \
  -d qettyqapp.anamai.kz --cert-name qettyqapp.anamai.kz \
  --config-dir /data/qettyq-letsencrypt --work-dir /data/qettyq-certbot-work \
  --logs-dir /data/qettyq-certbot-logs --non-interactive --agree-tos --register-unsafely-without-email
```

Then replace **only** the QETTYQ HTTP bootstrap config with `qettyq-https.conf`,
test/reload, and verify normal certificate validation (never `curl -k`).
Install only `qettyq-{cert-renew,backup}.{service,timer}` and enable these timers.
Verify one backup/integrity check and Certbot renewal dry run. No existing cron,
systemd service or proxy certificate should be edited/restarted.

## Rollback / recovery

Before updates, retain the previous QETTYQ image and verified database backup.
Restart only this Compose service with the previous image tag. Never prune other
containers/images or restore an old AI ledger: doing so could reset approved spend.
Restore app data only with a reviewed reconciliation of all AI reservations.
Keep backups private: opt-in profile/dialogue/visits are durable personal data.
Reconcile consent/expiry/deletion when restoring; backups retain data at most
seven days. Never restore deleted profiles silently or roll back AI spend.

Owner update, 2026-10-21: retain the current QETTYQ SSH key for future work.
The private key stays in ignored local runtime storage with mode0600; do not
print, commit or copy it into images. Host-key pinning is mandatory. This access
does not authorize changes to other projects. The previous release's temporary
key was removed; do not remove the new retained key as routine cleanup.

Runtime availability and actual release evidence are recorded in
`../docs/STATUS.md` and `../docs/TEST_REPORT.md`, not inferred from these instructions.
