// Executes exclusively through the official Penpot plugin API.
storage.q = {};
const Q = storage.q;
Q.c = {canvas:'#F4F6F2',cold:'#EDF3F5',ink:'#101915',muted:'#68746F',line:'#DCE4DF',jade:'#0B6E5D',deep:'#0B332D',soft:'#DCEFE8',lime:'#CFFC55',warning:'#FFF2C8'};
Q.boards = {};
Q.links = [];
Q.font = penpot.fonts.findByName('Manrope');
Q.shadow = [{style:'drop-shadow',offsetX:0,offsetY:12,blur:28,spread:0,color:{color:'#0B332D',opacity:0.12}}];
Q.place = function(s,p,x,y,w,h,name){p.appendChild(s);s.name=name;s.resize(w,h);s.x=p.x+x;s.y=p.y+y;return s;};
Q.rect = function(p,x,y,w,h,color,r=18,name='surface',opacity=1){const s=Q.place(penpot.createRectangle(),p,x,y,w,h,name);s.fills=[{fillColor:color,fillOpacity:opacity}];s.borderRadius=r;return s;};
Q.panel = function(p,x,y,w,h,name='panel',color='#FFFFFF',r=28){const s=Q.rect(p,x,y,w,h,color,r,name);s.shadows=Q.shadow;s.strokes=[{strokeColor:'#FFFFFF',strokeOpacity:0.9,strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];return s;};
Q.text = function(p,x,y,w,text,size=16,weight=450,color=Q.c.ink,name='copy',align='left'){
  weight=weight===450?400:weight===650?600:weight;
  const t=penpot.createText(String(text));Q.place(t,p,x,y,w,Math.ceil(size*1.4),name);
  if(Q.font){const v=Q.font.variants.find(v=>String(v.fontWeight)===String(weight))||Q.font.variants.find(v=>v.fontWeight==='400');Q.font.applyToText(t,v);}
  t.fontSize=String(size);t.fontWeight=String(weight);t.lineHeight='1.3';t.align=align;t.fills=[{fillColor:color,fillOpacity:1}];t.growType='auto-height';return t;
};
Q.icon = function(p,name,x,y,size=22,color=Q.c.deep){const svg=storage.icons[name]||storage.icons['circle-help'];const g=penpot.createShapeFromSvg(svg.replaceAll('currentColor',color));if(g){Q.place(g,p,x,y,size,size,'icon/'+name);}return g;};
Q.image = function(p,file,x,y,w,h,r=28,name='media/category-illustration'){const media=storage.media[file?.replace('.png','.jpg')];const s=Q.rect(p,x,y,w,h,Q.c.soft,r,name);if(media)s.fills=[{fillImage:media,fillOpacity:1}];return s;};
Q.button = function(p,x,y,w,label,target,variant='primary',icon='arrow-right',name){
  const b=penpot.createBoard();Q.place(b,p,x,y,w,54,name||'action/'+label);b.borderRadius=18;b.clipContent=true;b.showInViewMode=false;
  b.fills=[{fillColor:variant==='primary'?Q.c.deep:'#FFFFFF',fillOpacity:variant==='text'?0:1}];
  if(variant!=='text')b.shadows=Q.shadow;
  const ink=variant==='primary'?'#FFFFFF':Q.c.deep;
  if(label)Q.text(b,16,16,w-(icon?56:32),label,14,650,ink,'label');if(icon)Q.icon(b,icon,w-36,17,20,variant==='primary'?Q.c.lime:ink);
  if(target){b.setPluginData('target',target);Q.links.push({shape:b,target});}return b;
};
Q.chip=function(p,x,y,w,label,selected=false,icon){Q.rect(p,x,y,w,38,selected?Q.c.lime:'#FFFFFF',19,'chip/'+label,0.92);if(icon)Q.icon(p,icon,x+10,y+10,17);Q.text(p,x+(icon?34:12),y+10,w-(icon?40:20),label,12,650,Q.c.deep,'chip-label/'+label);};
Q.header=function(b,id){Q.text(b,22,32,150,'QETTYQ',23,800,Q.c.ink,'chrome/wordmark');Q.text(b,140,28,14,'•',25,800,'#FF6956','chrome/brand-dot');Q.button(b,220,22,125,'Астана','03','secondary','map-pin','chrome/city');const gear=Q.button(b,364,22,44,'','45','secondary',null,'chrome/settings');Q.icon(gear,'settings',11,15,22);};
Q.dock=function(b,id){const active=['16','17','18','19'].includes(id)?2:['27','28','29'].includes(id)?1:['30','32','33','34','35','41','44'].includes(id)?3:0;const d=penpot.createBoard();Q.place(d,b,16,842,398,74,'navigation/dock');d.borderRadius=28;d.fills=[{fillColor:'#FFFFFF',fillOpacity:0.9}];d.shadows=Q.shadow;d.showInViewMode=false;const labels=['Для тебя','Поиск','Карта','Профиль'];const targets=['14','27','16','32'];const icons=['house','search','map','user-round'];for(let i=0;i<4;i++){const t=penpot.createBoard();Q.place(t,d,6+i*97,6,95,62,'tab/'+labels[i]);t.fills=[];t.showInViewMode=false;if(i===active)Q.rect(t,20,2,55,34,Q.c.lime,16,'selected-indicator');Q.icon(t,icons[i],37,9,22);Q.text(t,3,42,89,labels[i],10,650,i===active?Q.c.jade:Q.c.muted,'label','center');t.setPluginData('target',targets[i]);Q.links.push({shape:t,target:targets[i]});}};
Q.base=function(s,index){const b=penpot.createBoard();b.name=s.id+' · '+s.title;b.resize(430,932);b.x=(index%6)*510;b.y=Math.floor(index/6)*1040;b.borderRadius=0;b.clipContent=true;b.fills=[{fillColorGradient:{type:'linear',startX:0,startY:0,endX:1,endY:1,width:1,stops:[{color:Q.c.canvas,opacity:1,offset:0},{color:Q.c.cold,opacity:1,offset:1}]}}];b.setPluginData('screenId',s.id);b.setPluginData('status','editable-design-prototype');Q.boards[s.id]=b;return b;};
Q.heading=function(b,s,y=112){Q.text(b,22,y,386,s.eyebrow,11,650,Q.c.jade,'content/eyebrow');Q.text(b,22,y+27,386,s.headline,34,700,Q.c.ink,'content/headline');const lines=s.headline.split('\n').length;const by=y+32+lines*43;Q.text(b,22,by+8,386,s.body,15,450,Q.c.muted,'content/description');return by+100;};
Q.row=function(b,row,y,index=0){Q.panel(b,22,y,386,70,'content/row-'+index,'#FFFFFF',18);Q.text(b,38,y+12,350,row.label,13,650,Q.c.ink,'row/'+row.label);Q.text(b,38,y+35,350,row.value,13,450,Q.c.muted,'value/'+row.label);};
Q.actions=function(b,s,y){Q.button(b,22,y,386,s.primaryLabel,s.primaryTarget);if(s.secondaryLabel)Q.button(b,22,y+62,386,s.secondaryLabel,s.secondaryTarget,'secondary',null);};
Q.map=function(b,small=false){const y=small?305:92,h=small?280:736;Q.rect(b,0,y,430,h,'#DDE7E2',0,'map/provider-replaceable-base');Q.rect(b,210,y,60,h,'#BDDCE0',28,'map/river-schematic',0.9);for(let i=0;i<6;i++){const road=Q.rect(b,-70,y+i*95,620,13,'#FFFFFF',6,'map/schematic-road-'+i,0.9);road.rotation=i%2?18:-14;}Q.text(b,22,y+h-36,386,'СХЕМА ПРОТОТИПА · НЕ НАВИГАЦИЯ',10,650,Q.c.muted,'map/disclosure');for(let i=0;i<3;i++){const pin=Q.button(b,80+i*92,y+170+(i%2)*100,46,String(i+1),'17','primary',null,'map/marker-'+i);pin.borderRadius=18;}return {y,h};};
Q.render=function(s,index){
 const b=Q.base(s,index),id=s.id,n=Number(id);if(id!=='01')Q.header(b,id);
 if(id==='01'){
   Q.icon(b,'route',167,280,96,Q.c.jade);Q.text(b,94,400,250,'QETTYQ',42,800,Q.c.deep,'brand/wordmark','center');Q.text(b,55,478,320,s.body,15,450,Q.c.muted,'status/restoring','center');Q.actions(b,s,710);
 }else if(id==='02'){
   const bg=Q.image(b,s.media,0,85,430,295,0,'atmosphere/astana-illustration');bg.opacity=0.23;
   Q.heading(b,s,112);const images=['11-coffee-quiet-evening.jpg','15-walk-architecture.jpg','03-ballet-theatre.jpg','14-workshop-creativity.jpg'];
   s.rows.forEach((r,i)=>{const x=22+(i%2)*198,y=356+Math.floor(i/2)*151;Q.image(b,images[i],x,y,188,140,24,'goal/media-'+i);Q.rect(b,x,y+83,188,57,Q.c.deep,18,'goal/shade-'+i,0.83);Q.text(b,x+12,y+95,165,r.label,16,700,'#FFFFFF','goal/title-'+i);Q.text(b,x+12,y+118,165,r.value,10,450,'#FFFFFF','goal/subtitle-'+i);const h=Q.rect(b,x,y,188,140,'#FFFFFF',24,'goal/hit-area-'+i,0);h.setPluginData('target','04');Q.links.push({shape:h,target:'04'});});Q.actions(b,s,697);
 }else if(id==='04'){
   Q.heading(b,s,112);Q.image(b,'12-exhibition-contemporary-art.jpg',60,352,215,287,28,'deck/back-card');const card=Q.image(b,s.media,145,340,215,287,28,'deck/front-card');card.rotation=7;Q.chip(b,40,657,165,'15 идей досуга',true,'layers');Q.chip(b,218,657,172,'Около 2 минут',false,'clock-3');Q.actions(b,s,744);
 }else if(['05','06','07'].includes(id)){
   Q.text(b,22,112,320,'Выбери, что тебе по душе',25,700,Q.c.ink,'content/title');Q.text(b,22,150,386,'Подборка будет учитывать твои интересы',14,450,Q.c.muted,'content/subtitle');Q.rect(b,22,187,386,4,Q.c.line,2,'progress/track');Q.rect(b,22,187,26,4,Q.c.jade,2,'progress/value');Q.text(b,360,164,48,'1 / 15',11,650,Q.c.muted,'progress/count');
   const card=Q.image(b,s.media,40,216,350,467,32,'interest/media-3x4');card.shadows=Q.shadow;if(id==='06')card.rotation=5;if(id==='07')card.rotation=-5;
   Q.rect(b,40,580,350,103,Q.c.deep,28,'interest/caption-surface',0.85);Q.text(b,60,598,310,'ИДЕЯ ДОСУГА · ИЛЛЮСТРАЦИЯ',10,650,'#FFFFFF','interest/provenance');Q.text(b,60,623,310,s.headline.replace('\n',' '),26,700,'#FFFFFF','interest/title');
   if(id!=='05'){Q.chip(b,83,245,264,id==='06'?'ИНТЕРЕСНО':'НЕ СЕЙЧАС',id==='06',id==='06'?'heart':'x');}
   Q.button(b,22,716,187,s.secondaryLabel,s.secondaryTarget,'secondary','x');Q.button(b,221,716,187,s.primaryLabel,s.primaryTarget,'primary','heart');Q.button(b,62,783,306,'Отменить последний выбор','05','text','rotate-ccw');Q.button(b,62,846,306,'К условиям подборки','08','text','arrow-right');
 }else if(['14','15'].includes(id)){
   Q.chip(b,22,104,118,'120 минут',false,'clock-3');Q.chip(b,147,104,141,'до 5 000 ₸',false,'wallet');Q.button(b,298,96,110,'Условия','08','text',null);Q.text(b,22,160,386,s.headline.replace('\n',' '),32,700,Q.c.ink,'feed/title');
   Q.panel(b,22,212,386,600,'feed/candidate-card');Q.image(b,s.media,42,230,346,345,26,'candidate/category-illustration');Q.chip(b,55,530,250,'Иллюстрация категории',false);Q.text(b,42,594,346,s.rows[0].label,25,700,Q.c.ink,'candidate/title');Q.text(b,42,662,346,s.rows[1].value,13,450,Q.c.muted,'candidate/reason');Q.rect(b,42,711,346,40,Q.c.warning,12,'candidate/unknown');Q.text(b,54,722,320,id==='15'?'Цена и расписание требуют уточнения':'Афишу и стоимость уточните у театра',12,650,'#6E5214','candidate/unknown-label');Q.button(b,42,763,346,s.primaryLabel,s.primaryTarget,'primary','arrow-right');
 }else if(['12','16','17'].includes(id)){
   Q.map(b);Q.panel(b,22,112,386,58,'map/search-glass','#FFFFFF',18);Q.icon(b,'search',40,130);Q.text(b,72,131,270,'Событие, место или адрес',15,450,Q.c.muted,'map/search-label');Q.button(b,22,187,112,'Фильтры','19','secondary','sliders-horizontal');Q.button(b,144,187,132,'Списком','18','secondary','list');Q.button(b,286,187,122,'Моя точка','11','secondary','locate-fixed');
   Q.panel(b,16,605,398,id==='12'?260:220,'map/selected-sheet','#FFFFFF',28);Q.image(b,'03-ballet-theatre.jpg',32,621,76,76,18,'preview/media-1x1');Q.text(b,121,626,273,id==='12'?'Выбранная точка':'Театр драмы им. М. Горького',19,700,Q.c.ink,'preview/title');Q.text(b,121,681,270,'Расписание и цена уточняются',12,450,Q.c.muted,'preview/facts');Q.button(b,32,727,366,s.primaryLabel,id==='12'?'10':s.primaryTarget);if(id==='12')Q.text(b,32,796,366,'Точная геопозиция не сохраняется',12,450,Q.c.muted,'privacy/location');
 }else if(['20','21','23'].includes(id)){
   Q.image(b,s.media,22,108,386,420,28,'detail/media');Q.chip(b,38,475,280,'Иллюстрация категории',false);Q.text(b,22,551,386,s.eyebrow,11,650,Q.c.jade,'detail/type');Q.text(b,22,579,386,s.headline,30,700,Q.c.ink,'detail/title');Q.text(b,22,667,386,s.rows[1]?.value||s.body,14,450,Q.c.muted,'detail/facts');Q.text(b,22,704,386,s.rows[2]?.value||'Уточните условия у организатора',14,650,Q.c.muted,'detail/unknown');Q.button(b,22,762,386,s.primaryLabel,s.primaryTarget);
 }else if(['24','25','26'].includes(id)){
   Q.text(b,22,112,386,s.eyebrow,11,650,Q.c.jade,'route/mode');Q.text(b,22,141,386,s.headline.replace('\n',' '),34,700,Q.c.ink,'route/title');Q.map(b,true);
   const r=Q.rect(b,110,388,210,5,Q.c.jade,3,'route/schematic-polyline');r.rotation=-21;Q.chip(b,40,335,350,id==='24'?'Расчёт после выбора точек':'Оценка · требуется проверка',false,'route');Q.panel(b,22,610,386,205,'route/summary');Q.text(b,40,629,350,'A → остановка → B',23,700,Q.c.deep,'route/stop-sequence');Q.text(b,40,671,350,s.rows.slice(0,3).map(r=>r.label+': '+r.value).join('\n'),13,450,Q.c.muted,'route/facts');Q.button(b,40,753,350,s.primaryLabel,s.primaryTarget);
 }else if(['27','28','29'].includes(id)){
   Q.text(b,22,112,386,s.eyebrow,11,650,Q.c.jade,'chat/mode');Q.text(b,22,140,386,s.headline,34,700,Q.c.ink,'chat/title');Q.panel(b,22,274,330,148,'chat/assistant-bubble');Q.icon(b,'sparkles',40,293,20);Q.text(b,40,328,294,s.body,16,450,Q.c.ink,'chat/assistant-message');
   if(id!=='27'){Q.rect(b,97,444,311,74,Q.c.deep,22,'chat/user-bubble');Q.text(b,113,463,278,'Культура, 2 часа и до 5 000 ₸',15,450,'#FFFFFF','chat/user-message');}
   if(id==='29'){Q.panel(b,22,544,386,146,'chat/candidate-card');Q.image(b,'03-ballet-theatre.jpg',34,556,88,118,18,'chat/candidate-media');Q.text(b,138,565,250,'Театр драмы\nим. М. Горького',21,700,Q.c.ink,'chat/candidate-title');Q.text(b,138,626,245,'Цена и афиша уточняются',13,450,Q.c.muted,'chat/candidate-facts');}
   Q.button(b,22,712,386,s.primaryLabel,s.primaryTarget,'secondary','arrow-right');Q.panel(b,16,778,398,54,'chat/composer','#FFFFFF',18);Q.text(b,32,794,310,'Напиши, что хочется сегодня',13,450,Q.c.muted,'chat/input');Q.icon(b,'send',373,795,22);
 }else if(id==='32'){
   Q.text(b,22,112,386,'Твой профиль',34,700,Q.c.ink,'profile/title');Q.panel(b,22,176,386,115,'profile/guest-card');Q.icon(b,'user-round',42,199,42);Q.text(b,104,196,280,'Гость QETTYQ',21,700,Q.c.ink,'profile/name');Q.text(b,104,232,280,'Предпочтения на устройстве',13,450,Q.c.muted,'profile/memory-status');
   const rows=[['15 интересов','Изменить','05'],['Мои планы','Сохранённое','30'],['Стать организатором','Локальный прототип','35'],['Источники','Откуда данные','33'],['Память и приватность','Управлять данными','34']];rows.forEach((r,i)=>Q.button(b,22,320+i*88,386,r[0],r[2],'secondary','chevron-right','profile/'+r[0]));
 }else if(['30','18','41'].includes(id)){
   Q.heading(b,s,112);s.rows.slice(0,4).forEach((r,i)=>{const y=330+i*105;Q.panel(b,22,y,386,92,'list/card-'+i);if(s.media)Q.image(b,s.media,32,y+10,70,70,18,'list/media-'+i);Q.text(b,s.media?116:38,y+16,s.media?270:348,r.label,16,650,Q.c.ink,'list/title-'+i);Q.text(b,s.media?116:38,y+47,s.media?270:348,r.value,12,450,Q.c.muted,'list/meta-'+i);});Q.button(b,22,762,386,s.primaryLabel,s.primaryTarget);
 }else if(['22','31','35','42','44'].includes(id)){
   Q.heading(b,s,112);if(s.media){Q.image(b,s.media,22,342,386,257,28,'content/illustration');Q.chip(b,40,549,340,'Иллюстрация · дизайн прототипа',false);}else{Q.panel(b,133,343,164,164,'content/status-symbol',Q.c.soft,46);Q.icon(b,id==='31'?'share-2':'search',185,393,60,Q.c.jade);}
   Q.text(b,22,622,386,s.rows.slice(0,2).map(r=>r.label+' · '+r.value).join('\n'),14,450,Q.c.muted,'content/summary');Q.actions(b,s,s.dock?698:746);
 }else if(id==='13'){
   Q.heading(b,s,112);Q.icon(b,'route',151,350,128,Q.c.jade);s.rows.forEach((r,i)=>{Q.icon(b,'check',28,535+i*62,20,Q.c.jade);Q.text(b,64,533+i*62,320,r.label,16,650,Q.c.ink,'check/'+r.label);});Q.actions(b,s,744);
 }else{
   const start=Q.heading(b,s,112);let y=Math.max(320,start+4);const cap=s.dock?5:5;const rows=s.rows.slice(0,cap);rows.forEach((r,i)=>{Q.row(b,r,y+i*84,i);});
   if(id==='08'||id==='09'){const yy=y+rows.length*84+8;if(yy<748){Q.rect(b,38,yy,352,6,Q.c.line,3,'slider/track');Q.rect(b,38,yy,220,6,Q.c.jade,3,'slider/value');Q.rect(b,249,yy-7,20,20,Q.c.jade,10,'slider/thumb');}}
   Q.actions(b,s,s.dock?760:784);
 }
 if(s.dock)Q.dock(b,id);b.setPluginData('assembled','true');return {id:s.id,boardId:b.id,name:b.name};
};
return {ready:true,font:Q.font?.name,media:Object.keys(storage.media||{}).length};
