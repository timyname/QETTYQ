import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Presentation, PresentationFile } from '/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

// New revision. Earlier decks and exports are intentionally never overwritten.
const ROOT = '/Users/phonelab/Documents/QETTYQ';
const SKILL = '/Users/phonelab/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations';
const RUNTIME = '/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES = path.join(RUNTIME, 'node/node_modules');
const OUT = path.join(ROOT, 'exports');
const TMP = path.join(ROOT, '.codex-presentations/qettyq-v6');
const PRE = path.join(OUT, 'presentation-preview-v6');
const C = { paper:'#F4F6F2', ink:'#102B25', jade:'#0B6E5D', dark:'#0B332D', lime:'#CFFC55', muted:'#5E716B', white:'#FFFFFF', soft:'#C1D1CA' };
const deck = Presentation.create({ slideSize:{ width:1280, height:720 } });
const copy = [];

function t(s, str, x, y, w, h, size=24, color=C.ink, bold=false) {
  const q=s.shapes.add({ geometry:'textbox', position:{left:x,top:y,width:w,height:h}, fill:'none', line:{fill:'none',width:0} });
  q.text=str; q.text.style={typeface:'Arial',fontSize:size,color,bold}; return q;
}
async function img(s, rel, x,y,w,h, fit='contain',alt='') {
  const bytes=await fs.readFile(path.join(ROOT,rel));
  return s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',fit,alt,position:{left:x,top:y,width:w,height:h}});
}
function base(n, dark=false) {
  const s=deck.slides.add(); s.background.fill=dark?C.dark:C.paper;
  t(s,'QETTYQ APP',64,36,330,24,16,dark?C.lime:C.jade,true);
  t(s,String(n).padStart(2,'0'),1160,674,55,22,13,dark?C.soft:C.muted);
  return s;
}
function note(s, heading, body, sources=[]) {
  s.speakerNotes.text=body+'\n\nИсточники и статус:\n'+sources.join('\n');
  copy.push(`## ${copy.length+1}. ${heading}\n\n${body}\n\n${sources.map(x=>'- '+x).join('\n')}`);
}
function title(s,str,w=650,dark=false,size=48) {t(s,str,64,100,w,160,size,dark?C.white:C.ink,true);}
function label(s,str,x=64,y=630,w=680,dark=false) {t(s,str,x,y,w,38,16,dark?C.soft:C.muted);}
function row(s,n,head,body,y,w=600,dark=false) {
  t(s,n,64,y,62,44,27,dark?C.lime:C.jade,true);
  t(s,head,148,y,w-84,40,27,dark?C.white:C.ink,true);
  t(s,body,148,y+48,w-84,72,22,dark?C.soft:C.muted);
}

// 1. One clear outcome, original modern-Astana visual, editable foreground.
{
  const s=base(1);
  await img(s,'presentation/assets/astana-modern-nomad.png',740,0,540,720,'cover','Художественная иллюстрация современной Астаны');
  t(s,'QETTYQ',64,150,650,90,76,C.dark,true);
  t(s,'Куда пойти,\nкогда есть\nсвободное время',64,270,650,225,53,C.jade,true);
  t(s,'Персональные варианты досуга\nпо интересам, времени и бюджету',67,526,590,76,27,C.ink);
  label(s,'Астана. Прототип городского помощника',67,648,600);
  note(s,'Куда пойти в Астане','QETTYQ помогает выбрать, чем заняться в свободное время. Мы начинаем с Астаны. Человек отмечает свои интересы, задаёт время и бюджет, затем получает несколько подходящих вариантов. Презентация показывает новый интерактивный дизайн и отдельно обозначает состояние программного прототипа. Мы не называем все нарисованные функции готовым сервисом.',[
    'PRD.md, разделы 2, 3 и 17. Название и контакты предоставил владелец.',
    'presentation/assets/astana-modern-nomad.png: существующая сгенерированная художественная иллюстрация, не документальная фотография.'
  ]);
}
// 2. Problem and two entry points without dashboard panels.
{
  const s=base(2,true);
  title(s,'Один вечер.\nРазные способы его провести',1120,true,50);
  t(s,'Афиша, карта и бюджет обычно остаются отдельными задачами.\nQETTYQ собирает их вокруг конкретного человека.',67,272,1110,88,28,C.soft);
  row(s,'01','Персональная подборка','Сервис учитывает предпочтения и доступное время.',410,610,true);
  t(s,'02',720,410,62,44,27,C.lime,true);
  t(s,'Самостоятельный выбор',804,410,400,72,27,C.white,true);
  t(s,'Карта помогает посмотреть другие варианты поблизости.',804,495,390,90,22,C.soft);
  note(s,'Два способа выбора','Человеку приходится отдельно смотреть афишу, искать адрес и прикидывать, сколько займёт поездка. Мы связываем эти действия в одном интерфейсе. Есть два равноправных пути. Можно доверить подбор сервису или самому выбрать точку на карте. Любителю рок-концертов не стоит по умолчанию предлагать балет первым вариантом. Но остальные категории остаются доступными. Предпочтения меняют порядок выдачи, а не закрывают город.',['Комментарии владельца к PDF v4: 3, 4, 5. Это продуктовая гипотеза, а не результат исследования пользователей.']);
}
// 3. Two-step onboarding. Whole screenshots remain uncropped.
{
  const s=base(3); title(s,'Сначала интересы.\nПотом условия',600,false,48);
  row(s,'01','15 карточек','Вправо: интересно. Влево: не сейчас.\nПоследний выбор можно отменить.',300,595);
  row(s,'02','Время и бюджет','Геопозиция только с разрешения.\nМожно указать точку вручную.',475,595);
  await img(s,'design/penpot/previews/05.png',700,83,255,553,'contain','Полноэкранная карточка интереса со свайпом');
  await img(s,'design/penpot/previews/08.png',974,83,255,553,'contain','Условия персональной подборки');
  label(s,'Новый интерактивный дизайн. Иллюстрации показывают идеи досуга.',700,647,520);
  note(s,'Два шага настройки','Первый контакт нужен, чтобы понять вкус человека. Пользователь листает пятнадцать идей досуга. Крупная карточка занимает почти весь экран, а подпись появляется во время свайпа. Не сейчас не означает никогда. Последний выбор можно отменить, а настройку интересов можно пропустить. Затем человек указывает время и бюджет. Геопозицию запрашиваем только после объяснения, зачем она нужна. Без разрешения остаётся ручная точка. Две минуты являются целевым временем настройки, но мы пока не выдаём их за измеренную метрику.',['Нативные макеты Penpot 05 и 08 от 20.10.2026. Это дизайн, а не запись работающего браузерного жеста.','15 изображений: существующие художественные иллюстрации категорий.']);
}
// 4. Personal feed.
{
  const s=base(4); title(s,'Подборка,\nкоторую можно объяснить',645,false,48);
  t(s,'До трёх вариантов вместо\nдлинного списка наугад',67,290,575,92,32,C.jade,true);
  t(s,'Карточку можно смахнуть, открыть подробнее\nили посмотреть на карте. Условия подбора\nвсегда доступны сверху.',67,415,570,116,25,C.muted);
  t(s,'Нет цены или расписания?\nПредлагаем уточнить у организатора.',67,567,570,72,24,C.ink,true);
  await img(s,'design/penpot/previews/14.png',802,68,276,598,'contain','Новая лента Для тебя с каруселью и четырьмя разделами');
  label(s,'Интерактивный дизайн',820,674,370);
  note(s,'Персональная выдача','После настройки открывается лента Для тебя. Пользователь видит до трёх вариантов, которые соответствуют заданному контексту. Для каждого мы объясняем, какие интересы совпали и какие условия нужно уточнить. В новом дизайне карточки перелистываются в обе стороны, а нижняя навигация остаётся одинаковой: Для тебя, Поиск, Карта, Профиль. Пример на экране показывает реальное место из каталога, но иллюстрация категории не является фотографией этой площадки. Расписание и стоимость спектакля не подтверждены.',['design/penpot/previews/14.png. Интерактивный дизайн.','Место: театр им. М. Горького, существующий snapshot OpenStreetMap от 19.10.2026. © OpenStreetMap contributors, ODbL.','https://www.openstreetmap.org/copyright']);
}
// 5. Maps and routing deliberately disclose design-only schematic.
{
  const s=base(5,true); title(s,'Карта и план прогулки',620,true,48);
  t(s,'Выбранная точка показывает,\nкак далеко ехать и сколько\nвремени останется на досуг.',67,295,550,133,30,C.white);
  t(s,'В расчёт входят дорога, посещение\nи запас. Неизвестная стоимость\nне превращается в бесплатный вход.',67,473,550,126,24,C.soft);
  await img(s,'design/penpot/previews/16.png',685,84,255,553,'contain','Схематичная карта прототипа с точками');
  await img(s,'design/penpot/previews/24.png',961,84,255,553,'contain','Макет плана и перехода во внешнюю навигацию');
  label(s,'В макетах карта условная. Live-маршрутизация требует проверки.',685,650,545,true);
  note(s,'Карта и маршрут','Карта помогает сравнить варианты относительно выбранной точки. После выбора мероприятия план должен учитывать время дороги, длительность посещения и запас. Если указана конечная точка, учитываем и дорогу до неё. Для навигации человек сможет перейти во внешнее картографическое приложение. Сейчас на слайде условная схема Penpot, а не Google Maps и не дорожная геометрия. В программном прототипе есть приблизительная оценка по координатам. Точную линию по улицам и ETA можно обещать только после проверки маршрутизатора.',['design/penpot/previews/16.png и 24.png. Схемы прототипа.','PRD.md, раздел 8: расчёты выполняет код, неизвестная цена не равна нулю.']);
}
// 6. Chat displays explicit query processing, never hidden chain of thought.
{
  const s=base(6); title(s,'Помощник в привычном чате',665,false,46);
  t(s,'«Хочу в театр. Есть два часа\nи до 5 000 ₸ на человека»',67,300,565,105,31,C.jade,true);
  t(s,'Чат уточняет условия и показывает\nкарточку места или события.\nИз неё доступны детали и карта.',67,448,565,115,25,C.muted);
  t(s,'При нехватке данных помощник\nобъясняет, что именно неизвестно.',67,590,565,70,23,C.ink,true);
  await img(s,'design/penpot/previews/28.png',704,80,247,536,'contain','Состояние поиска в чате с явными этапами обработки');
  await img(s,'design/penpot/previews/29.png',971,80,247,536,'contain','Ответ помощника с карточкой реального места');
  label(s,'Пример диалога в дизайне. Live-вызов AI отдельно проверяем.',704,642,520);
  note(s,'Помощник и карточки в чате','В Поиске можно написать обычным языком: хочу в театр, есть два часа и до пяти тысяч тенге. Помощник сначала извлекает условия. Пользователь должен иметь возможность их исправить. Во время поиска показываем понятные этапы: поиск мест и проверка условий. Это статусы инструментов, а не внутренние рассуждения модели. В ответе появляются до трёх карточек. Карточка фильма в будущем должна показывать реальный сеанс и язык, а не просто постер. Если нет надёжной афиши, помощник предлагает место для уточнения, но не выдумывает спектакль на сегодня. На слайде пример диалога из интерактивного дизайна. Live-генерацию не считаем подтверждённой этим макетом.',['design/penpot/previews/28.png и 29.png. Пример диалога.','Место из snapshot OpenStreetMap, © OpenStreetMap contributors. Иллюстрация категории не является фото театра.']);
}
// 7. Editable high-level architecture as requested by the brief.
{
  const s=base(7,true); title(s,'Как устроен подбор с RAG',1100,true,50);
  row(s,'01','Поиск по городской базе','Подходящие места и события с проверяемыми полями.',282,1100,true);
  row(s,'02','Проверка условий кодом','Время, бюджет и актуальность ограничивают выдачу.',412,1100,true);
  row(s,'03','Короткое объяснение','AI получает найденные записи и объясняет выбор.',542,1100,true);
  note(s,'Данные и RAG','RAG здесь означает поиск по городской базе с последующим объяснением найденного. Сначала сервис получает реальные записи. Затем код проверяет время, бюджет, дату и допустимость предложения. Только после этого модель получает небольшой набор разрешённых сведений и формулирует ответ. Она не создаёт цены, координаты или свободные места. Если модель недоступна, результаты поиска остаются доступны с обычным шаблонным объяснением. Этот fallback полезен для надёжности, но не заменяет проверку полноценного live RAG. Мы не передаём модели точные координаты пользователя, когда для объяснения достаточно рассчитанного расстояния.',['PRD.md, раздел 9. Высокоуровневая проектная схема, не свидетельство live-вызова.','Задание Smart City требует объяснения POI + генерации без низкоуровневых схем.']);
}
// 8. Ingestion and organiser ownership, no invented update guarantees.
{
  const s=base(8); title(s,'События добавляют\nплощадки и организаторы',650,false,47);
  row(s,'01','Проверенные источники','Официальные афиши, разрешённые API\nи открытые данные.',291,625);
  row(s,'02','Проверка перед показом','Дата, адрес, координаты, цена и права\nна изображения. Дубли объединяем.',458,625);
  await img(s,'design/penpot/previews/36.png',810,74,274,594,'contain','Редактируемая форма черновика события');
  label(s,'Дизайн локального черновика',810,674,410);
  note(s,'Откуда берутся события','Места и события имеют разное происхождение. Для мест уже есть автоматизированный импорт OpenStreetMap и сохранённый набор Астаны. Для событий мы рассматриваем официальные афиши площадок, разрешённые API и данные организаторов. Ticketon, Kino.kz, Sxodim, Visit Astana и сайты театров являются кандидатами до проверки условий и доступа. Доступная страница сама по себе не разрешает копирование фотографий. Частоту обновления задаём отдельно для каждого источника. При ошибке сохраняем последний корректный набор и дату проверки. У формы организатора сейчас есть дизайн локального черновика. Публикация должна проходить проверку, а количество посещений само по себе не даёт права обходить модерацию.',['data/source-registry.json и docs/DATA_SOURCES.md: окончательный статус каждого источника нужно сверять перед live-подключением.','design/penpot/previews/36.png: дизайн черновика, не подтверждение модерации/броней.']);
}
// 9. Memory, factual limits and privacy.
{
  const s=base(9); title(s,'Память под контролем\nпользователя',650,false,48);
  t(s,'Интересы можно изменить.\nДиалог и историю можно удалить.',67,289,600,90,29,C.jade,true);
  t(s,'Согласие определяет, что сохраняется.\nГеопозиция нужна для выбранного маршрута,\nа не для постоянного отслеживания.',67,414,600,116,25,C.muted);
  t(s,'Цену и наличие мест уточняем.\nСохранённый план не означает бронь.',67,570,600,80,24,C.ink,true);
  await img(s,'design/penpot/previews/45.png',815,70,275,596,'contain','Настройки устройства и доступ к управлению памятью');
  label(s,'Макет настроек и приватности',812,674,420);
  note(s,'Достоверность и приватность','Профиль содержит явно выбранные интересы и добровольно сохранённую историю, а не скрытые предположения о человеке. Для веб-пилота предусматриваем локальное хранение в браузере. На телефоне нужен отдельный адаптер защищённого хранилища. Его наличие нельзя доказать экраном настройки. Пользователь видит, что сервис помнит, может изменить предпочтения и удалить данные. Геопозиция нужна для конкретного расчёта и не должна попадать в публичную ссылку маршрута. Если цена неизвестна, мы предлагаем уточнить её у организатора. Нет мест пишем только при подтверждении. Сохранение карточки и открытие маршрута не означают бронирование или посещение. Фактическое удаление проверяем отдельно в приложении.',['design/penpot/previews/45.png: дизайн настроек, включая переход к памяти и приватности.','PRD.md, раздел 13. Комментарии владельца 9, 10, 13, 14.']);
}
// 10. Current state, roadmap, business hypothesis and author contacts.
{
  const s=base(10,true); title(s,'Пилот начинается с Астаны',1130,true,50);
  t(s,'Сейчас',67,279,290,40,30,C.lime,true);
  t(s,'Интерактивные макеты\nи программный прототип.\nПеренос нового UI продолжается.',67,336,500,120,26,C.white);
  t(s,'Следующая проверка',682,279,510,40,30,C.lime,true);
  t(s,'Живой RAG, актуальная афиша,\nмаршруты по улицам.\nПосле проверки пилота: Алматы.',682,336,510,120,26,C.white);
  t(s,'Бизнес-гипотеза: инструменты для площадок\nи комиссия за подтверждённое бронирование.',67,500,1110,70,24,C.soft);
  t(s,'Tim Asproyanidi',67,602,480,34,27,C.white,true);
  t(s,'Qaragandy   Boostseller.kz   +7 777 836 85 76',67,646,740,30,19,C.soft);
  t(s,'github.com/timyname/QETTYQ',818,646,395,30,18,C.soft);
  note(s,'Пилот, бизнес и команда','Пилот ограничен Астаной. Сейчас есть программный прототип и новый интерактивный дизайн. Команда переносит новые экраны в веб-приложение и проверяет каждую функцию отдельно. Следующие контрольные точки: подтверждённый live RAG, источник актуальной афиши и маршрутизация по дорожной сети. Затем проверяем полезность на добровольных участниках: время до выбранного плана и долю неподходящих рекомендаций. Это план измерения, а не уже полученная метрика. Расширение на Алматы последует после проверки пилота. Возможные модели дохода: инструменты площадкам и комиссия за подтверждённое бронирование. Договоров, выручки и подтверждённой экономики пока не заявляем. Автор проекта Tim Asproyanidi, QETTYQ APP, Qaragandy, Boostseller.kz. Видео и подтверждение подачи заявки относятся к отдельным материалам и этой презентацией не подтверждаются.',[
    'Контакты и репозиторий предоставил владелец. https://github.com/timyname/QETTYQ',
    'Состояние отражает проверенные границы на момент подготовки 20.10.2026, не утверждает завершение текущей параллельной разработки.'
  ]);
}

await fs.mkdir(TMP,{recursive:true}); await fs.mkdir(PRE,{recursive:true});
const finalPath=path.join(OUT,'QETTYQ_APP_pitch_v6.pptx');
if(await fs.stat(finalPath).then(()=>true).catch(()=>false)) throw new Error('v6 exists: choose a new revision before overwriting');
for(const [i,s] of deck.slides.items.entries()) {
  const b=await deck.export({slide:s,format:'png',scale:1});
  await fs.writeFile(path.join(PRE,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));
}
await fs.writeFile(path.join(PRE,'montage.webp'),new Uint8Array(await (await deck.export({format:'webp',montage:true})).arrayBuffer()));
await fs.writeFile(path.join(ROOT,'presentation/copy-v6.md'),'# QETTYQ APP: презентация v6\n\n10 слайдов, целевой хронометраж 5–7 минут. Новый дизайн показан как дизайн.\n\n'+copy.join('\n\n'));
const candidatePath=path.join(TMP,'candidate.pptx');
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
await finalizePresentation({workspaceDir:ROOT,candidatePath,finalPath,explicitTotalSlideCount:10,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],pythonExecutable:path.join(RUNTIME,'python/bin/python3'),integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(TMP,'QETTYQ_APP_pitch_v6.validation.json')});
try {
  const pdf=await deck.export({format:'pdf'});
  await fs.writeFile(path.join(OUT,'QETTYQ_APP_pitch_v6.pdf'),new Uint8Array(await pdf.arrayBuffer()));
} catch (error) {
  // The bundled Artifact Tool PDF exporter can fail on its internal Helvetica alias.
  // Use the exact validated editable PPTX as the conversion source, with a private profile.
  if (!String(error).includes('#standard-fonts/Helvetica')) throw error;
  execFileSync(path.join(RUNTIME,'bin/override/soffice'),[
    '-env:UserInstallation='+pathToFileURL(path.join(TMP,'lo-profile')).href,
    '--headless','--convert-to','pdf','--outdir',OUT,finalPath
  ],{stdio:'inherit'});
}
console.log(JSON.stringify({slides:deck.slides.items.length,pptx:finalPath,pdf:path.join(OUT,'QETTYQ_APP_pitch_v6.pdf'),previews:PRE}));
