const Q=storage.q;
let p=penpotUtils.getPageByName('03 · UI kit · layers & states');
if(!p){p=penpot.createPage();p.name='03 · UI kit · layers & states';}
penpot.openPage(p);
let b=penpotUtils.findShape(s=>s.name==='QETTYQ · Design system',p.root);
if(!b){
 b=penpot.createBoard();b.name='QETTYQ · Design system';b.resize(1460,1440);b.fills=[{fillColor:Q.c.canvas,fillOpacity:1}];
 Q.text(b,48,42,1300,'QETTYQ / Interface system',46,700,Q.c.deep,'title');
 Q.text(b,48,110,1300,'430 × 932 · Manrope · Lucide · 4 tabs · restrained liquid glass',18,400,Q.c.muted,'subtitle');
 let i=0;for(const [key,color] of Object.entries(Q.c)){
  const x=48+(i%6)*225,y=180+Math.floor(i/6)*150;
  Q.rect(b,x,y,200,84,color,22,'token/'+key);Q.text(b,x,y+94,200,key+' / '+color,13,600,Q.c.ink,'label/'+key);i++;
 }
 const states=['Default','Hover','Focus','Pressed','Loading','Disabled','Success','Error'];
 for(let i=0;i<states.length;i++){
  const x=48+(i%4)*350,y=550+Math.floor(i/4)*110;
  const bt=Q.button(b,x,y,315,states[i],null,i===7?'secondary':'primary',i===4?'rotate-ccw':i===6?'check':'arrow-right','button/'+states[i]);
  if(i===5)bt.opacity=0.45;
  if(i===1)bt.shadows=[{style:'drop-shadow',offsetX:0,offsetY:16,blur:34,color:{color:Q.c.deep,opacity:0.22}}];
  if(i===2)bt.strokes=[{strokeColor:'#175CC2',strokeWidth:2,strokeStyle:'solid',strokeAlignment:'outer'}];
  if(i===3){bt.resize(309,52);bt.y+=1;}
  if(i===6){bt.fills=[{fillColor:Q.c.soft,fillOpacity:1}];const t=penpotUtils.findShape(s=>s.name==='label',bt);t.fills=[{fillColor:Q.c.deep,fillOpacity:1}];}
  if(i===7)bt.strokes=[{strokeColor:'#A9343E',strokeWidth:1,strokeStyle:'solid',strokeAlignment:'inner'}];
 }
 Q.text(b,48,820,1300,'Motion: 220 ms page · 180 ms sheet · 260 ms swipe · reduced motion: dissolve',17,600,Q.c.deep,'motion');
 Q.text(b,48,866,1300,'Layers: atmosphere → media → content → facts/source → actions → navigation → overlay',17,400,Q.c.muted,'layer-order');
 Q.text(b,48,920,1300,'44 px minimum action · 22 px side inset · 28/32 px card radius · 3:4 interests · 1:1 map preview',17,400,Q.c.muted,'geometry');
 const nav=penpot.createBoard();Q.place(nav,b,48,1000,430,380,'Navigation component');nav.fills=[{fillColor:Q.c.cold,fillOpacity:1}];
 Q.text(nav,22,30,386,'Четыре раздела',28,700,Q.c.ink,'heading');
 Q.text(nav,22,90,386,'Для тебя / Поиск / Карта / Профиль\nНастройки — шестерёнка сверху справа',16,400,Q.c.muted,'rule');
 Q.dock(nav,'14');
 const dock=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='navigation/dock',nav);dock.y=nav.y+250;
 for(const child of dock.children){for(const it of [...child.interactions])child.removeInteraction(it);child.setPluginData('target','');}
}
penpot.viewport.zoomIntoView([b]);return {page:p.id,kit:b.id};
