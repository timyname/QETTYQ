# A5/A6 · Full-bleed shell and keyboard CSS · 2026-10-21

## Scope and design

Preserve QETTYQ's jade/pearl/lime language: content is edge-to-edge, only actual floating controls are glass. Read AGENTS.md, PRD.md explicitly by sections, design-intelligence SKILL.md and ui-systems.md completely; inspected installed Next CSS guide. No external design code/assets or new dependencies.

Owned changes: `src/components/PilotApp.module.css`, `tests/e2e/safe-area-shell.spec.ts`, this report. No edits to mobile/, global configs, package/lock, shared contracts or another task's dirty files.

## Implemented

- Map/feed/chat/plan use safe-area inset for controls, not scene cropping; absolute transparent header with no background, blur or pseudo-element band. Existing glass city/settings controls remain.
- Chat messages occupy the complete viewport behind header and dock. Real measured footer height becomes internal scroll padding, replacing the external margin that exposed an opaque background strip. The last message still scrolls clear of the composer.
- Text inputs/selects/textarea are at least 16 CSS px even in the map toolbar, preventing iOS focus auto-zoom without disabling accessibility pinch zoom.
- Root integration contract `data-map-keyboard-open=true`: hide navigation island/plan toggle/bottom sheet while typing; map remains full-bleed. Root owns focus/visualViewport/form submission/search centering behavior.
- Root integration contract `article[data-photo-state=none]`: compact pearl editorial card with 80px honest missing-photo strip, readable facts and action; all-missing-photo carousel no longer reserves a portrait hero. Real-photo state unchanged. This does not manufacture media rights or claim broader real photo coverage.

## Checks and evidence

- Scoped ESLint of new test: PASS, exit 0.
- Final `PORT=3037 pnpm test:e2e tests/e2e/safe-area-shell.spec.ts --workers=1`: 4/4 PASS, 5.3s, exit 0. Mobile Chromium 390×844/reduced motion; synthetic 59px top and 34px bottom safe areas. All external requests aborted and all APIs mocked; zero real paid calls.
- Screenshot `output/playwright/safe-area-shell/chat-full-bleed.png` opened and visually inspected: logo below 59px synthetic safe area, floating glass dock/composer, no separate top/bottom opaque bands.
- Screenshot `output/playwright/safe-area-shell/compact-no-photo.png` opened and visually inspected: ~290px pearl card instead of portrait-sized empty photo; 80px honest placeholder, title/facts/CTA retained. Existing raw English category token in placeholder was reported to root for display-name conversion.
- One parallel Next server shutdown interrupted an intermediate run at language selection; no product defect inferred from that environmental failure. Compact-card fixture races initially mutated zero articles before async discovery completed or sampled geometry before a style frame settled; fixed by explicitly waiting for the article and exact 80px media computed height. The final assertions retain the compactness requirement.

## Native boundary (read-only inspection)

The installed Capacitor `CAPBridgeViewController` sets `view = webView`; it is already the root view, so adding guessed constraints/frame adjustments would be redundant. `mobile/capacitor.config.ts` already has `ios.contentInset: 'never'`; Capacitor applies it to `scrollView.contentInsetAdjustmentBehavior`. `mobile/src/styles.css` has a broad `[data-screen]` safe top padding rule. The new stronger component selectors reset that only for full-bleed screens; safe header controls retain the exported native inset.

If gray status area persists after native bundle rebuild, native owner should compare WKWebView root/window bounds, scrollView contentInset/adjustedContentInset, exported safe-top value and loaded CSS build. `isOpaque=false` with clear WebView/scrollView background can remove a native exposed fill but cannot make a cropped map render outside its actual bounds. No native source edited. Physical iPhone/Dynamic Island/keyboard animation are NOT verified by Chromium geometry tests; require rebuilt native app on device. Web publication is orchestrator-owned, not performed by this agent.
