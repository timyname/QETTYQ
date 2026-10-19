# QETTYQ mobile product direction

## Target

The primary frame is iPhone 14 Pro Max at 430 × 932 CSS pixels. The web build stays responsive, but product decisions start from this viewport.

## Reference screens

- `references/iphone-onboarding-v1.png`: 15-choice onboarding, time and budget, tactile card deck.
- `references/iphone-map-v1.png`: map-first discovery, event time markers, assistant dock and bottom sheet.
- `references/iphone-route-chat-v1.png`: short evidence-based chat and a three-stop route.

These images are art-direction references generated with GPT Image Gen. They are not shipped as interactive UI and must not be treated as factual maps or event data.

## Interface grammar

- Winter pearl canvas with deep steppe green as the structural color.
- Chartreuse marks current selection and the next action. Coral is reserved for warnings.
- Liquid glass is a material for controls and sheets. It uses blur, saturation, an inner highlight and a slow specular pass. It never sits behind long body text without an opaque safety layer.
- Map is the primary workspace. Lists and chat become bottom sheets on mobile.
- Modern nomad influence appears in rhythm, route lines and geometric separators. It does not use costume motifs or decorative folklore.

## Components to build

1. `FirstContact`: two-minute promise, time and budget, 15 tactile preference cards.
2. `CityMap`: map camera, numbered event markers, active state, source disclosure.
3. `EventSheet`: event start, venue, price status, source and route action.
4. `AssistantDock`: one-line intent input with short evidence-grounded answers.
5. `RoutePlan`: ordered stops, estimated walk time, facts and unknowns.

## Icons and assets

- Interface icons remain code-native Lucide SVGs so they are accessible, themeable and sharp at any density.
- Map markers are CSS/SVG components, not raster exports.
- Generated imagery is stored in `design/references/`. Product screenshots belong in `exports/screenshots/`.
- Do not extract UI icons from generated mockups. Their geometry is inconsistent and licensing/provenance is weaker than the open-source icon system.

## Data and state ownership

- Guest identity, reactions and undo: server session store with 24-hour TTL.
- POI snapshot: `data/places.json`, sourced from OpenStreetMap and linked to the original object.
- Event pilot snapshot: `src/data/events.ts`, with publisher URL, start semantics and venue coordinates.
- UI state: React client state. The next refactor should move it into a reducer matching `docs/agent-reports/A11-product-logic.md`.
- LLM output may explain ranked candidates only. It must not invent a place, price, opening time or event.

## Google Maps boundary

- The current build opens walking directions through Google Maps URLs without a key.
- Embedded Google Maps requires billing-enabled credentials. Browser and server keys must be separate and restricted.
- Keys live only in `.env.local` or deployment secrets. `.env*` is ignored and example fields remain empty.
- Until a key is supplied, the embedded map uses the OSM fallback and preserves attribution.
