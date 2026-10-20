# QETTYQ pitch v8

20 October 2026. Presentation and PDF skill workflow used. Existing v7 source, copy and all ten rendered slides inspected before editing. The v7 PPTX was also imported with Artifact Tool for structure inspection: 10 slides, one master, seven layouts. Original versions remain untouched.

## Outputs

- `exports/QETTYQ_APP_pitch_v8.pptx` — editable text with eight embedded images, 10 slides, 1280×720 canvas.
- `exports/QETTYQ_APP_pitch_v8.pdf` — 10 pages, approximately 960×540 pt.
- `presentation/build-deck-v8.mjs` — standalone Artifact Tool source.
- `presentation/copy-v8.md` — full Russian narration and source notes.
- `exports/presentation-preview-v8/slide-01.png` through `slide-10.png` — Artifact Tool previews.
- `exports/presentation-preview-v8/pdf-slide-01.png` through `pdf-slide-10.png` — rendered final PDF pages.

## What changed

Preserved the jade/pearl palette, 16:9 dimensions, Arial type and ten-slide narrative of v7. Removed all Penpot images. Seven fresh browser captures supplied by the main agent replace mockups: swipe, budget, map, route, chat, live feed and privacy. Those captures show the actual local build at 430×932, not a deployed update. The cover keeps the existing generated Astana illustration.

Slide 4 deliberately contains editable explanatory text, not a fabricated successful personal recommendation. The checked personal context returned no matches. General event listings remain visibly distinct from budget-constrained personal recommendations.

Map is MapLibre/OpenFreeMap, not Google Maps. Route estimates are coordinate-based and approximate. There is no internal road-route line. External navigation is available. The route screenshot uses a manually selected public start, not a person's GPS.

The chat screenshot is a real deterministic response. A separate successful local GPT-5.5/server/web-search test is described on slide 7 and in notes, based on `docs/agent-reports/A-ai-live-test-20261020.md`. The screenshot is not represented as that AI reply. Public AI is still OFF at export. A later owner authorization of a total public-AI budget up to $10 is permission, not evidence of implementation, so the exported status was not changed speculatively.

Sxodim ingestion is a limited source with hourly cache refresh on request, not cron and not a full-city coverage claim. No fixed number of events is promised. Images remain labeled project illustrations rather than copied posters. The local/public UI boundary appears on the cover, in notes and on slide 10.

## Verification

- `node --check presentation/build-deck-v8.mjs`: PASS.
- Private preview builds completed before finalization. Slides 4, 7, 8 and 10 were corrected and re-inspected before creating final files.
- `node presentation/build-deck-v8.mjs`: exit 0.
- Finalizer: 10 slides, 0 integrity findings, 0 layout findings, 0 layout warnings, Arial reference font verified against v7, Artifact Tool re-import PASS.
- PDF: the bundled Artifact Tool PDF exporter hit its known `#standard-fonts/Helvetica` issue. The script converted the exact validated PPTX through bundled LibreOffice with a private profile. Conversion succeeded. Fontconfig emitted cache-directory warnings; these are not layout validation failures.
- `pdfinfo`: 10 pages, no encryption or JavaScript.
- `pdftoppm -scale-to 1280 -png`: exit 0.
- Every final PDF page inspected individually at 1280×720. No unintended overlap, clipping, missing picture, blank screen placeholder or footer collision observed. Screenshot source credits remain visible. Checked changed slides against v7 composition.
- Native PowerPoint application rendering was not checked. Presentation QA does not certify application production readiness. The main agent separately reported a map cleanup/resize issue during navigation, so no “everything works without errors” claim appears in the deck.

## Boundaries

No source-code changes outside presentation material, new images, paid API calls, push, deploy, application submission or public AI activation performed in this task.

Validation receipt: `.codex-presentations/qettyq-v8/QETTYQ_APP_pitch_v8.validation.json`.

PPTX SHA-256: `df2e5d0274d3f8a171c3ebcacbd10a709c704d6362e0de25aae1baf5de2236bd`.
