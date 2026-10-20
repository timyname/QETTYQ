# Keyboard, city toast and header — 2026-10-21

Implemented in shared `PilotApp.tsx`, `PilotApp.module.css` and new `use-keyboard-viewport.ts`.

- Keyboard geometry uses both `visualViewport.height` and `offsetTop`; while editing, the app frame follows the visible viewport. A retained unfocused height detects WKWebView layout resize where `innerHeight` shrinks with the viewport. Focus, resize and scroll events are coalesced in animation frames; cleanup removes listeners. Pinch zoom is not treated as a keyboard.
- Existing safe-area variables remain the single source; no additional native keyboard plugin or duplicate bottom safe-area is added. No native keyboard bridge currently exists in the iOS source. Physical iPhone behavior therefore remains a device acceptance check, not a claimed result of browser emulation.
- City notification stays out of document flow: removed feed padding change, retained close action, automatic dismissal after 2 seconds with 350 ms fade. Errors remain manually dismissible.
- Removed broad feed-header blur/backing, keeping individual glass controls fixed in their existing positions.
- Removed provider-disclosure paragraph from chat composer as requested; full provider explanation and switches remain in settings. Provider defaults/opt-outs, explicit server-memory consent and browser geolocation permission are preserved.

## Verification

All API and external requests intercepted; zero paid calls or deployments.

`PORT=3037 node node_modules/@playwright/test/cli.js test tests/e2e/keyboard-overlay.spec.ts tests/e2e/iphone-glass-media.spec.ts --grep 'composer|city toast' --workers=1 --output=output/playwright/keyboard-overlay/results`

**4/4 passed**. Synthetic fixtures cover Safari panning (`height=510`, `offsetTop=64`), WKWebView shrinking `innerHeight` simultaneously, restoration, input bottom at/before 574, hidden/restored navigation, city popup/no heading shift and manual/automatic dismissal. Existing keyboard test now explicitly focuses the input before synthetic resize.

`node node_modules/eslint/bin/eslint.js src/components/PilotApp.tsx src/components/use-keyboard-viewport.ts tests/e2e/keyboard-overlay.spec.ts` — completed without findings.

Full `tsc --noEmit` initially encountered concurrent RoutePlan work (`ChevronUp`, `end`, nullable href); sent to orchestrator for final integrated check. Do not interpret that intermediate run as passing.

Screenshots opened and visually inspected: `output/playwright/keyboard-overlay/safari-offset.png`, `wkwebview-offset.png`, `city-toast.png`. These are Chromium synthetic geometry checks, not physical iPhone screenshots. Re-check on the owner's iPhone with actual keyboard opening, scrolling, sending, closing and returning from background.

Skills used: design-intelligence + ui-systems reference, frontend-design; preserve existing QETTYQ pearl/jade glass vocabulary and remove unnecessary broad chrome. Next.js local `use-client` guide read. No dependencies/root configs or other projects modified.
