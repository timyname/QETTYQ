# A5/A6 · iPhone safe area and glass controls · 21 October 2026

## Scope and visual direction

Preserve QETTYQ's pearl / jade / lemon, image-led Astana identity. Glass belongs to floating controls, navigation and overlays; reading surfaces remain nearly opaque. Manrope remains the shared typeface. No new generated imagery, copywriting claims, provider calls, API or product-state changes.

Read `design-intelligence`, its `references/ui-systems.md`, `frontend-design`, the local Next CSS guide, and PRD §§1, 5, 11, 12, 14. The Windows-only DESIGN_ARSENAL path is unavailable on this Mac; nothing was installed or globally reconfigured.

## Implementation

- `src/styles/device-glass.css`: centralized pearl `#f4f6f2`, jade `#0b6e5d`, deep `#0b332d`, lemon `#cffc55`, font, reflection, depth, blur and press-duration tokens. The orchestrator / native owner integrated the shared stylesheet into their entry points; this agent did not edit mobile files.
- `PilotApp.module.css`: one final device/glass section. Native measured `--qettyq-safe-area-top/bottom` take precedence, browser `env()` is the fallback. Normal screens consume top inset once; absolute welcome/map/plan headers and full-bleed swipe/detail chrome use their own safe offsets. Backgrounds remain edge-to-edge.
- A shared 20px control / 24–28px panel curvature family; icon buttons stay circular. `corner-shape: squircle` is progressive enhancement behind `@supports`, with rounded-rectangle fallback. This is CSS styling, not a claim to Apple's native Liquid Glass API.
- Primary actions use the approved lemon glass fill, controls retain a restrained reflective edge, shadows remain low contrast. Focus rings and reduced-motion behavior remain intact. Coarse-pointer text fields use 16px type to avoid iOS focus zoom.
- Header, map filters, progress controls, notice dismissals and memory toggles receive at least 44px targets. Composer's send target stays 44px. Captions and mandatory map/source credits are not removed.
- The dock is 78px, inset 12px above the measured bottom system area. Highlight geometry remains exactly 8px inset / `(width - 16px)/4`, matching existing drag calculations. A more-specific selector prevents native broad `[class*="dock"]` CSS from shrinking its highlight into a line.
- Follow-up request: feed content now scrolls across the entire viewport behind an absolute glass header and a more translucent dock. Its initial content padding and final scroll padding keep actions reachable. The dock becomes more transparent only when backdrop filtering is supported; readable text stays opaque.
- Follow-up chat contract: CSS for the root-owned direct-child `chatDockPanel`, compact initial suggestions and first-send disclosure is integrated. Composer and 78px navigation share one external glass surface; child controls do not add a second blur/shadow. The main message area reserves the footer's **observed actual height**, not a guessed disclosure height. The plate enters by 14px over 220ms on mount; reduced motion disables it. With the keyboard open, navigation hides and the footer moves to the resized viewport bottom. Root owns JSX, consent state and API behavior.
- The Astana button explicitly uses deep-jade text and WebKit text-fill rather than Safari's default blue. Notice/error banners use a coherent readable glass surface and 44px dismissal; feed reserves room for an up-to-88px scrollable notice instead of covering its heading.
- Map GPS control moves to the left, separate from right-side zoom/compass controls and the bottom event sheet. Header, attribution and overlays share the measured top inset.
- `MapCanvas.tsx`: the two fit-bounds padding sites add actual computed application top padding and a resolved, hidden bottom-padding probe. No unresolved `calc()` is parsed as a number. No map geometry, routing or provider contract changes.
- `RoutePlan.module.css`: route title, credits, controls and panel use the same measured safe areas. In short landscape viewports the whole route panel scrolls, preserving warnings and consent. At landscape widths of at least 600px the plan uses a split map/title-left, panel-right layout (up to 900px total), including horizontal safe areas. The expanded main action is sticky inside the panel rather than overflowing beneath the dock; compact actions remain in normal flow so they do not conceal the summary.
- `RoutePlan.tsx`: separately approved tiny UI-only change adds a panel ref and resets its scroll position when collapsing, so the compact summary returns after reading long details. No route/date/budget/state contract changes.

Foreign iOS state restoration, authentication, PWA, media-provider and documentation edits were preserved. This agent did not modify `PilotApp.tsx`, mobile files, API/server files, package/configuration, credentials, deployment or Git history.

## Button / transition review

| Area | Checked behavior / invariant |
| --- | --- |
| Welcome / language | One welcome action; first-language choices remain the existing full-screen gate. Logo stays below measured top area. |
| Interests | Full-width card, 15 decisions, undo restores the prior decision, skip proceeds to conditions; no people-rating semantics added. |
| Conditions / location | Permission denial does not invent an origin; manual point cancel returns to conditions. Existing same-screen location behavior is preserved. |
| Feed / detail | First card action remains reachable above dock; detail/back/plan transitions use existing handlers. Illustration disclosure remains visible. |
| Map / route | Dock/map/back controls remain tappable. Unknown cost/time and routing consent are not concealed to obtain a prettier layout. Landscape action no longer crosses the dock. |
| Chat | Composer stays above the dock; send remains 44px; expanded assistant consent and media can scroll without moving the header. No new AI or Google permission is silently enabled. |
| Profile / settings | Settings open normally, logo returns to the feed, memory toggles keep explicit opt-in behavior and larger touch targets. |
| Dock | Click targets and drag highlight share the same geometry; selected tab is a filled glass/lemon panel, not a decorative line. |

## Verification

Commands and final independent QA results are recorded below after the final frozen run. Previous 44/44 full-web-suite success is documented in `A-ui-compact-route-20261021.md`; it predates this glass stage and is not presented as validation of these new changes.

Intermediate checks: TypeScript and scoped ESLint passed before QA's newest test additions. Scoped unit checks (`i18n-interface`, `map-style`, `city-map`, `route-timeline`) returned 17 passed / 1 failed: an independent concurrent PilotApp copy change introduced untranslated `· Астана`; the orchestrator was notified. An initial invocation used a nonexistent `i18n.test.ts` filename and correctly returned “No test files found”; this is not counted as a passing check.

After the orchestrator's dictionary correction, the same four unit files passed **18/18**. `eslint src/components/MapCanvas.tsx src/components/RoutePlan.tsx` and scoped `git diff --check` passed. A subsequent whole-project TypeScript run caught a new QA-test typing error (`iphone-glass-media.spec.ts:276`, `.disabled` on `HTMLElement | SVGElement`); its test owner was notified, so that intermediate run is not reported as green.

Existing street-routing browser regression: **2/2 PASS**, one worker, 8.5s, command `playwright test tests/e2e/street-routing.spec.ts --workers=1 --reporter=list --output=output/playwright/glass-street-20261021-results`. It checks explicit consent, one expired-session retry, synthetic street metrics, geometry clearing, provider refusal without automatic retry, and action/dock separation at 360/390/430px. The route response is synthetic; it is not a new live routing smoke. MapLibre emitted existing missing `office`/`atm` sprite warnings; no zero-console-error claim is made.

A8's frozen safe-area / landscape / media baseline passed 8/8 tests, including actual hit-testing of the compact route summary (not bounding boxes alone). During review, the first landscape fix passed geometry while sticky actions still concealed the summary; visual inspection caught it, and the final split layout corrected it. See `A-iphone-media-qa-20261021.md`.

The additional feed-under-glass case passed after fixing a real specificity conflict: the old generic notice rule had placed a Save banner over the header. Feed is now excluded from that old flow rule; banner placement, reserved content room, translucent scroll and deep-jade city text were checked. A separate native-inset synthetic routing test passed: FOSSGIS / correction attribution remains hit-test visible above the expanded panel. No routing network call was made. These are separate targeted passes, not a claim that the final full 10-case suite has already passed.

After root's new chat JSX integration, the targeted native-entry `dock navigation` case passed **1/1** in 1.5s (`PORT=4176 playwright test tests/e2e/iphone-glass-media.spec.ts -g 'dock navigation' --workers=1 --reporter=list --output=output/playwright/glass-chat-20261021-results`). The refreshed `chat-430.png` was visually inspected: a single composer/navigation plate, safe header, readable cards, 44px send, working detail/plan/map/chat/settings/logo transitions. All API/external requests remain intercepted. Final whole-suite / new first-send API QA belongs to A8 after integration freeze.

After the QA test owner's typed element guard, whole-project `tsc --noEmit` and scoped MapCanvas/RoutePlan ESLint passed again. All owned changes pass `git diff --check`.

Independent A8 uses the actual native Vite entry point and shared PilotApp at port 4176. API requests and external network are mocked/blocked before navigation. Safe insets (58px top / 62px bottom), Google photo and provider responses in this suite are explicitly synthetic fixtures. Screenshots are not physical-device or live-provider proof.

Screenshot directory: `output/playwright/iphone-glass-media/`. Physical-device follow-up remains the native owner's responsibility; this agent has only inspected the prior native safe-area screenshot, not a new physical-device build.

## Known limits

- No new physical iPhone / WKWebView run was performed by this agent; the final native build must be opened on-device with the real keyboard and accessibility text size.
- Native keyboard sizing needs independent validation: mobile's existing `[data-screen] { height:100% !important }` can override an inline `visualViewport.height` unless WKWebView physically resizes its container. This was reported to the orchestrator / native owner; this agent did not change mobile CSS or assert that a synthetic data attribute proves real keyboard behavior.
- Browser landscape uses the split route layout with an internally scrolling compact panel. Other screens retain the existing narrow mobile shell; this is not a complete tablet redesign.
- The offline QA deliberately does not demonstrate live tiles, paid Google media, AI or routing. Their factual status belongs to the separate provider reports.
