# MapCanvas: интерактивная векторная карта

20 октября 2026 года. Изменены только новые MapCanvas.tsx, MapCanvas.module.css, map-style.ts, tests/unit/map-style.test.ts и этот отчёт. PilotApp, CityMap, корневая CSS, конфиги, пакеты и Site не менялись.

## Реализация

- MapLibre GL JS6.15.0 загружается динамически в client effect. Карта интерактивная: pan, zoom, вращение/наклон, keyboard, отдельные44px zoom/compass controls.
- Только фиксированный style URL `https://tiles.openfreemap.org/styles/liberty`. Fetch JSON с AbortController8s, fallback при ошибке import/style/WebGL. Дополнительный watchdog15s на первый load.
- Копия styleJSON перекрашивает vector paint: фон#F4F6F2, паркиsage, вода#b5d9d0, дорогиwhite, надписи#42645b. Сохраняются source URLs, source attribution, glyphs, sprite, text-field и геометрия. CSS-filter к raster не применяется.
- Одиночные DOM-маркеры с небольшим SVG категории, нефрит и лайм для выбранного. Кластеры используют существующий `clusterMapPoints`. На максимальном zoom совпадающие координаты открывают список отдельных точек.
- Данные title/date попадают только в textContent/title/aria-label. Popup строится через DOM, внешнего HTML нет. Встроенные attribution anchors являются фиксированными константами, source attribution обрабатывает штатный MapLibre control.
- Origin отображается только при явно переданном prop. Геолокацию компонент не запрашивает и не сохраняет. Координаты проверяются на finite/range.
- Route geometry не рисуется: только реальные переданные точки. Никакой имитации линии по улицам или точного ETA.
- Fallback автоматически рендерит неизменённый CityMap/Leaflet с явным сообщением. `data-map-engine` равен maplibre или fallbackleaflet.
- ResizeObserver, map, DOM markers, timers и fetch освобождаются при unmount/failure. Reduced motion учитывается для управления и fitBounds.

## Интеграция владельцем

Props совместимы с текущим CityMap:

`{points, activeId?, onSelect?, onPick?, origin?}`

MapCanvas занимает100% ширины/высоты parent. Главный агент импортирует `maplibre-gl/dist/maplibre-gl.css` в layout. Для floating overlay есть переменные CSS:

- `--map-controls-top`, default180px.
- `--map-notice-top`, default120px.
- `--map-attribution-bottom`, default12px. При sheet поверх карты выставить её на фактическую высоту sheet+нижних элементов. Атрибуцию нельзя скрывать листом.

Атрибуция OpenFreeMap, OpenMapTiles, OpenStreetMap добавлена штатным control внизу слева. Она не схлопывается и переносится при недостатке ширины. Leaflet fallback также учитывает переменную высоты.

## Особенность worker MapLibre6

Проверено по установленному ESM: default worker URL строится как `./maplibre-gl-worker.mjs` относительно import.meta.url. После Next/Vite bundling это может указывать на отсутствующий файл рядом с чанком.

Официальный OpenFreeMap quickstart прямо показывает Vite setWorkerUrl с `?worker&url`. По подтверждению оркестратора компонент теперь явно вызывает `gl.setWorkerUrl('/assets/maplibre-gl-worker.mjs')` до создания Map. Владелец копирует standalone установленный worker и сохраняет BSD3 license в public/assets. Browser worker после этой интеграции ещё требует фактической проверки.

## Проверки

- `tsc --noEmit`: exit0.
- Scoped ESLint MapCanvas.tsx/map-style.ts: exit0.
- `vitest run tests/unit/map-style.test.ts`:3 PASS. Синтетическая style fixture, без live-сети. Проверены palette, сохранение source/attribution/glyph/sprite/text-field и отсутствие мутации исходника.
- Browser/WebGL/tile/worker QA выполняет владелец после интеграции. Unit-тесты не выданы за работу live-карты.

## Официальные источники

- [OpenFreeMap Quick Start](https://openfreemap.org/quick_start/) — Liberty URL, MapLibre и worker.
- [OpenFreeMap Terms](https://openfreemap.org/tos/) — редакция14.10.2026, as-is, без гарантии доступности. Offline/mass downloading не реализован.
- [MapLibre Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) и локальные d.ts6.15.0 — Map, DOM markers, controls, events.
- Установленный maplibre-gl/package.json: BSD-3-Clause. Новых зависимостей не установлено.
