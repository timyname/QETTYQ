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
  textBox(slide, "2 минуты,\nчтобы выбрать\nкуда пойти.", { left: 70, top: 145, width: 540, height: 248 }, { fontSize: 57, bold: true });
  textBox(slide, "Прототип городского помощника для свободного времени в Астане", { left: 72, top: 424, width: 410, height: 76 }, { fontSize: 21, color: C.muted });
  textBox(slide, "15 выборов · 1–3 варианта · проверяемые источники\nTim Asproyanidi · Boostseller.kz", { left: 72, top: 555, width: 430, height: 66 }, { fontSize: 15, bold: true, color: C.green });
  footer(slide, 1);
}

// 02 — Problem
{
  const slide = deck.slides.add();
  slide.background.fill = C.ink;
  eyebrow(slide, "ПОЧЕМУ ЛЮДИ ОТКЛАДЫВАЮТ ВЫБОР", C.lime);
  textBox(slide, "Свободное время\nначинается с лишних\nдесяти вкладок.", { left: 70, top: 118, width: 690, height: 260 }, { fontSize: 54, bold: true, color: C.white });
  textBox(slide, "Карта знает, что находится рядом. Афиша знает время начала. Но ни одна из них не знает, сколько времени и денег есть у человека сегодня.", { left: 72, top: 430, width: 625, height: 126 }, { fontSize: 21, color: "#B9C0BD" });
  const items = [["ВРЕМЯ", "сейчас, а не когда-нибудь"], ["БЮДЖЕТ", "без скрытых допущений"], ["ИНТЕРЕС", "15 быстрых выборов"]];
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
  textBox(slide, "Пилот для\nсвободного\nвремени\nв Астане.", { left: 92, top: 154, width: 410, height: 315 }, { fontSize: 52, bold: true, color: C.white });
  textBox(slide, "80 POI из OpenStreetMap и отдельный snapshot событий с прямыми ссылками на издателей", { left: 94, top: 510, width: 390, height: 80 }, { fontSize: 16, color: "#B9C0BD" });
  textBox(slide, "03", { left: 1160, top: 674, width: 50, height: 20 }, { fontSize: 12, bold: true, color: C.white, alignment: "right" });
}

// 04 — Product flow
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  eyebrow(slide, "ПЕРВЫЙ КОНТАКТ И ЗАТЕМ КАРТА");
  textBox(slide, "15 выборов превращаются в короткий план", { left: 70, top: 86, width: 1050, height: 62 }, { fontSize: 36, bold: true });
  const screens = [
    ["design/references/iphone-onboarding-v1.png", "01  Две минуты на контекст"],
    ["design/references/iphone-map-v1.png", "02  События на карте"],
    ["design/references/iphone-route-chat-v1.png", "03  План и источники"],
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
  eyebrow(slide, "КАК РАБОТАЕТ ПОМОЩНИК");
  textBox(slide, "Фильтры решают.\nМодель объясняет.", { left: 70, top: 104, width: 560, height: 145 }, { fontSize: 51, bold: true });
  textBox(slide, "Кандидаты берутся из snapshot. Время, бюджет и дистанция проверяются кодом. Модель может только объяснить уже найденный вариант. Без ключа работает детерминированный fallback.", { left: 72, top: 284, width: 510, height: 170 }, { fontSize: 19, color: C.muted });
  const steps = [
    ["01", "КАНДИДАТЫ", "OSM и snapshot событий"],
    ["02", "ОГРАНИЧЕНИЯ", "время, бюджет, расстояние"],
    ["03", "РАНЖИРОВАНИЕ", "интересы и выполнимость"],
    ["04", "ОБЪЯСНЕНИЕ", "только по данным кандидата"],
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
  eyebrow(slide, "РАБОЧИЙ ПРОТОТИП");
  textBox(slide, "Сценарий можно пройти в браузере уже сейчас", { left: 70, top: 92, width: 1060, height: 58 }, { fontSize: 36, bold: true });
  const metrics = [["80", "POI с provenance"], ["13", "unit + integration"], ["4", "mobile E2E"], ["0", "секретов в Git"]];
  metrics.forEach(([value, label], i) => {
    const left = 72 + i * 286;
    textBox(slide, value, { left, top: 178, width: 170, height: 72 }, { fontSize: 54, bold: true, color: i === 3 ? C.green : C.ink });
    textBox(slide, label, { left, top: 248, width: 210, height: 34 }, { fontSize: 15, bold: true, color: C.muted });
  });
  shape(slide, "roundRect", { left: 70, top: 318, width: 1140, height: 306 }, C.white, "rounded-3xl");
  await addImage(slide, "exports/screenshots/map-desktop.png", { left: 92, top: 340, width: 1096, height: 262 }, "cover", "Карта событий QETTYQ для Астаны");
  footer(slide, 7);
}

// 08 — Expansion
{
  const slide = deck.slides.add();
  await addImage(slide, "presentation/assets/almaty-modern-nomad.png", { left: 0, top: 0, width: W, height: H }, "cover", "Современная визуальная метафора Алматы");
  shape(slide, "roundRect", { left: 58, top: 55, width: 514, height: 565 }, "#10231F", "rounded-3xl");
  textBox(slide, "NEXT CITY · ALMATY", { left: 94, top: 94, width: 360, height: 26 }, { fontSize: 13, bold: true, color: C.lime });
  textBox(slide, "Сначала\nдоказываем\nАстану.", { left: 92, top: 158, width: 430, height: 210 }, { fontSize: 52, bold: true, color: C.white });
  textBox(slide, "Следующий шаг: договориться о feed событий, подключить точный routing и проверить удержание. Алматы остаётся направлением, а не заявленным запуском.", { left: 94, top: 398, width: 405, height: 145 }, { fontSize: 18, color: "#C5CDC9" });
  textBox(slide, "Visit Astana и eGov рассматриваются как кандидаты на интеграцию", { left: 94, top: 558, width: 405, height: 42 }, { fontSize: 12, bold: true, color: C.lime });
  textBox(slide, "08", { left: 1160, top: 674, width: 50, height: 20 }, { fontSize: 12, bold: true, color: C.white, alignment: "right" });
}

// 09 — Close
{
  const slide = deck.slides.add();
  slide.background.fill = C.paper;
  await addImage(slide, "exports/screenshots/start-desktop.png", { left: 690, top: 0, width: 590, height: 720 }, "cover", "Рабочий первый экран QETTYQ");
  eyebrow(slide, "КОМАНДА / QETTYQ APP");
  textBox(slide, "Проверим, куда\nпойти сегодня.", { left: 70, top: 126, width: 650, height: 160 }, { fontSize: 53, bold: true });
  textBox(slide, "Tim Asproyanidi\nQaragandy · Boostseller.kz\n+7 777 836 8576", { left: 72, top: 355, width: 440, height: 120 }, { fontSize: 23, bold: true, color: C.green });
  shape(slide, "roundRect", { left: 70, top: 518, width: 466, height: 72 }, C.ink, "rounded-2xl");
  textBox(slide, "github.com/timyname/QETTYQ", { left: 96, top: 541, width: 410, height: 28 }, { fontSize: 17, bold: true, color: C.white });
  footer(slide, 9);
}

await fs.mkdir("exports/presentation-preview-v2", { recursive: true });
for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(`exports/presentation-preview-v2/slide-${String(index + 1).padStart(2, "0")}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: "webp", montage: true });
await fs.writeFile("exports/presentation-preview-v2/montage.webp", new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save("exports/QETTYQ_APP_pitch_v2.pptx");
