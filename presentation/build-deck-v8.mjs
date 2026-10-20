import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Presentation, PresentationFile } from 'file:///Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

// Same authored 1280×720 composition, palette and Arial typography as v7.
// Earlier decks remain untouched. Only real web-app captures may enter v8.
const ROOT = '/Users/phonelab/Documents/QETTYQ';
const SKILL = '/Users/phonelab/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations';
const RUNTIME = '/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES = path.join(RUNTIME, 'node/node_modules');
const OUT = path.join(ROOT, 'exports');
const TMP = path.join(ROOT, '.codex-presentations/qettyq-v8');
const PRE = path.join(OUT, 'presentation-preview-v8');
const PROOF = 'exports/screenshots/v8';
const S = Object.fromEntries(['swipe','budget','feed','map','route','chat','events','privacy'].map(key => [key, `${PROOF}/${key}.png`]));
S.events = `${PROOF}/live-feed.png`;
const C = { paper:'#F4F6F2', ink:'#102B25', jade:'#0B6E5D', dark:'#0B332D', lime:'#CFFC55', muted:'#5E716B', white:'#FFFFFF', soft:'#C1D1CA' };
const deck = Presentation.create({ slideSize:{ width:1280, height:720 } });
const copy = [];
const exists = rel => fs.stat(path.join(ROOT,rel)).then(() => true).catch(() => false);
function t(s, str, x, y, w, h, size=24, color=C.ink, bold=false) {
  const q=s.shapes.add({ geometry:'textbox', position:{left:x,top:y,width:w,height:h}, fill:'none', line:{fill:'none',width:0} });
  q.text=str; q.text.style={typeface:'Arial',fontSize:size,color,bold}; return q;
}
async function img(s, rel, x,y,w,h, fit='contain',alt='') {
  const bytes=await fs.readFile(path.join(ROOT,rel));
  const contentType=/\.jpe?g$/i.test(rel)?'image/jpeg':'image/png';
  return s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType,fit,alt,position:{left:x,top:y,width:w,height:h}});
}
function base(n, dark=false) {
  const s=deck.slides.add(); s.background.fill=dark?C.dark:C.paper;
  t(s,'QETTYQ APP',64,36,330,24,16,dark?C.lime:C.jade,true);
  t(s,String(n).padStart(2,'0'),1160,674,55,22,13,dark?C.soft:C.muted); return s;
}
function note(s, heading, body, sources=[]) {
  s.speakerNotes.text=body+'\n\nИсточники и статус:\n'+sources.join('\n');
  copy.push(`## ${copy.length+1}. ${heading}\n\n${body}\n\n${sources.map(x=>'- '+x).join('\n')}`);
}
function title(s,str,w=650,dark=false,size=48) { t(s,str,64,100,w,160,size,dark?C.white:C.ink,true); }
function label(s,str,x=64,y=630,w=680,dark=false) { t(s,str,x,y,w,42,16,dark?C.soft:C.muted); }
function row(s,n,head,body,y,w=600,dark=false) {
  t(s,n,64,y,62,44,27,dark?C.lime:C.jade,true);
  t(s,head,148,y,w-84,40,27,dark?C.white:C.ink,true);
  t(s,body,148,y+48,w-84,76,22,dark?C.soft:C.muted);
}
for (const key of ['map','route','chat']) {
  if (!await exists(S[key])) throw new Error(`Fresh real application proof required: ${S[key]}`);
}

{
  const s=base(1);
  await img(s,'presentation/assets/astana-modern-nomad.png',740,0,540,720,'cover','Художественная иллюстрация современной Астаны');
  t(s,'QETTYQ',64,150,650,90,76,C.dark,true);
  t(s,'Куда пойти,\nкогда есть\nсвободное время',64,270,650,225,53,C.jade,true);
  t(s,'Персональные варианты досуга\nпо интересам, времени и бюджету',67,526,590,76,27,C.ink);
  label(s,'Астана. Экраны локальной сборки 20.10.2026',67,648,630);
  note(s,'Куда пойти в Астане','QETTYQ помогает выбрать, чем заняться в свободное время. Начинаем с Астаны. Человек отмечает интересы, задаёт время и бюджет, затем получает несколько подходящих вариантов. В этой версии показаны настоящие экраны локального веб-приложения. Публичный сайт пока использует предыдущий интерфейс.',[
    'PRD.md, разделы 2, 3 и 17. Название и контакты предоставил владелец.',
    'presentation/assets/astana-modern-nomad.png: существующая сгенерированная художественная иллюстрация, не документальная фотография.'
  ]);
}
{
  const s=base(2,true); title(s,'Один вечер.\nРазные способы его провести',1120,true,50);
  t(s,'Афиша, карта и бюджет обычно остаются отдельными задачами.\nQETTYQ собирает их вокруг конкретного человека.',67,272,1110,88,28,C.soft);
  row(s,'01','Персональная подборка','Сервис учитывает предпочтения и доступное время.',410,610,true);
  t(s,'02',720,410,62,44,27,C.lime,true); t(s,'Самостоятельный выбор',804,410,400,72,27,C.white,true);
  t(s,'Карта помогает посмотреть другие варианты поблизости.',804,495,390,90,22,C.soft);
  note(s,'Два способа выбора','Можно получить подборку под свои условия или самому выбрать место на карте. Любителю рок-концертов не нужно по умолчанию предлагать балет первым вариантом. При этом остальные категории остаются доступны. Предпочтения меняют порядок выдачи, а не закрывают город. Это продуктовая гипотеза. Измеренную экономию времени или подтверждённый спрос пока не заявляем.',['Комментарии владельца к PDF v4: 3, 4, 5.','src/components/PilotApp.tsx: лента, самостоятельный поиск, карта.']);
}
{
  const s=base(3); title(s,'Сначала интересы.\nПотом условия',610,false,48);
  row(s,'01','15 карточек','Вправо: интересно. Влево: не сейчас.\nПоследний выбор можно отменить.',300,600);
  row(s,'02','Время и бюджет','Бесплатно, заданная сумма или без лимита.\nГеопозиция только с разрешения.',475,600);
  if(await exists(S.swipe)) await img(s,S.swipe,700,83,255,553,'contain','Реальный экран свайпа интересов');
  if(await exists(S.budget)) await img(s,S.budget,974,83,255,553,'contain','Реальные условия подборки с бюджетными пресетами');
  label(s,'Локальное приложение. Картинки интересов: художественные иллюстрации.',700,647,520);
  note(s,'Два шага настройки','Первый контакт помогает понять вкусы человека. Пользователь свайпает пятнадцать идей досуга. Не сейчас не означает никогда. Выбор можно отменить, подбор интересов можно пропустить. Затем человек задаёт свободное время и бюджет. Нулевой бюджет означает подтверждённо бесплатные варианты. Без ограничений хранится отдельно от нуля. Геопозиция нужна для оценки пути и поступает только с разрешения. Две минуты остаются целевым временем настройки, а не измеренной метрикой.',[
    'src/components/BudgetControl.tsx, src/components/PilotApp.tsx.',
    'tests/e2e/map-route-budget.spec.ts, tests/e2e/qettyq.spec.ts. Число тестов не является пользовательской метрикой.',
    `${S.swipe}, ${S.budget}: реальные браузерные экраны. Иллюстрации категорий созданы для проекта.`
  ]);
}
{
  const s=base(4); title(s,'Персональная выдача\nс понятными ограничениями',1120,false,48);
  t(s,'До трёх мест под выбранные условия',67,286,1110,64,32,C.jade,true);
  t(s,'Интересы и условия',67,390,520,42,28,C.ink,true);
  t(s,'Код проверяет доступные данные\nо времени и бюджете. Карточку можно\nоткрыть, сохранить или добавить в план.',67,449,520,128,25,C.muted);
  t(s,'Когда совпадений нет',694,390,520,42,28,C.ink,true);
  t(s,'Показываем пустую выдачу.\nПредлагаем изменить условия,\nне ослабляя их без согласия.',694,449,520,128,25,C.muted);
  label(s,'Общая афиша доступна отдельно. Цена и наличие мест требуют проверки.',67,630,1110);
  note(s,'Персональная выдача','После настройки открывается лента Для тебя. Код выбирает до трёх вариантов из каталога с учётом доступных данных и контекста пользователя. Карточки можно перелистывать, открывать и добавлять в план. Место из OpenStreetMap не доказывает наличие спектакля на сегодня. Если точная цена или расписание неизвестны, приложение предлагает уточнить сведения. Иллюстрация категории не является фотографией площадки или афишей события.',[
    'Персональная лента описана по реализованной логике. В проверенном контексте выдача пуста. Макет или подобранный вручную успешный результат вместо неё не показан.',
    'src/server/pilot/catalog.ts, src/server/pilot/chat.ts, data/places.json: каталог и детерминированный подбор.',
    '© OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/copyright'
  ]);
}
{
  const s=base(5,true); title(s,'Карта и план прогулки',620,true,48);
  t(s,'Интерактивная карта Астаны.\nМеста с известными координатами\nи остановки выбранного плана.',67,280,550,140,30,C.white);
  t(s,'Дата и время старта в часовом поясе Астаны.\nДорога и время посещения пока оценочные.\nТочный путь откроет внешняя навигация.',67,468,550,130,24,C.soft);
  await img(s,S.map,685,84,255,553,'contain','Реальная интерактивная карта MapLibre с данными OpenFreeMap');
  await img(s,S.route,961,84,255,553,'contain','Реальный план маршрута с датой и временной шкалой');
  label(s,'MapLibre + OpenFreeMap. Внутри приложения нет линии пути по улицам.',685,650,545,true);
  note(s,'Карта и маршрут','Карта работает на MapLibre и OpenFreeMap с данными OpenStreetMap. Её можно перемещать, масштабировать и вращать. Маркеры показывают места и события с известными координатами. В плане есть остановки, дата и время старта по Астане. Расстояние и время пешком сейчас основаны на геометрической оценке по координатам. Длительность посещения является проектной оценкой. Это не расчёт дорожного маршрутизатора. Приложение не рисует вымышленную линию дороги. Для точной навигации доступны Google Maps, 2ГИС и Apple Maps. При таком переходе выбранный старт передаётся внешнему сервису.',[
    `${S.map}, ${S.route}: реальные браузерные экраны локальной версии. В примере старт выбран вручную на общедоступной точке карты, это не GPS человека.`,
    'src/components/MapCanvas.tsx, src/components/RoutePlan.tsx, src/client/route-timeline.ts.',
    '© OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors. https://openfreemap.org/ https://openmaptiles.org/ https://www.openstreetmap.org/copyright'
  ]);
}
{
  const s=base(6); title(s,'Поиск в привычном чате',650,false,48);
  t(s,'«События»\nКарточки прямо в ответе',67,290,590,105,31,C.jade,true);
  t(s,'Помощник находит места и события.\nВ ответе появляются карточки\nи ссылки для следующего шага.',67,430,585,120,25,C.muted);
  t(s,'Сейчас ответы формируют правила.\nПубличная генерация AI выключена.',67,585,590,76,24,C.ink,true);
  await img(s,S.chat,815,70,275,596,'contain','Реальный диалог детерминированного помощника с карточками');
  label(s,'Работающий чат локальной версии',802,674,400);
  note(s,'Помощник и карточки в чате','В чат можно написать обычным языком, например попросить театр на два часа и в пределах бюджета. Текущий помощник разбирает поддерживаемые условия по правилам, ищет записи и возвращает карточки реальных мест или доступных событий. Из карточек доступны детали, карта и план. Если данных не хватает, ответ сохраняет это ограничение. Он не придумывает сеанс, стоимость или наличие мест. На экране показан реальный ответ поиска по правилам. Отдельный локальный серверный тест GPT-5.5 с веб-поиском завершился успешно и вернул ссылку на Visit Astana. Это не ответ модели в показанном диалоге. Публичные AI-вызовы выключены.',[
    `${S.chat}: реальный диалог локального приложения, без подмены макетом.`,
    'src/app/api/chat/route.ts, src/server/providers/llm/index.ts, src/components/CitedMessage.tsx.',
    'docs/agent-reports/A-ai-live-test-20261020.md: отдельный локальный серверный тест. src/app/api/assistant: адаптер и ограничение тестового доступа.'
  ]);
}
{
  const s=base(7,true); title(s,'Данные, проверка и объяснение',1120,true,48);
  row(s,'01','Поиск по городской базе','Места и события с проверяемыми полями.',275,1100,true);
  row(s,'02','Проверка условий кодом','Время, бюджет и дата ограничивают выдачу.',405,1100,true);
  row(s,'03','Понятный ответ','В приложении отвечают правила. Модель проходит отдельный тест.',535,1100,true);
  label(s,'Локальный тест GPT-5.5 с веб-поиском успешен. Публичные AI-вызовы выключены.',64,650,1110,true);
  note(s,'Данные и AI','Сначала сервис получает реальные записи. Затем код проверяет условия и выбирает допустимые варианты. В показанном чате карточки и объяснение работают по правилам. Отдельный локальный серверный тест GPT-5.5 с веб-поиском завершился успешно, вернул ответ о FORTE KULANSHI ART SPACE и ссылку на Visit Astana. Это подтверждает адаптер и один live-вызов, а не полноценную проверку AI во всех экранах или завершённый персональный RAG. Публичные AI-вызовы выключены. Модель не должна создавать координаты, цены или свободные места. При недоступности провайдера остаётся детерминированный ответ. Точные координаты не нужны модели, когда достаточно рассчитанного расстояния.',[
    'PRD.md, раздел 9. src/server/pilot/smart-assistant.ts, src/server/providers/llm/index.ts.',
    'docs/agent-reports/A-ai-live-test-20261020.md: успешный единичный локальный серверный тест GPT-5.5 с web_search. Полный AI-сценарий в браузере остаётся отдельной проверкой.'
  ]);
}
{
  const s=base(8); title(s,'События из актуальной афиши',680,false,46);
  row(s,'01','Sxodim для Астаны','Факты о событиях приходят по HTTP.\nСсылка ведёт на первоисточник.',285,650);
  row(s,'02','Обновление по запросу','Кэш на час. При сбое остаётся\nпоследний доступный датированный набор.',455,650);
  if(await exists(S.events)) await img(s,S.events,815,70,275,596,'contain','Реальная лента событий с обязательным указанием источника');
  label(s,'Свои иллюстрации, не афиши событий.',810,674,370);
  note(s,'Откуда берутся события','Для мест есть импорт и датированный каталог OpenStreetMap. Для событий подключён ограниченный HTTP-адаптер Sxodim по Астане. Он извлекает сведения со страниц событий, проверяет город, дату и доступные поля. Набор небольшой и зависит от источника. Его количество не является охватом всей городской афиши. Обновление происходит по запросу после истечения часового кэша, а не по запущенному расписанию cron. При сбое возможен датированный snapshot с явным статусом свежести. Обязательная ссылка Давай Сходим ведёт на страницу события. Карточка может показать ссылку на покупку, только когда источник её предоставляет. Изображения категорий являются собственными иллюстрациями. Чужие афиши без подтверждённых прав не скачиваем. Ticketon, Kino.kz, Visit Astana и формы организаторов остаются направлениями развития, а не несколькими уже подключёнными афишами.',[
    'src/server/ingestion/sxodim-live.ts, src/app/api/events/route.ts, data/livedata/sxodim-astana-2026-10-20.json.',
    'docs/agent-reports/A-event-media.md, data/media-policy.json.',
    'https://sxodim.com/astana и https://sxodim.com/polzovatelskoe-soglashenie. Некоммерческий пилот с обязательной ссылкой на источник.',
    `${S.events}: реальный экран, если включён в эту сборку.`
  ]);
}
{
  const s=base(9); title(s,'Память под контролем\nпользователя',650,false,48);
  t(s,'Интересы можно изменить.\nДиалог и историю можно удалить.',67,289,600,90,29,C.jade,true);
  t(s,'Согласие определяет, что сохраняется\nв браузере. Точка старта остаётся\nтолько до закрытия страницы.',67,414,600,116,25,C.muted);
  t(s,'Сохранённый план не означает бронь.\nНеизвестная цена остаётся неизвестной.',67,570,600,80,24,C.ink,true);
  if(await exists(S.privacy)) await img(s,S.privacy,815,70,275,596,'contain','Реальный экран управления локальной памятью');
  label(s,'Локальная память браузера',812,674,420);
  note(s,'Достоверность и приватность','Веб-пилот хранит разрешённые пользователем предпочтения, планы и диалог локально в браузере. Пользователь может управлять согласием и удалять данные. Геопозиция нужна для конкретного расчёта и не сохраняется в постоянную память. Она не должна попадать в публичную ссылку общего плана. При переходе в навигацию точка старта передаётся выбранному внешнему сервису. На телефоне понадобится отдельное защищённое хранилище. Его ещё нельзя считать реализованным. Неизвестная цена не равна бесплатному входу. Наличие мест уточняют у организатора. Сохранение, открытие маршрута и посещение являются разными действиями.',[
    'src/client/local-memory.ts, src/components/PilotApp.tsx. PRD.md, раздел 13.',
    'tests/e2e/qettyq.spec.ts: согласие, сохранение и удаление локальных данных.',
    `${S.privacy}: реальный экран локальной памяти, если включён в эту сборку.`
  ]);
}
{
  const s=base(10,true); title(s,'Пилот начинается с Астаны',1130,true,50);
  t(s,'Сейчас',67,279,290,40,30,C.lime,true);
  t(s,'Локально: свайпы, чат с карточками,\nвекторная карта, план и афиша.\nПубличный сайт пока на старом UI.',67,336,540,120,25,C.white);
  t(s,'Следующая проверка',682,279,510,40,30,C.lime,true);
  t(s,'AI в пользовательском диалоге,\nмаршруты по улицам и польза пилота.\nПосле проверки: Алматы.',682,336,510,120,25,C.white);
  t(s,'Бизнес-гипотеза: инструменты для площадок\nи комиссия за подтверждённое бронирование.',67,500,1110,70,24,C.soft);
  t(s,'Tim Asproyanidi',67,602,480,34,27,C.white,true);
  t(s,'Qaragandy   Boostseller.kz   +7 777 836 85 76',67,646,740,30,19,C.soft);
  t(s,'github.com/timyname/QETTYQ',818,646,395,30,18,C.soft);
  note(s,'Пилот, бизнес и команда','Пилот ограничен Астаной. Локальное веб-приложение включает свайпы, условия, чат с реальными карточками, векторную карту, план с датой и временем, локальную память и ограниченный импорт афиши. Публичный сайт пока показывает предыдущий интерфейс. Локальный серверный тест GPT-5.5 с веб-поиском успешен. Публичный AI выключен. Следующие контрольные точки: проверка AI в пользовательском диалоге, маршрутизация по дорожной сети и проверка полезности на добровольных участниках. Расширение на Алматы последует после проверки пилота. Возможные модели дохода: инструменты площадкам и комиссия за подтверждённое бронирование. Выручку, договоры и пользовательские метрики пока не заявляем. Автор Tim Asproyanidi, команда QETTYQ APP, Qaragandy, Boostseller.kz. Видео и подтверждение подачи заявки являются отдельными материалами.',[
    'Контакты и репозиторий предоставил владелец. https://github.com/timyname/QETTYQ',
    'Состояние локальной версии на 20.10.2026. Доступность публичной версии и внешних провайдеров проверяют отдельно.'
  ]);
}

await fs.mkdir(TMP,{recursive:true}); await fs.mkdir(PRE,{recursive:true});
const finalPath=path.join(OUT,'QETTYQ_APP_pitch_v8.pptx');
if(await exists('exports/QETTYQ_APP_pitch_v8.pptx') || await exists('exports/QETTYQ_APP_pitch_v8.pdf')) throw new Error('v8 exists: use a new revision');
for(const [i,s] of deck.slides.items.entries()) {
  const b=await deck.export({slide:s,format:'png',scale:1});
  await fs.writeFile(path.join(PRE,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));
}
await fs.writeFile(path.join(PRE,'montage.webp'),new Uint8Array(await (await deck.export({format:'webp',montage:true})).arrayBuffer()));
await fs.writeFile(path.join(ROOT,'presentation/copy-v8.md'),'# QETTYQ APP: презентация v8\n\n10 слайдов, 5–7 минут. Реальные экраны локального приложения. Публичная версия и AI обозначены отдельно.\n\n'+copy.join('\n\n'));
const candidatePath=path.join(TMP,'candidate.pptx');
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
if (process.env.QETTYQ_PREVIEW_ONLY === '1') {
  console.log(JSON.stringify({mode:'private-preview',slides:deck.slides.items.length,candidatePath,previews:PRE}));
  process.exit(0);
}
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const referencePath=path.join(OUT,'QETTYQ_APP_pitch_v7.pptx');
const referenceSha256=createHash('sha256').update(await fs.readFile(referencePath)).digest('hex');
await finalizePresentation({workspaceDir:ROOT,candidatePath,finalPath,explicitTotalSlideCount:10,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],pythonExecutable:path.join(RUNTIME,'python/bin/python3'),integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],fontPolicy:{basis:'reference',families:['Arial'],referencePath,referenceSha256},verifyArtifactToolImport:true,receiptPath:path.join(TMP,'QETTYQ_APP_pitch_v8.validation.json')});
try {
  const pdf=await deck.export({format:'pdf'});
  await fs.writeFile(path.join(OUT,'QETTYQ_APP_pitch_v8.pdf'),new Uint8Array(await pdf.arrayBuffer()));
} catch (error) {
  if (!String(error).includes('#standard-fonts/Helvetica')) throw error;
  execFileSync(path.join(RUNTIME,'bin/override/soffice'),['-env:UserInstallation='+pathToFileURL(path.join(TMP,'lo-profile')).href,'--headless','--convert-to','pdf','--outdir',OUT,finalPath],{stdio:'inherit'});
}
console.log(JSON.stringify({slides:deck.slides.items.length,pptx:finalPath,pdf:path.join(OUT,'QETTYQ_APP_pitch_v8.pdf'),previews:PRE}));
