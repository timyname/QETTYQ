const Q=storage.q,U=storage.ui;
storage.feedCarousel={};const FC=storage.feedCarousel;
FC.items=[
 {id:'14',title:'Театр драмы\nим. М. Горького',detail:'21',source:'https://www.openstreetmap.org/node/455447680',media:2},
 {id:'14.dance',title:'Государственный\nтеатр танца',detail:'21.alt',source:'https://www.openstreetmap.org/node/798212555',media:3},
 {id:'14.puppet',title:'Театр кукол',detail:'21.puppet',source:'https://www.openstreetmap.org/node/2349675581',media:2},
];
FC.prepare=()=>{for(const [i,item] of FC.items.entries())if(!Q.boards[item.id])U.board(item.id,item.title.replaceAll('\n',' '),3500+i*510,29000);return{slides:3};};
FC.nav=(shape,target,direction)=>{for(const i of [...shape.interactions])shape.removeInteraction(i);shape.setPluginData('target',target);shape.addInteraction('click',{type:'navigate-to',destination:Q.boards[target],animation:{type:'slide',way:'in',direction,duration:260,easing:'ease-out'}});};
FC.render=(index,uncertain=false)=>{
 const item=FC.items[index],id=uncertain?'15':item.id,b=U.board(id,uncertain?'Место · данные требуют уточнения':index===0?'Для тебя · карусель':'Для тебя · '+item.title.replaceAll('\n',' '));
 Q.header(b,id);Q.chip(b,22,104,118,'120 минут',false,'clock-3');Q.chip(b,147,104,141,'до 5 000 ₸',false,'wallet');U.button(b,298,101,110,44,'Условия','08','secondary',null);
 Q.text(b,22,160,386,'Для тебя',32,700,Q.c.ink,'feed/title');
 const card=penpot.createBoard();Q.place(card,b,22,210,386,592,'feed/candidate-card');card.showInViewMode=false;card.borderRadius=28;card.clipContent=true;card.fills=[{fillColor:'#FFFFFF',fillOpacity:1}];card.strokes=[{strokeColor:'#FFFFFF',strokeOpacity:1,strokeWidth:1,strokeAlignment:'inner',strokeStyle:'solid'}];card.shadows=[{style:'drop-shadow',offsetX:0,offsetY:6,blur:18,spread:0,color:{color:Q.c.deep,opacity:0.1}}];
 const photo=U.pic(card,item.media,0,0,386,515);photo.borderRadius=0;photo.name='candidate/media-3x4';
 const shade=Q.rect(card,0,246,386,269,Q.c.deep,0,'candidate/readability');shade.fills=[{fillColorGradient:{type:'linear',startX:0,startY:0,endX:0,endY:1,width:1,stops:[{color:'#071D18',opacity:0,offset:0},{color:'#071D18',opacity:0.76,offset:0.46},{color:'#071D18',opacity:0.96,offset:1}]}}];
 Q.rect(card,18,18,190,32,'#FFFFFF',16,'candidate/type-pill',0.93);Q.text(card,30,27,166,'МЕСТО · КУЛЬТУРА',10,700,Q.c.deep,'candidate/type');
 Q.text(card,20,324,346,item.title,28,700,'#FFFFFF','candidate/title');
 Q.text(card,20,405,346,'Афишу и стоимость уточните у театра.\nНаличие мест не подтверждено.',13,400,'#FFFFFF','candidate/unknown-label');
 Q.text(card,20,446,346,'Иллюстрация категории · не фото площадки',10,400,'#D8E4DD','candidate/provenance');
 U.hot(card,0,0,386,515,item.detail,false,'candidate/detail-hit');
 const source=Q.text(card,20,479,346,'OpenStreetMap · 19.10.2026 ↗',11,600,'#FFFFFF','candidate/source');U.external(source,item.source);U.external(Q.rect(card,18,464,350,44,'#FFFFFF',0,'candidate/source-hit',0.001),item.source);
 const prev=U.button(card,8,232,44,44,'',null,'secondary','chevron-left',false,'carousel/previous');const next=U.button(card,334,232,44,44,'',null,'secondary','chevron-right',false,'carousel/next');
 const prevId=FC.items[(index+2)%3].id,nextId=FC.items[(index+1)%3].id;
 for(const h of [prev,...penpotUtils.findShapes(()=>true,prev)])FC.nav(h,prevId,'right');for(const h of [next,...penpotUtils.findShapes(()=>true,next)])FC.nav(h,nextId,'left');
 for(const arrow of [prev,next]){arrow.borderRadius=22;arrow.shadows=[];arrow.fills=[{fillColor:'#FFFFFF',fillOpacity:0.86}];}
 const cta=U.button(card,18,530,350,44,'Подробнее',item.detail,'primary');cta.shadows=[];
 Q.text(b,22,814,180,`${index+1} / 3 · листай подборку`,10,600,Q.c.muted,'carousel/status');
 for(let i=0;i<3;i++){const dot=Q.rect(b,300+i*28,814,20,4,i===index?Q.c.jade:Q.c.line,2,'carousel/dot-'+i);U.link(dot,FC.items[i].id);U.hot(b,292+i*28,803,26,30,FC.items[i].id,false,'carousel/dot-hit-'+i);}
 Q.dock(b,'14');
 for(const [label,target] of [['120 минут','08'],['до 5 000 ₸','09']])for(const prefix of ['chip/','chip-label/']){const s=U.find(b,prefix+label);if(s)U.link(s,target);}
 b.setPluginData('carousel-model','Browse only; never writes like/skip');b.setPluginData('prototype-note','Penpot click arrows previews horizontal transitions; actual pointer swiping belongs to web app.');b.setPluginData('candidateSource',item.source);
 return {id,card:[22,210,386,592],image:[0,0,386,515],cta:[18,530,350,44],cardBottom:802,dockTop:842};
};
FC.surfacePolish=()=>{
 let rails=0,rows=0;
 for(const b of Object.values(Q.boards)){
  const rail=U.find(b,'chat/transcript');if(rail){for(const s of penpotUtils.findShapes(()=>true,rail))if(s.shadows?.length)s.shadows=[];rails++;}
  for(const row of penpotUtils.findShapes(s=>s.name.replaceAll(' / ','/').startsWith('content/row-'),b)){row.resize(row.width,56);row.shadows=[{style:'drop-shadow',offsetX:0,offsetY:2,blur:8,spread:0,color:{color:Q.c.deep,opacity:0.04}}];rows++;}
 }
 return {chatRailsWithUnclippedShadows:rails,rowsWithRealGutters:rows};
};
return {ready:true,run:'prepare(), render(0..2), render(0,true), surfacePolish()'};
