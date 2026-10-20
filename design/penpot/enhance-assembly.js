const Q=storage.q;
const page=penpotUtils.getPageByName('02 · App assembly · editable');
penpot.openPage(page);
for(const b of page.root.children){if(b.type==='board'&&b.getPluginData('screenId'))Q.boards[b.getPluginData('screenId')]=b;}
let settings=Q.boards['45'];
if(!settings){
 settings=Q.base({id:'45',title:'Настройки'},44);
 Q.text(settings,22,42,340,'Настройки',34,700,Q.c.ink,'settings/title');
 Q.button(settings,354,28,54,'','close','secondary','x','settings/close');
 Q.text(settings,22,116,386,'Язык интерфейса',16,700,Q.c.ink,'settings/language-label');
 Q.chip(settings,22,158,122,'Русский',true);Q.chip(settings,154,158,122,'Қазақша',false);Q.chip(settings,286,158,122,'English',false);
 Q.text(settings,22,235,386,'Пилот работает в Астане',23,700,Q.c.ink,'settings/city-title');
 Q.text(settings,22,280,386,'Предпочтения, планы и диалог хранятся на устройстве. Точную геолокацию не включаем в постоянную память.',16,400,Q.c.muted,'settings/privacy');
 Q.button(settings,22,402,386,'Память и приватность','34','secondary','chevron-right');
 Q.button(settings,22,476,386,'Источники данных','33','secondary','chevron-right');
 Q.button(settings,22,550,386,'Сохранённые планы','30','secondary','chevron-right');
 Q.button(settings,22,762,386,'Готово','close','primary','check');
 settings.setPluginData('assembled','true');
}
const byName=(b,name)=>penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')===name,b);
const allShapes=()=>penpotUtils.findShapes(()=>true,page.root);
// Add a consistent return control outside the content stack.
const back={ '03':'02','04':'02','05':'04','06':'05','07':'05','08':'05','09':'08','10':'09','11':'10','12':'10','13':'10','15':'14','17':'16','18':'16','19':'16','20':'14','21':'14','22':'27','23':'22','24':'21','25':'24','26':'25','28':'27','29':'27','30':'32','31':'26','33':'32','34':'32','35':'32','36':'35','37':'36','38':'37','39':'38','40':'39','41':'32','42':'14','43':'16','44':'03'};
for(const [id,target] of Object.entries(back)){
 const b=Q.boards[id];if(!byName(b,'chrome/back')){
  const bt=Q.button(b,0,77,44,'',target,'text',null,'chrome/back');Q.icon(bt,'chevron-right',14,18,18).rotation=180;
 }
}
// Keep two-action footers above the dock; no hit target may be covered by it.
for(const b of Object.values(Q.boards)){
 const id=b.getPluginData('screenId');
 const dock=byName(b,'navigation/dock');
 const buttons=penpotUtils.findShapes(s=>s.type==='board'&&s.name.replaceAll(' / ','/').startsWith('action/'),b);
 if(dock&&buttons.length>=2){
  for(const bt of buttons){if(bt.parent.id!==b.id)continue;const yy=bt.y-b.y;if(yy>=810)bt.y=b.y+776;else if(yy>=740&&yy<810)bt.y=b.y+712;}
 }
 if(id==='12'){
  for(const s of penpotUtils.findShapes(s=>s.getPluginData('target')==='13',b))s.setPluginData('target','10');
 }
 if(id==='19'&&dock){dock.blocked=true;dock.opacity=0.35;for(const child of dock.children){for(const it of child.interactions)child.removeInteraction(it);child.setPluginData('target','');}}
}
// Source contacts stay explicit. No unknown organizer link becomes a WhatsApp link.
for(const id of ['21','33']){
 const b=Q.boards[id];b.setPluginData('externalUrl','https://www.openstreetmap.org/node/455447680');
}
for(const id of ['22','23'])Q.boards[id].setPluginData('externalUrl','https://ticketon.kz/astana');
// Interactions are applied to the actual button and marker layers.
let count=0;
for(const s of allShapes()){
 const target=s.getPluginData('target');if(!target)continue;
 for(const it of [...s.interactions])s.removeInteraction(it);
 if(target==='close')s.addInteraction('click',{type:'previous-screen'});
 else if(target==='external'){
  let ancestor=s;while(ancestor.parent&&ancestor.parent.id!=='00000000-0000-0000-0000-000000000000')ancestor=ancestor.parent;
  const url=ancestor.getPluginData('externalUrl');if(url)s.addInteraction('click',{type:'open-url',url});
 }else if(Q.boards[target]){
  const overlay=['03','11','19','31','45'].includes(target);
  if(overlay)s.addInteraction('click',{type:'open-overlay',destination:Q.boards[target],position:'center',closeWhenClickOutside:true,addBackgroundOverlay:true,animation:{type:'dissolve',duration:180,easing:'ease-out'}});
  else s.addInteraction('click',{type:'navigate-to',destination:Q.boards[target],animation:{type:'dissolve',duration:200,easing:'ease-out'}});
 }
 if(s.interactions.length)count++;
}
const overview=Q.boards['14'];penpot.selection=[overview];penpot.viewport.zoomIntoView([overview]);
return {pageId:page.id,boards:Object.keys(Q.boards).length,interactiveLayers:count};
