import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "design/generated/app-screens");
const outputDir = join(root, "design/flows");
const thumbDir = join(root, "tmp/ux-flow-thumbs");
const output = join(outputDir, "QETTYQ_UX_FLOW.svg");

mkdirSync(thumbDir, { recursive: true });

const lanes = [
  {
    id: "first",
    title: "01 · Первый контакт",
    note: "Dock скрыт · один линейный сценарий · около 2 минут",
    color: "#0B6E5D",
    screens: [
      ["02-home.png", "Главный экран", "Настроить подборку →"],
      ["04-onboarding-intro.png", "Перед свайпами", "Начать →"],
      ["05-swipe.png", "15 выборов", "← не сейчас · интересно →"],
      ["08-context-time.png", "Свободное время", "Дальше →"],
      ["09-context-budget.png", "Бюджет", "Дальше →"],
      ["10-context-geography.png", "Стартовая точка", "Гео или вручную →"],
      ["13-search-progress.png", "Проверка данных", "Готово →"],
      ["14-feed.png", "Персональная лента", "Dock появляется"],
    ],
  },
  {
    id: "discovery",
    title: "02 · Поиск и карта",
    note: "Один candidateId в ленте, карте, чате и маршруте",
    color: "#4C8B7E",
    screens: [
      ["14-feed.png", "Для тебя", "Карточка →"],
      ["16-map.png", "Карта событий", "Маркер →"],
      ["17-map-selected.png", "Выбрано на карте", "Подробнее →"],
      ["18-map-list.png", "Список", "Карточка →"],
      ["19-filters.png", "Фильтры", "Показать →"],
      ["20-event-detail.png", "Событие", "Маршрут →"],
      ["21-place-detail.png", "Место", "Маршрут →"],
    ],
  },
  {
    id: "route",
    title: "03 · Помощник и маршрут",
    note: "Dock в чате · sticky actions вместо dock в маршруте",
    color: "#A9D83E",
    screens: [
      ["27-assistant-empty.png", "Помощник", "Запрос →"],
      ["28-assistant-clarify.png", "Уточнение", "Подтвердить →"],
      ["29-assistant-results.png", "Результаты", "В маршрут →"],
      ["24-route.png", "Конструктор", "Рассчитать →"],
      ["25-route-estimated.png", "Честная оценка", "Проверить →"],
      ["26-plan-ready.png", "Готовый план", "Навигация ↗"],
    ],
  },
  {
    id: "trust",
    title: "04 · Память и доверие",
    note: "Локальные предпочтения · видимые источники · удаление данных",
    color: "#FF715B",
    screens: [
      ["32-profile-memory.png", "Профиль и память", "Настройки →"],
      ["33-sources.png", "Источники", "Открыть источник ↗"],
      ["34-privacy-delete.png", "Приватность", "Удалить → confirm"],
      ["42-no-results.png", "Нет результатов", "Изменить условия →"],
      ["43-degraded-states.png", "Fallback", "Список остаётся"],
    ],
  },
];

const thumbWidth = 210;
const thumbHeight = 454;
const cardWidth = 250;
const cardHeight = 574;
const gap = 46;
const laneX = 210;
const laneTitleWidth = 470;
const laneStartX = laneX + laneTitleWidth;
const laneGapY = 690;
const canvasWidth = 3160;
const canvasHeight = 3200;

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[char]));

function thumbnailData(fileName) {
  const input = join(sourceDir, fileName);
  const thumb = join(thumbDir, `${basename(fileName, ".png")}.jpg`);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "--resampleWidth", String(thumbWidth * 2), input, "--out", thumb], { stdio: "ignore" });
  return `data:image/jpeg;base64,${readFileSync(thumb).toString("base64")}`;
}

const defs = `
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0B332D" flood-opacity="0.13"/>
    </filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
    <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 1 L 11 6 L 0 11 z" fill="#0B6E5D"/>
    </marker>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F4F6F2"/><stop offset="1" stop-color="#EAF1F2"/>
    </linearGradient>
  </defs>`;

const laneSvg = lanes.map((lane, laneIndex) => {
  const y = 480 + laneIndex * laneGapY;
  const items = lane.screens.map(([file, title, action], index) => {
    const x = laneStartX + index * (cardWidth + gap);
    const data = thumbnailData(file);
    const arrow = index < lane.screens.length - 1
      ? `<path d="M ${x + cardWidth + 8} ${y + 280} H ${x + cardWidth + gap - 12}" stroke="#0B6E5D" stroke-width="5" stroke-linecap="round" marker-end="url(#arrow)"/>`
      : "";
    return `${arrow}
      <g id="${esc(lane.id)}-${index}">
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="#FFFFFF" filter="url(#shadow)"/>
        <clipPath id="clip-${lane.id}-${index}"><rect x="${x + 20}" y="${y + 20}" width="${thumbWidth}" height="${thumbHeight}" rx="20"/></clipPath>
        <image href="${data}" x="${x + 20}" y="${y + 20}" width="${thumbWidth}" height="${thumbHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${lane.id}-${index})"/>
        <text x="${x + 20}" y="${y + 508}" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="700" fill="#101915">${esc(title)}</text>
        <text x="${x + 20}" y="${y + 540}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="500" fill="#68746F">${esc(action)}</text>
      </g>`;
  }).join("\n");

  return `
    <g id="lane-${lane.id}">
      <rect x="90" y="${y - 70}" width="2980" height="650" rx="44" fill="#FFFFFF" fill-opacity="0.36" stroke="#FFFFFF" stroke-opacity="0.76"/>
      <rect x="130" y="${y - 22}" width="14" height="170" rx="7" fill="${lane.color}"/>
      <text x="178" y="${y + 16}" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="760" fill="#101915">${esc(lane.title)}</text>
      <foreignObject x="178" y="${y + 52}" width="390" height="110">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font: 500 18px/1.45 Inter,Arial,sans-serif;color:#68746F">${esc(lane.note)}</div>
      </foreignObject>
      ${items}
    </g>`;
}).join("\n");

const nav = `
  <g id="navigation-legend">
    <rect x="1850" y="140" width="1160" height="190" rx="34" fill="#0B332D"/>
    <text x="1900" y="200" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="700" fill="#CFFC55">BOTTOM NAVIGATION · ТОЛЬКО ВНУТРИ ПРИЛОЖЕНИЯ</text>
    <text x="1900" y="252" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="650" fill="#FFFFFF">Для тебя  ·  Карта  ·  Помощник  ·  Планы  ·  Профиль</text>
    <text x="1900" y="296" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="500" fill="#C4D1CC">Скрыта на 01–13 и 24–26, чтобы не ломать onboarding и маршрут.</text>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  ${defs}
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="url(#bg)"/>
  <circle cx="2860" cy="170" r="270" fill="#CFFC55" fill-opacity="0.18" filter="url(#soft)"/>
  <circle cx="200" cy="2940" r="320" fill="#6AB6AD" fill-opacity="0.15" filter="url(#soft)"/>
  <text x="120" y="150" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="780" letter-spacing="-2" fill="#101915">QETTYQ · UX flow</text>
  <text x="124" y="208" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="520" fill="#68746F">Astana pilot · нажимаем → видим следующий проверяемый экран</text>
  <rect x="124" y="256" width="560" height="58" rx="29" fill="#DCEFE8"/>
  <text x="154" y="293" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="680" fill="#0B6E5D">28 готовых состояний · P0 end-to-end</text>
  ${nav}
  ${laneSvg}
  <text x="120" y="3130" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="560" fill="#68746F">Внешние переходы (билет, WhatsApp, карта) всегда обозначаются ↗. Цена, наличие мест и время не выдумываются.</text>
</svg>`;

writeFileSync(output, svg);
console.log(output);
