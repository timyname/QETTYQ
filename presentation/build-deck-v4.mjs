import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const W = 1280;
const H = 720;
const C = {
  ink: "#101412",
  forest: "#0D2E28",
  jade: "#087F6D",
  lime: "#C9F46B",
  paper: "#F3F2EC",
  white: "#FFFFFF",
  muted: "#68716D",
  sand: "#E8D8B6",
  sky: "#BDEBF0",
  line: "#D7DDD7",
};

async function imageBytes(path) {
  const bytes = await fs.readFile(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function shape(slide, geometry, position, fill, radius = undefined, line = undefined) {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line: line ?? { style: "solid", fill: "none", width: 0 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function textBox(slide, text, position, options = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    fontFamily: "Arial",
    fontSize: options.fontSize ?? 24,
    bold: options.bold ?? false,
    color: options.color ?? C.ink,
    ...(options.italic ? { italic: true } : {}),
    ...(options.alignment ? { alignment: options.alignment } : {}),
  };
  return box;
}

async function addImage(slide, path, position, fit = "cover", alt = "") {
  const lower = path.toLowerCase();
  const contentType = lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return slide.images.add({ blob: await imageBytes(path), contentType, alt, fit, position });
}

function eyebrow(slide, text, dark = false) {
  textBox(slide, text.toUpperCase(), { left: 70, top: 44, width: 720, height: 24 }, { fontSize: 12, bold: true, color: dark ? C.lime : C.jade });
}

function footer(slide, n, dark = false) {
  textBox(slide, "QETTYQ · ASTANA PILOT · LOCAL PROTOTYPE", { left: 70, top: 682, width: 480, height: 15 }, { fontSize: 9, bold: true, color: dark ? "#9EB0AA" : "#7A837F" });
  textBox(slide, String(n).padStart(2, "0"), { left: 1160, top: 676, width: 50, height: 18 }, { fontSize: 11, bold: true, color: dark ? C.white : C.ink, alignment: "right" });
}

function routeMarks(slide, dark = false) {
  const color = dark ? C.lime : C.jade;
  for (let i = 0; i < 5; i += 1) {
    shape(slide, "ellipse", { left: 870 + i * 55, top: 52 + (i % 2) * 9, width: 8, height: 8 }, color);
  }
}

function title(slide, text, top = 96, width = 1030, dark = false, size = 46) {
  textBox(slide, text, { left: 70, top, width, height: 130 }, { fontSize: size, bold: true, color: dark ? C.white : C.ink });
}

const deck = Presentation.create({ slideSize: { width: W, height: H } });

// 01 Cover
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  await addImage(s, "presentation/assets/qettyq-route-sculpture.png", { left: 600, top: 0, width: 680, height: 720 }, "cover", "Абстрактная современная скульптура маршрута");
  shape(s, "rect", { left: 0, top: 0, width: 750, height: 720 }, C.paper);
  shape(s, "roundRect", { left: 70, top: 54, width: 180, height: 34 }, C.forest, "rounded-full");
  textBox(s, "SMART CITY CASE", { left: 91, top: 64, width: 140, height: 16 }, { fontSize: 11, bold: true, color: C.white });
  textBox(s, "QETTYQ", { left: 70, top: 138, width: 500, height: 80 }, { fontSize: 66, bold: true });
  textBox(s, "Подбор досуга\nв текущем контексте", { left: 70, top: 230, width: 610, height: 180 }, { fontSize: 49, bold: true, color: C.jade });
  textBox(s, "Астана · локальный прототип · 80 POI", { left: 72, top: 460, width: 480, height: 34 }, { fontSize: 19, bold: true });
  textBox(s, "15 выборов интересов · до трёх вариантов · видимые источники", { left: 72, top: 510, width: 500, height: 52 }, { fontSize: 16, color: C.muted });
  textBox(s, "Цель интерфейса: уложить выбор в 2 минуты. Пользовательский замер пока не проведён.", { left: 72, top: 592, width: 500, height: 48 }, { fontSize: 12, color: C.muted });
  footer(s, 1);
}

// 02 Focus
{
  const s = deck.slides.add();
  s.background.fill = C.forest;
  eyebrow(s, "Фокус прототипа", true);
  title(s, "Два сценария, которые можно проверить", 98, 760, true, 48);
  const cards = [
    ["01", "Персональная выдача", "Время, бюджет, стартовая точка и интересы дают 1–3 места."],
    ["02", "Карта событий", "Четыре статические карточки, маркеры и переход к источнику."],
  ];
  cards.forEach(([n, h, p], i) => {
    const left = 70 + i * 570;
    shape(s, "roundRect", { left, top: 300, width: 530, height: 250 }, i === 0 ? "#153E36" : "#17343A", "rounded-3xl");
    textBox(s, n, { left: left + 32, top: 330, width: 60, height: 44 }, { fontSize: 30, bold: true, color: C.lime });
    textBox(s, h, { left: left + 32, top: 394, width: 430, height: 42 }, { fontSize: 28, bold: true, color: C.white });
    textBox(s, p, { left: left + 32, top: 458, width: 440, height: 70 }, { fontSize: 17, color: "#C7D3CF" });
  });
  textBox(s, "Сценарии существуют отдельно. Их объединение является следующим продуктовым шагом.", { left: 72, top: 594, width: 1000, height: 34 }, { fontSize: 16, bold: true, color: C.sand });
  routeMarks(s, true);
  footer(s, 2, true);
}

// 03 Context screenshot
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  eyebrow(s, "Контекст до поиска");
  title(s, "Время и бюджет становятся условиями расчёта", 88, 720, false, 42);
  const facts = [["120 мин", "доступное окно"], ["5 000 ₸", "бюджет на человека"], ["Байтерек", "ручная стартовая точка"], ["15", "выборов интересов"]];
  facts.forEach(([v, l], i) => {
    const top = 260 + i * 84;
    textBox(s, v, { left: 74, top, width: 210, height: 38 }, { fontSize: 26, bold: true, color: i === 3 ? C.jade : C.ink });
    textBox(s, l, { left: 290, top: top + 5, width: 300, height: 27 }, { fontSize: 15, color: C.muted });
  });
  shape(s, "roundRect", { left: 725, top: 64, width: 390, height: 600 }, C.white, "rounded-3xl");
  await addImage(s, "exports/screenshots/limits-mobile.png", { left: 758, top: 86, width: 324, height: 556 }, "contain", "Экран выбора времени и бюджета QETTYQ");
  textBox(s, "Карточки работают кнопками. Drag gesture пока отсутствует.", { left: 74, top: 610, width: 520, height: 34 }, { fontSize: 13, bold: true, color: C.muted });
  footer(s, 3);
}

// 04 Data
{
  const s = deck.slides.add();
  await addImage(s, "presentation/assets/astana-modern-nomad.png", { left: 0, top: 0, width: W, height: H }, "cover", "Современная визуальная метафора Астаны");
  shape(s, "roundRect", { left: 56, top: 54, width: 570, height: 575 }, "#0B201D", "rounded-3xl");
  textBox(s, "ДАТИРОВАННЫЙ SNAPSHOT", { left: 88, top: 82, width: 390, height: 22 }, { fontSize: 12, bold: true, color: C.lime });
  textBox(s, "80 реальных\nPOI Астаны", { left: 88, top: 126, width: 450, height: 140 }, { fontSize: 54, bold: true, color: C.white });
  const facts = ["OpenStreetMap + Overpass", "координаты, категории, provenance", "ограниченный import script", "data validation в репозитории"];
  facts.forEach((v, i) => {
    shape(s, "ellipse", { left: 91, top: 320 + i * 55, width: 9, height: 9 }, C.lime);
    textBox(s, v, { left: 120, top: 307 + i * 55, width: 410, height: 32 }, { fontSize: 17, color: "#D4DFDB" });
  });
  shape(s, "roundRect", { left: 87, top: 553, width: 474, height: 52 }, "#203B35", "rounded-xl");
  textBox(s, "4 события · static snapshot · не live feed", { left: 112, top: 570, width: 420, height: 20 }, { fontSize: 13, bold: true, color: C.sand });
  footer(s, 4, true);
}

// 05 Retrieval
{
  const s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "Retrieval и объяснение");
  title(s, "Код сначала проверяет допустимость", 88, 940, false, 46);
  const steps = [
    ["01", "SNAPSHOT", "80 POI"],
    ["02", "FILTERS", "время · расстояние · интерес"],
    ["03", "RANKING", "до трёх кандидатов"],
    ["04", "TEXT", "только поля кандидата"],
  ];
  steps.forEach(([n, h, p], i) => {
    const left = 70 + i * 290;
    shape(s, "roundRect", { left, top: 290, width: 250, height: 175 }, i === 3 ? "#DDF58D" : "#EEF2EE", "rounded-2xl");
    textBox(s, n, { left: left + 24, top: 315, width: 45, height: 30 }, { fontSize: 18, bold: true, color: C.jade });
    textBox(s, h, { left: left + 24, top: 365, width: 190, height: 28 }, { fontSize: 18, bold: true });
    textBox(s, p, { left: left + 24, top: 410, width: 200, height: 40 }, { fontSize: 14, color: C.muted });
  });
  shape(s, "roundRect", { left: 70, top: 515, width: 1140, height: 98 }, C.forest, "rounded-2xl");
  textBox(s, "Детерминированный режим работает без ключа", { left: 102, top: 539, width: 470, height: 30 }, { fontSize: 20, bold: true, color: C.white });
  textBox(s, "Адаптер OpenAI есть в коде. Live RAG-вызов в текущей среде не подтверждён.", { left: 102, top: 574, width: 850, height: 24 }, { fontSize: 14, color: "#BED0CA" });
  footer(s, 5);
}

// 06 Results
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  eyebrow(s, "Ответ пользователю");
  title(s, "Результат показывает\nисточник и неизвестные поля", 88, 560, false, 39);
  textBox(s, "Пример текущей выдачи", { left: 72, top: 252, width: 340, height: 32 }, { fontSize: 18, bold: true, color: C.jade });
  const facts = ["1–3 конкретных места", "расстояние от старта", "приблизительное время", "цена: нужно уточнить"];
  facts.forEach((v, i) => {
    shape(s, "ellipse", { left: 76, top: 318 + i * 60, width: 10, height: 10 }, i === 3 ? "#C38B36" : C.jade);
    textBox(s, v, { left: 108, top: 302 + i * 60, width: 430, height: 34 }, { fontSize: 20, bold: i === 3, color: i === 3 ? "#8B5A14" : C.ink });
  });
  shape(s, "roundRect", { left: 665, top: 54, width: 435, height: 612 }, C.white, "rounded-3xl");
  await addImage(s, "exports/screenshots/results-mobile.png", { left: 704, top: 82, width: 357, height: 556 }, "contain", "Экран результатов QETTYQ с неизвестной ценой");
  footer(s, 6);
}

// 07 Map
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  eyebrow(s, "Map-first Astana");
  title(s, "Карта даёт контекст без закрытых API", 82, 850, false, 43);
  shape(s, "roundRect", { left: 70, top: 200, width: 780, height: 410 }, C.white, "rounded-3xl");
  await addImage(s, "exports/screenshots/map-desktop.png", { left: 88, top: 218, width: 744, height: 374 }, "cover", "Рабочая карта событий QETTYQ для Астаны");
  const facts = [["Leaflet", "интерактивная карта"], ["OpenStreetMap", "tiles и атрибуция"], ["Google Maps URL", "внешний переход без key"], ["Places / Routes", "не подключены"]];
  facts.forEach(([h, p], i) => {
    const top = 218 + i * 87;
    textBox(s, h, { left: 900, top, width: 280, height: 28 }, { fontSize: 18, bold: true, color: i === 3 ? "#9B6520" : C.jade });
    textBox(s, p, { left: 900, top: top + 34, width: 280, height: 34 }, { fontSize: 14, color: C.muted });
  });
  textBox(s, "Внешняя ссылка не возвращает ETA или geometry в QETTYQ.", { left: 900, top: 575, width: 280, height: 40 }, { fontSize: 12, bold: true, color: C.ink });
  footer(s, 7);
}

// 08 QA
{
  const s = deck.slides.add();
  s.background.fill = C.ink;
  eyebrow(s, "Проверяемая завершённость", true);
  title(s, "Рабочая вертикаль проходит локальные проверки", 92, 980, true, 44);
  const metrics = [["13", "unit + integration"], ["4", "mobile E2E"], ["30", "Given / When / Then"], ["80", "validated POI"]];
  metrics.forEach(([v, l], i) => {
    const left = 70 + i * 288;
    textBox(s, v, { left, top: 280, width: 220, height: 90 }, { fontSize: 62, bold: true, color: i === 2 ? C.sand : C.lime });
    textBox(s, l, { left, top: 375, width: 235, height: 42 }, { fontSize: 16, bold: true, color: C.white });
  });
  shape(s, "roundRect", { left: 70, top: 486, width: 1140, height: 112 }, "#1D2925", "rounded-2xl");
  textBox(s, "PASS", { left: 100, top: 520, width: 100, height: 36 }, { fontSize: 24, bold: true, color: C.lime });
  textBox(s, "build · typecheck · data validation · зафиксированный локальный прогон", { left: 220, top: 522, width: 800, height: 34 }, { fontSize: 19, bold: true, color: C.white });
  textBox(s, "30 сценариев являются матрицей требований, а не заявлением о 30 автотестах.", { left: 220, top: 559, width: 800, height: 24 }, { fontSize: 12, color: "#AEBBB6" });
  footer(s, 8, true);
}

// 09 Trust
{
  const s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "Privacy и неопределённость");
  title(s, "Граница данных видна пользователю", 88, 850, false, 46);
  const items = [
    ["UNKNOWN", "Неизвестная цена не считается бесплатной."],
    ["LOCATION", "Точные координаты не нужны модели и не должны попадать в URL."],
    ["SESSION", "Гостевая сессия живёт 24 часа."],
    ["DELETE", "Backend умеет удалить данные. Кнопка в UI пока отсутствует."],
  ];
  items.forEach(([h, p], i) => {
    const left = 70 + (i % 2) * 570;
    const top = 260 + Math.floor(i / 2) * 170;
    shape(s, "roundRect", { left, top, width: 530, height: 135 }, i === 0 ? "#F0E7D4" : "#EDF2EE", "rounded-2xl");
    textBox(s, h, { left: left + 28, top: top + 24, width: 160, height: 28 }, { fontSize: 15, bold: true, color: i === 0 ? "#8B5A14" : C.jade });
    textBox(s, p, { left: left + 28, top: top + 61, width: 455, height: 57 }, { fontSize: 17, bold: true });
  });
  footer(s, 9);
}

// 10 Close
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  shape(s, "rect", { left: 720, top: 0, width: 560, height: 720 }, "#E9F1EE");
  shape(s, "roundRect", { left: 900, top: 48, width: 300, height: 624 }, C.white, "rounded-3xl");
  await addImage(s, "exports/screenshots/plan-mobile.png", { left: 925, top: 70, width: 250, height: 580 }, "contain", "Экран приблизительного плана QETTYQ");
  shape(s, "rect", { left: 0, top: 0, width: 785, height: 720 }, C.paper);
  eyebrow(s, "Следующий проверяемый результат");
  title(s, "Объединить рекомендации и карту", 104, 640, false, 47);
  const items = ["одни кандидаты в списке и на карте", "live RAG smoke с разрешённым ключом", "точный walking route через провайдера", "событийный feed с подтверждёнными правами"];
  items.forEach((v, i) => {
    shape(s, "ellipse", { left: 76, top: 292 + i * 56, width: 9, height: 9 }, C.jade);
    textBox(s, v, { left: 108, top: 277 + i * 56, width: 560, height: 34 }, { fontSize: 18, bold: true });
  });
  shape(s, "roundRect", { left: 70, top: 535, width: 575, height: 74 }, C.forest, "rounded-2xl");
  textBox(s, "Целевой URL: github.com/timyname/QETTYQ", { left: 101, top: 559, width: 500, height: 28 }, { fontSize: 17, bold: true, color: C.white });
  textBox(s, "GitHub URL · Deploy · YouTube · отправка: не подтверждены", { left: 72, top: 628, width: 590, height: 28 }, { fontSize: 12, bold: true, color: C.muted });
  footer(s, 10);
}

await fs.mkdir("exports/presentation-preview-v4", { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(`exports/presentation-preview-v4/slide-${String(index + 1).padStart(2, "0")}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: "webp", montage: true });
await fs.writeFile("exports/presentation-preview-v4/montage.webp", new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save("exports/QETTYQ_APP_pitch_v4.pptx");
