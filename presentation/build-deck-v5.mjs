import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
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
  textBox(slide, "QETTYQ · ASTANA PILOT · PRODUCT PROTOTYPE", { left: 70, top: 682, width: 500, height: 15 }, { fontSize: 9, bold: true, color: dark ? "#9EB0AA" : "#7A837F" });
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
  textBox(s, "Персональные варианты\nдосуга в Астане", { left: 70, top: 230, width: 610, height: 180 }, { fontSize: 49, bold: true, color: C.jade });
  textBox(s, "Первый контакт сохраняет предпочтения пользователя", { left: 72, top: 460, width: 500, height: 46 }, { fontSize: 19, bold: true });
  textBox(s, "Балет или армрестлинг, бачата или барабаны. QETTYQ показывает события, которые подходят конкретному человеку.", { left: 72, top: 522, width: 500, height: 70 }, { fontSize: 16, color: C.muted });
  textBox(s, "Пилот: Астана · 15 первых выборов · карта событий", { left: 72, top: 615, width: 500, height: 28 }, { fontSize: 12, bold: true, color: C.jade });
  footer(s, 1);
}

// 02 Focus
{
  const s = deck.slides.add();
  s.background.fill = C.forest;
  eyebrow(s, "Фокус прототипа", true);
  title(s, "Два способа выбрать событие", 98, 760, true, 48);
  const cards = [
    ["01", "QETTYQ подбирает", "Сервис учитывает настроение, время, бюджет и историю выбора."],
    ["02", "Человек выбирает сам", "Все доступные события на карте можно открыть и сравнить."],
  ];
  cards.forEach(([n, h, p], i) => {
    const left = 70 + i * 570;
    shape(s, "roundRect", { left, top: 300, width: 530, height: 250 }, i === 0 ? "#153E36" : "#17343A", "rounded-3xl");
    textBox(s, n, { left: left + 32, top: 330, width: 60, height: 44 }, { fontSize: 30, bold: true, color: C.lime });
    textBox(s, h, { left: left + 32, top: 394, width: 430, height: 42 }, { fontSize: 28, bold: true, color: C.white });
    textBox(s, p, { left: left + 32, top: 458, width: 440, height: 70 }, { fontSize: 17, color: "#C7D3CF" });
  });
  textBox(s, "Любителю загородного отдыха не показываем ресторан высокой кухни. Фанату рок-концертов не ставим балет первым вариантом.", { left: 72, top: 594, width: 1080, height: 44 }, { fontSize: 16, bold: true, color: C.sand });
  routeMarks(s, true);
  footer(s, 2, true);
}

// 03 Context screenshot
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  eyebrow(s, "Первичная настройка");
  title(s, "Два шага до персональной ленты", 88, 720, false, 42);
  const facts = [["01", "15 карточек свайпом вправо или влево"], ["02", "время, бюджет и разрешение геолокации"], ["15+", "интересы можно дополнить позже"], ["После", "лента и карта учитывают выбранный контекст"]];
  facts.forEach(([v, l], i) => {
    const top = 260 + i * 84;
    textBox(s, v, { left: 74, top, width: 110, height: 38 }, { fontSize: 26, bold: true, color: i < 2 ? C.jade : C.ink });
    textBox(s, l, { left: 190, top: top + 5, width: 410, height: 48 }, { fontSize: 15, color: C.muted });
  });
  shape(s, "roundRect", { left: 725, top: 64, width: 390, height: 600 }, C.white, "rounded-3xl");
  await addImage(s, "design/references/iphone-onboarding-v1.png", { left: 758, top: 86, width: 324, height: 556 }, "cover", "Экран первичного выбора предпочтений QETTYQ");
  textBox(s, "Геопозиция нужна только для старта маршрута. Пользователь даёт разрешение сам.", { left: 74, top: 610, width: 520, height: 42 }, { fontSize: 13, bold: true, color: C.muted });
  footer(s, 3);
}

// 04 Data
{
  const s = deck.slides.add();
  await addImage(s, "presentation/assets/astana-modern-nomad.png", { left: 0, top: 0, width: W, height: H }, "cover", "Современная визуальная метафора Астаны");
  shape(s, "roundRect", { left: 56, top: 54, width: 570, height: 575 }, "#0B201D", "rounded-3xl");
  textBox(s, "КАРТА СОБЫТИЙ", { left: 88, top: 82, width: 390, height: 22 }, { fontSize: 12, bold: true, color: C.lime });
  textBox(s, "События создают\nлюди и компании", { left: 88, top: 126, width: 470, height: 140 }, { fontSize: 47, bold: true, color: C.white });
  const facts = ["афиши и официальные страницы", "партнёрские API и открытые данные", "форма или чат-бот для организатора", "динамические точки на карте города"];
  facts.forEach((v, i) => {
    shape(s, "ellipse", { left: 91, top: 320 + i * 55, width: 9, height: 9 }, C.lime);
    textBox(s, v, { left: 120, top: 307 + i * 55, width: 410, height: 32 }, { fontSize: 17, color: "#D4DFDB" });
  });
  shape(s, "roundRect", { left: 87, top: 553, width: 474, height: 52 }, "#203B35", "rounded-xl");
  textBox(s, "Перед поездкой детали всегда можно уточнить в карточке события", { left: 112, top: 563, width: 420, height: 34 }, { fontSize: 13, bold: true, color: C.sand });
  footer(s, 4, true);
}

// 05 Retrieval
{
  const s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "Как работает рекомендация");
  title(s, "Предпочтения становятся объяснимым маршрутом", 88, 1080, false, 42);
  const steps = [
    ["01", "ВКУС", "свайпы и прошлые посещения"],
    ["02", "ПОДБОР", "подходящие события подсвечены"],
    ["03", "ДОРОГА", "пешком или примерная поездка"],
    ["04", "СВЯЗЬ", "организатор, WhatsApp или бронь"],
    ["05", "ПАМЯТЬ", "результат дополняет профиль"],
  ];
  steps.forEach(([n, h, p], i) => {
    const left = 55 + i * 246;
    shape(s, "roundRect", { left, top: 290, width: 220, height: 175 }, i === 4 ? "#DDF58D" : "#EEF2EE", "rounded-2xl");
    textBox(s, n, { left: left + 24, top: 315, width: 45, height: 30 }, { fontSize: 18, bold: true, color: C.jade });
    textBox(s, h, { left: left + 24, top: 365, width: 172, height: 28 }, { fontSize: 18, bold: true });
    textBox(s, p, { left: left + 24, top: 410, width: 172, height: 46 }, { fontSize: 13, color: C.muted });
  });
  shape(s, "roundRect", { left: 70, top: 515, width: 1140, height: 98 }, C.forest, "rounded-2xl");
  textBox(s, "RAG-профиль хранит предпочтения и историю действий", { left: 102, top: 539, width: 650, height: 30 }, { fontSize: 20, bold: true, color: C.white });
  textBox(s, "Пилот сохраняет данные локально в браузере. На телефоне тот же профиль хранится в защищённом локальном хранилище.", { left: 102, top: 574, width: 980, height: 28 }, { fontSize: 14, color: "#BED0CA" });
  footer(s, 5);
}

// 06 Results
{
  const s = deck.slides.add();
  s.background.fill = C.paper;
  eyebrow(s, "Ответ пользователю");
  title(s, "Карточка отделяет\nфакт от неизвестного", 88, 560, false, 39);
  textBox(s, "Пользователь видит", { left: 72, top: 252, width: 340, height: 32 }, { fontSize: 18, bold: true, color: C.jade });
  const facts = ["почему событие подходит", "источник и организатора", "время до точки", "цена и места: уточнить"];
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
  eyebrow(s, "Карта на смартфоне");
  title(s, "Все события города на выбранную дату", 82, 850, false, 43);
  shape(s, "roundRect", { left: 90, top: 185, width: 430, height: 455 }, C.white, "rounded-3xl");
  await addImage(s, "design/references/iphone-map-v1.png", { left: 108, top: 203, width: 394, height: 419 }, "contain", "Мобильная карта событий QETTYQ для Астаны");
  const facts = [["Google Maps", "интерактивная карта Астаны"], ["Фильтры", "дата и тип события"], ["От точки старта", "видно, как далеко находится событие"], ["Карточка", "время, цена, язык и организатор"]];
  facts.forEach(([h, p], i) => {
    const top = 210 + i * 90;
    textBox(s, h, { left: 610, top, width: 500, height: 28 }, { fontSize: 18, bold: true, color: C.jade });
    textBox(s, p, { left: 610, top: top + 34, width: 500, height: 38 }, { fontSize: 14, color: C.muted });
  });
  textBox(s, "Маркеры QETTYQ накладываются поверх карты. Время пути появляется после расчёта маршрута.", { left: 610, top: 585, width: 500, height: 42 }, { fontSize: 13, bold: true, color: C.ink });
  footer(s, 7);
}

// 08 QA
{
  const s = deck.slides.add();
  s.background.fill = C.ink;
  eyebrow(s, "Архитектура в цифрах", true);
  title(s, "Источники обновляют одну карту событий", 92, 980, true, 44);
  const metrics = [["11", "кандидатов источников"], ["3", "канала добавления"], ["24 ч", "базовое обновление"], ["T−6 ч", "проверка перед событием"]];
  metrics.forEach(([v, l], i) => {
    const left = 70 + i * 288;
    textBox(s, v, { left, top: 280, width: 235, height: 90 }, { fontSize: 56, bold: true, color: i === 2 ? C.sand : C.lime });
    textBox(s, l, { left, top: 375, width: 235, height: 42 }, { fontSize: 16, bold: true, color: C.white });
  });
  shape(s, "roundRect", { left: 70, top: 486, width: 1140, height: 112 }, "#1D2925", "rounded-2xl");
  textBox(s, "ВХОД", { left: 100, top: 520, width: 100, height: 36 }, { fontSize: 24, bold: true, color: C.lime });
  textBox(s, "API, чат-бот организатора или ручная карточка", { left: 220, top: 522, width: 800, height: 34 }, { fontSize: 19, bold: true, color: C.white });
  textBox(s, "Нормализация проверяет дату, площадку, источник и права. Browser RAG хранит только профиль пользователя.", { left: 220, top: 559, width: 850, height: 30 }, { fontSize: 12, color: "#AEBBB6" });
  footer(s, 8, true);
}

// 09 Trust
{
  const s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "Privacy и неопределённость");
  title(s, "Граница данных видна пользователю", 88, 850, false, 46);
  const items = [
    ["PRICE", "Если цена неизвестна, пишем: уточните у организатора."],
    ["SEATS", "«Нет мест» показываем только после подтверждения. Иначе просим уточнить наличие."],
    ["LOCATION", "Геопозиция используется для маршрута и не сохраняется в профиле."],
    ["MEMORY", "Предпочтения и диалог хранятся локально. Пользователь может удалить их одной кнопкой."],
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
  await addImage(s, "design/references/iphone-route-chat-v1.png", { left: 925, top: 70, width: 250, height: 580 }, "cover", "Маршрут и помощник QETTYQ");
  shape(s, "rect", { left: 0, top: 0, width: 785, height: 720 }, C.paper);
  eyebrow(s, "Следующий продуктовый цикл");
  title(s, "От участника к организатору", 104, 640, false, 47);
  const items = ["история посещений формирует уровень доверия", "активному пользователю открывается создание событий", "событие проходит проверку и появляется на карте", "участники бронируют места и связываются с организатором"];
  items.forEach((v, i) => {
    shape(s, "ellipse", { left: 76, top: 292 + i * 56, width: 9, height: 9 }, C.jade);
    textBox(s, v, { left: 108, top: 277 + i * 56, width: 560, height: 34 }, { fontSize: 18, bold: true });
  });
  shape(s, "roundRect", { left: 70, top: 535, width: 575, height: 74 }, C.forest, "rounded-2xl");
  textBox(s, "Пилот уже объединяет карту, помощника и локальную память", { left: 101, top: 552, width: 500, height: 42 }, { fontSize: 17, bold: true, color: C.white });
  textBox(s, "qettyq-app.ablecorgi64.chatgpt.site · github.com/timyname/QETTYQ", { left: 72, top: 628, width: 620, height: 28 }, { fontSize: 12, bold: true, color: C.muted });
  footer(s, 10);
}

await fs.mkdir("exports/presentation-preview-v5", { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(`exports/presentation-preview-v5/slide-${String(index + 1).padStart(2, "0")}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: "webp", montage: true });
await fs.writeFile("exports/presentation-preview-v5/montage.webp", new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
const workspaceDir = process.cwd();
const stagingDir = path.join(workspaceDir, ".codex-finalizer-v5");
const candidatePath = path.join(stagingDir, "candidate.pptx");
const finalPath = path.join(workspaceDir, "exports/QETTYQ_APP_pitch_v5.pptx");
await fs.mkdir(stagingDir, { recursive: true });
await pptx.save(candidatePath);
const skillDir = "/Users/phonelab/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations";
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: "/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: ["Aptos"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "QETTYQ_APP_pitch_v5.validation.json"),
});
