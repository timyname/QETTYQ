# Native MapGL credential-origin guard — 2026-10-21

## Root follow-up after this independent review

The owner subsequently approved the exact `capacitor://localhost` expansion.
Root saved it in the provider console alongside the HTTPS origin and confirmed
both chips after reload. Monthly1000/block remains unchanged (202 observed).
The explicit `QETTYQ_2GIS_NATIVE_ORIGIN_APPROVED` flag defaults false and adds only
that exact native origin after setup. The client accepts exact scheme/host even
when WKWebView serializes Location.origin as opaque, but never arbitrary null.
Old native bundles are kept on OSM by the server unless this separate flag is
enabled. Root tests cover both branches. This updates the original web-only
scope below; it does not constitute physical iPhone SDK verification.

## Evidence and diagnosis

The reported physical iPhone screenshot shows MapGL's invalid-key panel while
application markers remain visible. The same deployed HTTPS web origin worked.
The approved provider restriction covers `https://qettyqapp.anamai.kz`, not a
bundled Capacitor WebView. `mobile/capacitor.config.ts` bundles `www` and has no
remote `server.url`; the iOS default runtime uses `capacitor://localhost`.
Origin mismatch is therefore the leading explanation, not a proven provider
response diagnosis: no secret, provider console or live API request was accessed.

## Implemented boundary

- `browserMapConfig` returns explicit `allowedOrigins` containing only the
  production HTTPS origin. No environment setting can silently broaden it.
- `approvedBrowserMapKey` checks the actual runtime origin before returning the
  key. Missing, malformed, wildcard, native and non-matching origin permissions
  fail closed. Existing MapCanvas invocation requires no integration change.
- The existing disabled-provider branch keeps the working OpenStreetMap map;
  it must remain labelled honestly and retain its provider attribution.
- Explicit HTTP loopback entries are accepted by the pure helper solely so
  offline synthetic SDK tests can run. Production configuration never emits them.
- No key rotation, origin-permission expansion, quota increase, provider-console
  edits, live API requests, native configuration changes or deployment performed.

## Documented API limits

[MapGL initialization](https://docs.2gis.com/en/mapgl/start/first-steps) passes
the browser credential to `Map`. [MapEventTable](https://docs.2gis.com/en/mapgl/reference/interface)
documents `styleloaderror` for failed style loading, but the reviewed event table
does not document a separate invalid-key event or generic `error` event. Thus
an error callback alone is not adequate protection against a vendor key panel.
The origin guard prevents this known native mismatch before SDK initialization.

[Access-key management](https://docs.2gis.com/en/platform-manager/subscription/managing-keys)
documents HTTP Origin/Referer restrictions, IP restrictions, and separate mobile
SDK application restrictions. Enabling this browser MapGL key in native requires
owner-approved restriction changes and confirmation that the provider supports
the relevant WebView origin/header format; it is not equivalent to merely adding
a mobile SDK App ID. No undocumented origin bypass or fabricated Referer used.

## Verification

Commands executed with the bundled Node runtime on PATH:

```text
pnpm exec vitest run tests/unit/dgis-map-browser.test.ts
54/54 PASS, one test file, synthetic/offline

pnpm exec eslint src/server/pilot/browser-map-config.ts src/client/dgis-mapgl.ts tests/unit/dgis-map-browser.test.ts
PASS, exit 0, no warnings
```

Root owns map interaction components and E2E integration. Synthetic MapGL E2E
configuration must explicitly include its loopback page origin in
`allowedOrigins`. Physical iPhone installation and screenshot retest remain a
separate acceptance step; this report does not claim they passed.
