import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const W = 1280;
const H = 720;
const C = {
  ink: "#0F1113",
  paper: "#F5F5F2",
  white: "#FFFFFF",
  muted: "#6E7175",
  green: "#0A7F6E",
  lime: "#C9F46B",
  cyan: "#3FC5EF",
  violet: "#7A62E8",
  gold: "#D9A449",
  line: "#DADDD8",
};

async function imageBytes(path) {
  const bytes = await fs.readFile(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function shape(slide, geometry, position, fill, radius = undefined) {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line: { style: "solid", fill: "none", width: 0 },
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

function eyebrow(slide, label, color = C.green) {
  textBox(slide, label, { left: 70, top: 44, width: 650, height: 26 }, { fontSize: 13, bold: true, color });
}

function footer(slide, index, dark = false) {
  textBox(slide, "QETTYQ APP · QARAGANDY / ASTANA PILOT", { left: 70, top: 678, width: 520, height: 18 }, { fontSize: 10, bold: true, color: dark ? "#AAB2AF" : "#8A8D90" });
  textBox(slide, String(index).padStart(2, "0"), { left: 1160, top: 674, width: 50, height: 20 }, { fontSize: 12, bold: true, color: dark ? C.white : C.ink, alignment: "right" });
}

async function addImage(slide, path, position, fit = "cover", alt = "") {
  const ext = path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return slide.images.add({ blob: await imageBytes(path), contentType: ext, alt, fit, position });
}

const deck = Presentation.create({ slideSize: { width: W, height: H } });

// 01 — Cover
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  await addImage(slide, "presentation/assets/qettyq-route-sculpture.png", { left: 530, top: 0, width: 750, height: 720 }, "cover", "Абстрактный маршрут QETTYQ");
  shape(slide, "roundRect", { left: 70, top: 56, width: 112, height: 34 }, C.ink, "rounded-full");
  textBox(slide, "QETTYQ APP", { left: 86, top: 65, width: 88, height: 18 }, { fontSize: 11, bold: true, color: C.white });
  textBox(slide, "Не список.\nОдин путь.", { left: 70, top: 154, width: 520, height: 230 }, { fontSize: 62, bold: true });
  textBox(slide, "Контекстный городской выбор для Казахстана", { left: 72, top: 416, width: 390, height: 62 }, { fontSize: 22, color: C.muted });
  textBox(slide, "Пилот · Астана\nTim Asproyanidi · Boostseller.kz", { left: 72, top: 564, width: 390, height: 64 }, { fontSize: 16, bold: true, color: C.green });
  footer(slide, 1);
}

// 02 — Problem
{
  const slide = deck.slides.add();
  slide.background.fill = C.ink;
  eyebrow(slide, "ПРОБЛЕМА / ВЫБОР ПЕРЕГРУЖЕН", C.lime);
  textBox(slide, "У человека есть\n90 минут — не вечер\nна исследование города.", { left: 70, top: 118, width: 690, height: 280 }, { fontSize: 56, bold: true, color: C.white });
  textBox(slide, "Каталоги показывают всё. QETTYQ учитывает то, что реально ограничивает решение сейчас.", { left: 72, top: 455, width: 610, height: 96 }, { fontSize: 22, color: "#B9C0BD" });
  const items = [["ВРЕМЯ", "сколько свободно"], ["БЮДЖЕТ", "что допустимо"], ["НАСТРОЕНИЕ", "что откликается"]];
  items.forEach(([a, b], i) => {
    const top = 122 + i * 145;
    shape(slide, "roundRect", { left: 850, top, width: 340, height: 112 }, i === 0 ? "#193934" : i === 1 ? "#263347" : "#332A48", "rounded-2xl");
    textBox(slide, a, { left: 880, top: top + 22, width: 270, height: 28 }, { fontSize: 14, bold: true, color: i === 0 ? C.lime : C.white });
    textBox(slide, b, { left: 880, top: top + 55, width: 270, height: 32 }, { fontSize: 21, bold: true, color: C.white });
  });
  footer(slide, 2, true);
}

// 03 — Astana
{
  const slide = deck.slides.add();
  await addImage(slide, "presentation/assets/astana-modern-nomad.png", { left: 0, top: 0, width: W, height: H }, "cover", "Современная визуальная метафора Астаны");
  shape(slide, "roundRect", { left: 58, top: 55, width: 505, height: 565 }, "#0D1718", "rounded-3xl");
  textBox(slide, "АСТАНА · ПИЛОТ", { left: 94, top: 94, width: 360, height: 26 }, { fontSize: 13, bold: true, color: C.lime });
  textBox(slide, "Город ветра,\nдистанций\nи быстрых\nрешений.", { left: 92, top: 154, width: 410, height: 315 }, { fontSize: 52, bold: true, color: C.white });
  textBox(slide, "80 реальных POI в локальном snapshot · источники OpenStreetMap", { left: 94, top: 526, width: 390, height: 62 }, { fontSize: 16, color: "#B9C0BD" });
  textBox(slide, "03", { left: 1160, top: 674, width: 50, height: 20 }, { fontSize: 12, bold: true, color: C.white, alignment: "right" });
}

// 04 — Product flow
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  eyebrow(slide, "ПРОДУКТ / 4 ШАГА ДО ПЛАНА");
  textBox(slide, "Контекст → вкус → 1–3 варианта → план", { left: 70, top: 86, width: 1050, height: 62 }, { fontSize: 36, bold: true });
  const screens = [
    ["exports/screenshots/limits-mobile.png", "01  Ограничения"],
    ["exports/screenshots/results-mobile.png", "02  Честная выдача"],
    ["exports/screenshots/plan-mobile.png", "03  Понятный маршрут"],
  ];
  for (let i = 0; i < screens.length; i += 1) {
    const left = 92 + i * 390;
    shape(slide, "roundRect", { left, top: 174, width: 300, height: 438 }, C.white, "rounded-3xl");
    await addImage(slide, screens[i][0], { left: left + 28, top: 194, width: 244, height: 374 }, "contain", screens[i][1]);
    textBox(slide, screens[i][1], { left: left + 28, top: 580, width: 245, height: 28 }, { fontSize: 14, bold: true, color: C.green });
  }
  footer(slide, 4);
}

// 05 — Intelligence
{
  const slide = deck.slides.add();
  slide.background.fill = C.white;
  eyebrow(slide, "ЛОГИКА / AI НЕ НАРУШАЕТ ОГРАНИЧЕНИЯ");
  textBox(slide, "Сначала факты.\nПотом объяснение.", { left: 70, top: 104, width: 560, height: 145 }, { fontSize: 51, bold: true });
  textBox(slide, "QETTYQ не просит модель выдумывать места. Кандидаты приходят из snapshot, проходят жёсткие фильтры, и только затем получают объяснение по evidence.", { left: 72, top: 284, width: 510, height: 150 }, { fontSize: 20, color: C.muted });
  const steps = [
    ["01", "REAL POI", "OSM snapshot"],
    ["02", "CONSTRAINTS", "время · бюджет · дистанция"],
    ["03", "RANKING", "цель · интересы · известность"],
    ["04", "EXPLANATION", "строгий JSON или fallback"],
  ];
  steps.forEach(([n, t, d], i) => {
    const top = 106 + i * 122;
    shape(slide, "roundRect", { left: 720, top, width: 470, height: 96 }, i === 3 ? "#DDF58D" : "#F0F2EF", "rounded-2xl");
    textBox(slide, n, { left: 748, top: top + 31, width: 44, height: 28 }, { fontSize: 16, bold: true, color: C.green });
    textBox(slide, t, { left: 818, top: top + 18, width: 330, height: 25 }, { fontSize: 15, bold: true });
    textBox(slide, d, { left: 818, top: top + 51, width: 330, height: 27 }, { fontSize: 16, color: C.muted });
  });
  footer(slide, 5);
}

// 06 — Trust
{
  const slide = deck.slides.add();
  slide.background.fill = "#102725";
  eyebrow(slide, "ДОВЕРИЕ / ЭТИКА И ПРИВАТНОСТЬ", C.lime);
  textBox(slide, "Не знаем —\nтак и говорим.", { left: 70, top: 108, width: 600, height: 150 }, { fontSize: 56, bold: true, color: C.white });
  const items = [
    ["UNKNOWN ≠ FREE", "Неизвестная цена не считается бесплатной."],
    ["SOURCE ≠ IDEA", "Реальное место отделено от сгенерированной идеи."],
    ["DELETE MEANS DELETE", "Гостевая сессия, TTL 24 часа, удаление данных."],
  ];
  items.forEach(([a, b], i) => {
    const left = 72 + i * 394;
    shape(slide, "roundRect", { left, top: 358, width: 354, height: 198 }, i === 1 ? "#1A3934" : "#182D32", "rounded-3xl");
    textBox(slide, a, { left: left + 27, top: 390, width: 300, height: 34 }, { fontSize: 14, bold: true, color: C.lime });
    textBox(slide, b, { left: left + 27, top: 448, width: 292, height: 80 }, { fontSize: 20, bold: true, color: C.white });
  });
  footer(slide, 6, true);
}

// 07 — Proof
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  eyebrow(slide, "ЧТО УЖЕ РАБОТАЕТ / ПРОВЕРЕНО");
  textBox(slide, "Вертикальный срез, который можно показать жюри сейчас", { left: 70, top: 92, width: 1060, height: 58 }, { fontSize: 36, bold: true });
  const metrics = [["80", "POI с provenance"], ["13", "unit + integration"], ["4", "mobile E2E"], ["0", "секретов в Git"]];
  metrics.forEach(([value, label], i) => {
    const left = 72 + i * 286;
    textBox(slide, value, { left, top: 178, width: 170, height: 72 }, { fontSize: 54, bold: true, color: i === 3 ? C.green : C.ink });
    textBox(slide, label, { left, top: 248, width: 210, height: 34 }, { fontSize: 15, bold: true, color: C.muted });
  });
  shape(slide, "roundRect", { left: 70, top: 318, width: 1140, height: 306 }, C.white, "rounded-3xl");
  await addImage(slide, "exports/screenshots/start-desktop.png", { left: 92, top: 340, width: 1096, height: 262 }, "cover", "Главный экран QETTYQ");
  footer(slide, 7);
}

// 08 — Expansion
{
  const slide = deck.slides.add();
  await addImage(slide, "presentation/assets/almaty-modern-nomad.png", { left: 0, top: 0, width: W, height: H }, "cover", "Современная визуальная метафора Алматы");
  shape(slide, "roundRect", { left: 58, top: 55, width: 514, height: 565 }, "#10231F", "rounded-3xl");
  textBox(slide, "NEXT CITY · ALMATY", { left: 94, top: 94, width: 360, height: 26 }, { fontSize: 13, bold: true, color: C.lime });
  textBox(slide, "Одна логика.\nРазные ритмы\nКазахстана.", { left: 92, top: 158, width: 430, height: 210 }, { fontSize: 52, bold: true, color: C.white });
  textBox(slide, "Пилот доказываем в Астане. Затем подключаем Алматы и другие города через тот же data-provider слой.", { left: 94, top: 418, width: 390, height: 116 }, { fontSize: 18, color: "#C5CDC9" });
  textBox(slide, "Не обещание запуска · направление масштабирования", { left: 94, top: 562, width: 390, height: 28 }, { fontSize: 12, bold: true, color: C.lime });
  textBox(slide, "08", { left: 1160, top: 674, width: 50, height: 20 }, { fontSize: 12, bold: true, color: C.white, alignment: "right" });
}

// 09 — Close
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  await addImage(slide, "presentation/assets/qettyq-route-sculpture.png", { left: 690, top: 0, width: 590, height: 720 }, "cover", "Маршрут QETTYQ");
  eyebrow(slide, "КОМАНДА / QETTYQ APP");
  textBox(slide, "Сделаем свободное\nвремя проще.", { left: 70, top: 126, width: 650, height: 160 }, { fontSize: 53, bold: true });
  textBox(slide, "Tim Asproyanidi\nQaragandy · Boostseller.kz\n+7 777 836 8576", { left: 72, top: 355, width: 440, height: 120 }, { fontSize: 23, bold: true, color: C.green });
  shape(slide, "roundRect", { left: 70, top: 518, width: 466, height: 72 }, C.ink, "rounded-2xl");
  textBox(slide, "github.com/timyname/QETTYQ", { left: 96, top: 541, width: 410, height: 28 }, { fontSize: 17, bold: true, color: C.white });
  footer(slide, 9);
}

await fs.mkdir("exports/presentation-preview", { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(`exports/presentation-preview/slide-${String(index + 1).padStart(2, "0")}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: "webp", montage: true });
await fs.writeFile("exports/presentation-preview/montage.webp", new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save("exports/QETTYQ_APP_pitch.pptx");
