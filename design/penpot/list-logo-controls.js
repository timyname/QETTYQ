// Definition-only batch. Run after chat-ui-native.js; root invokes one build at a time.
// Does not change app files, logos, forms, routes24, sharing or deletion flows.
const Q=storage.q,U=storage.ui;
if(!Q?.boards||!U?.board||!Array.isArray(storage.placeData))throw new Error('Initialize storage.q, storage.ui and storage.placeData first');
storage.repairList={};const R=storage.repairList;
R.records={
 gorky:storage.placeData.find(p=>p.id==='osm:node:455447680'),
 dance:storage.placeData.find(p=>p.id==='osm:node:798212555'),
 puppet:storage.placeData.find(p=>p.id==='osm:node:2349675581')
};
for(const [key,p] of Object.entries(R.records))if(!p?.sourceUrl)throw new Error('Missing snapshot source: '+key);
R.titles={gorky:'Театр драмы\nим. М. Горького',dance:'Государственный\nтеатр танца',puppet:'Театр кукол'};
R.details={gorky:'21',dance:'21.alt',puppet:'21.puppet'};
R.maps={gorky:'17',dance:'17.alt',puppet:'17.puppet'};
R.origins={gorky:'12.selected',dance:'12.selected.dance',puppet:'12.selected.puppet'};
R.norm=s=>s.name.replaceAll(' / ','/');
R.tree=s=>[s,...penpotUtils.findShapes(()=>true,s)];
R.bind=(s,target)=>{if(s)for(const n of R.tree(s))U.link(n,target);return s;};
R.source=(b,p,x,y,w=386)=>{const hit=Q.rect(b,x,y,w,44,'#FFFFFF',0,'source/hit',0.001);U.external(hit,p.sourceUrl);const text=Q.text(b,x+10,y+14,w-20,'OpenStreetMap · 19.10.2026 ↗',12,600,Q.c.jade,'source/label');U.external(text,p.sourceUrl);b.setPluginData('sourceUrl',p.sourceUrl);b.setPluginData('candidateId',p.id);b.setPluginData('dataMode','snapshot');};
R.mapLinks=(b,origin=false)=>{
 const keys=['gorky','dance','puppet'];
 keys.forEach((key,i)=>R.bind(U.find(b,'map/marker-'+i),origin?R.origins[key]:R.maps[key]));
 const disclosure=U.find(b,'map/disclosure');if(disclosure){disclosure.x=b.x+22;disclosure.y=b.y+557;disclosure.resize(386,20);}
};
R.prepare=()=>{
 const defs=[['21.puppet','Театр кукол'],['17.puppet','Театр кукол · карта'],['41.empty','Событий в разделе нет'],['12.search','Поиск точки старта'],['12.selected','Точка старта · театр Горького'],['12.selected.dance','Точка старта · театр танца'],['12.selected.puppet','Точка старта · театр кукол']];
 defs.forEach(([id,title],i)=>{if(!Q.boards[id])U.board(id,title,5300+(i%4)*510,22000+Math.floor(i/4)*1040);});
 return {prepared:defs.map(([id])=>id)};
};
R.buildPuppetDetails=()=>{
 const p=R.records.puppet,b=U.board('21.puppet','Театр кукол',5300,22000);Q.header(b,'21.puppet');
 U.pic(b,2,22,108,386,360);Q.rect(b,38,422,268,28,Q.c.deep,14,'detail/illustration-label',0.9);Q.text(b,50,429,246,'Иллюстрация категории',11,600,'#FFFFFF','detail/provenance');
 Q.text(b,22,496,386,p.name,30,700,Q.c.ink,'detail/title');Q.text(b,22,546,386,'Астана · место из сохранённой базы',14,600,Q.c.muted,'detail/type');
 Q.text(b,22,582,386,'Цена, расписание и язык постановок\nнеизвестны. Наличие мест уточняйте\nу организатора.',14,400,Q.c.muted,'detail/unknown');
 R.source(b,p,22,662);U.button(b,22,726,386,52,'Откуда начнём маршрут?','10','primary','route');U.button(b,22,790,386,52,'К списку мест','18','secondary','list');
 b.setPluginData('status','editable-design-prototype');return {built:'21.puppet',candidate:p.id};
};
R.buildPuppetMap=()=>{
 const p=R.records.puppet,b=U.board('17.puppet','Театр кукол · карта',5810,22000);Q.header(b,'17.puppet');Q.map(b);R.mapLinks(b,false);
 Q.panel(b,22,112,386,58,'map/search-glass','#FFFFFF',18);Q.icon(b,'search',40,131,20);Q.text(b,72,132,310,'Событие, место или адрес',14,400,Q.c.muted,'map/search-label');U.hot(b,22,112,386,58,'27',false,'map/search-hit');
 U.button(b,22,188,122,48,'Фильтры','19','secondary','sliders-horizontal',true);U.button(b,154,188,122,48,'Списком','18','secondary','list');U.button(b,286,188,122,48,'Моя точка','10','secondary','locate-fixed');
 Q.panel(b,16,590,398,234,'map/selected-sheet');U.pic(b,2,32,606,76,76);Q.text(b,122,610,268,p.name,23,700,Q.c.ink,'map/selected-title');Q.text(b,122,650,268,'Цена и афиша неизвестны',12,400,Q.c.muted,'map/selected-meta');
 R.source(b,p,32,690,366);U.button(b,32,752,366,52,'Подробнее','21.puppet','primary');Q.dock(b,'16');return {built:'17.puppet'};
};
R.buildList=()=>{
 const b=U.board('18','Места списком');Q.header(b,'18');Q.text(b,22,112,386,'Что есть в городе',30,700,Q.c.ink,'list/title');Q.text(b,22,158,386,'Астана · сохранённые места\nРасписание и стоимость требуют уточнения.',14,400,Q.c.muted,'list/subtitle');
 ['gorky','dance','puppet'].forEach((key,i)=>{
  const y=224+i*156,p=R.records[key],target=R.details[key];Q.panel(b,22,y,386,136,'list/card-'+i,'#FFFFFF',22);U.pic(b,2,36,y+16,86,86);
  const title=Q.text(b,138,y+15,250,R.titles[key],17,700,Q.c.ink,'list/title-'+i);const meta=Q.text(b,138,y+68,250,'Театр · цена и афиша\nне подтверждены',12,400,Q.c.muted,'list/meta-'+i);
  Q.text(b,36,y+112,350,'Снимок 19.10.2026 · иллюстрация категории',10,400,Q.c.muted,'list/provenance-'+i);
  // Last-added native hit layers are above photo/text, disjoint from other CTAs.
  U.hot(b,36,y+16,86,86,target,false,'list/media-hit-'+i);U.hot(b,138,y+12,250,50,target,false,'list/title-hit-'+i);U.hot(b,138,y+64,250,42,target,false,'list/meta-hit-'+i);
  U.link(title,target);U.link(meta,target);U.link(U.find(b,'list/card-'+i),target);
 });
 U.button(b,22,748,386,52,'Посмотреть на карте','16','primary','map');Q.dock(b,'16');return {built:'18',targets:Object.values(R.details)};
};
R.buildOrganizerEmpty=()=>{
 const b=U.board('41.empty','Событий в разделе нет',6320,22000);Q.header(b,'41.empty');Q.text(b,22,112,386,'Пока здесь пусто',30,700,Q.c.ink,'organizer-empty/title');Q.panel(b,22,194,386,232,'organizer-empty/explanation');Q.icon(b,'layers',42,216,32,Q.c.jade);
 Q.text(b,42,270,346,'Нет подтверждённых событий',19,700,Q.c.ink,'organizer-empty/heading');Q.text(b,42,316,346,'Проверка и публикация пока не подключены.\nОпубликованных и завершённых событий\nв этом прототипе нет.',14,400,Q.c.muted,'organizer-empty/body');
 U.button(b,22,484,386,52,'Вернуться к моим событиям','41','primary');U.button(b,22,550,386,52,'Открыть локальный черновик','36');return {built:'41.empty',fakePublishing:false};
};
R.buildOrganizerList=()=>{
 const b=U.board('41','Мои события');Q.header(b,'41');Q.text(b,22,112,386,'Мои события',30,700,Q.c.ink,'organizer-list/title');Q.text(b,22,160,386,'Только локальные черновики.\nПубликация пока недоступна.',14,400,Q.c.muted,'organizer-list/disclosure');
 const rows=[['Черновики','Продолжить локальное оформление','36'],['На проверке','Сервис проверки не подключён','41.empty'],['Опубликованы','Нет опубликованных событий','41.empty'],['Завершены','Нет завершённых событий','41.empty']];
 rows.forEach(([title,meta,target],i)=>{const y=236+i*112;Q.panel(b,22,y,386,94,'organizer-list/row-'+i,'#FFFFFF',20);Q.text(b,40,y+16,316,title,17,700,Q.c.ink,'organizer-list/title-'+i);Q.text(b,40,y+50,316,meta,12,400,Q.c.muted,'organizer-list/meta-'+i);Q.icon(b,'chevron-right',366,y+35,20);U.hot(b,22,y,386,94,target,false,'organizer-list/hit-'+i);});
 U.button(b,22,736,386,52,'Продолжить черновик','36','primary');U.button(b,22,800,386,52,'В профиль','32','secondary','user-round');return {built:'41'};
};
R.buildOriginSelected=(key='gorky')=>{
 if(!R.records[key])throw new Error('Unknown origin example');const p=R.records[key],id=R.origins[key],i=['gorky','dance','puppet'].indexOf(key),b=U.board(id,'Точка старта · '+p.name,5300+i*510,24080);Q.header(b,id);Q.map(b);R.mapLinks(b,true);
 Q.panel(b,22,112,386,58,'origin/search');Q.icon(b,'search',40,131,20);Q.text(b,72,132,310,'Найти место старта',14,400,Q.c.muted,'origin/search-label');U.hot(b,22,112,386,58,'12.search',false,'origin/search-hit');
 Q.panel(b,16,590,398,292,'origin/selected-sheet');Q.text(b,32,610,366,'Пример точки старта',13,600,Q.c.jade,'origin/type');Q.text(b,32,644,366,R.titles[key],23,700,Q.c.ink,'origin/selected-title');Q.text(b,32,712,366,'Место из сохранённой базы, не ваша\nгеопозиция. Карта — схема прототипа.',12,400,Q.c.muted,'origin/privacy');R.source(b,p,32,754,366);
 U.button(b,32,812,366,52,'Использовать эту точку','10','primary','map-pin');U.button(b,22,178,128,44,'Назад','12','secondary','chevron-left');b.setPluginData('originPlaceId',p.id);b.setPluginData('preciseLocationCaptured','false');return {built:id,originExample:p.id};
};
R.buildOriginSearch=()=>{
 const b=U.board('12.search','Поиск точки старта',6830,22000);Q.header(b,'12.search');Q.text(b,22,112,386,'Где начнём?',30,700,Q.c.ink,'origin-search/title');Q.text(b,22,158,386,'Поиск по сохранённым местам Астаны.\nЭто не поиск всех адресов города.',14,400,Q.c.muted,'origin-search/disclosure');
 Q.panel(b,22,224,386,58,'origin-search/query','#FFFFFF',18);Q.icon(b,'search',40,243,20);Q.text(b,76,242,290,'Театр',16,600,Q.c.ink,'origin-search/query-text');Q.text(b,22,298,386,'Пример поиска · снимок 19.10.2026',11,400,Q.c.muted,'origin-search/example');
 ['gorky','dance','puppet'].forEach((key,i)=>{const y=336+i*108;Q.panel(b,22,y,386,92,'origin-search/result-'+i,'#FFFFFF',20);Q.text(b,40,y+14,330,R.titles[key],16,600,Q.c.ink,'origin-search/result-title-'+i);Q.text(b,40,y+66,330,'Место в Астане · OpenStreetMap',11,400,Q.c.muted,'origin-search/result-meta-'+i);U.hot(b,22,y,386,92,R.origins[key],false,'origin-search/result-hit-'+i);});
 U.button(b,22,754,386,52,'Вернуться к выбору на карте','12','primary','map');return {built:'12.search',liveGeocoding:false};
};
R.patchOrigin=()=>{
 const b=Q.boards['12'];if(!b)throw new Error('Missing screen12');R.mapLinks(b,true);
 for(const name of ['map/search-glass','map/search-label','icon/search'])R.bind(U.find(b,name),'12.search');
 for(const s of penpotUtils.findShapes(s=>R.norm(s).startsWith('origin/repair-'),b))s.remove();
 U.hot(b,22,112,386,58,'12.search',false,'origin/repair-search-hit');
 const title=U.find(b,'preview/title'),facts=U.find(b,'preview/facts');if(title)title.characters='Выберите место старта';if(facts){facts.characters='Точки из снимка · не ваша геопозиция';facts.fontSize='11';}
 // Replace the old footer rather than layering a second CTA over its hit area.
 for(const s of [...b.children].filter(s=>s.type==='board'&&R.norm(s).startsWith('action/')&&s.y-b.y>=700))s.remove();
 U.button(b,32,727,366,54,'Продолжить с выбранной точкой','10','primary','arrow-right',false,'origin/repair-use');
 return {patched:'12',markerTargets:Object.values(R.origins),search:'12.search',use:'10'};
};
return {defined:Object.keys(R).filter(k=>typeof R[k]==='function'),execute:'prepare, then one build per call; patchOrigin last',actualMutations:false};
