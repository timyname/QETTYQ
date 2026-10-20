const Q=storage.q;
penpot.openPage(Q.page||penpotUtils.getPageByName('02 · App assembly · editable'));
const norm=s=>s.name.replaceAll(' / ','/');
const find=(b,name)=>penpotUtils.findShape(s=>norm(s)===name,b);
const generic=['03','08','09','10','11','19','33','34','36','37','38','39','40','43'];
for(const id of generic){
 const b=Q.boards[id];const rows=penpotUtils.findShapes(s=>norm(s).startsWith('content/row-'),b);
 rows.forEach((row,i)=>{row.y=b.y+322+i*72;row.resize(386,62);const title=find(b,'row/'+(penpotUtils.findShapes(s=>norm(s).startsWith('row/'),b)[i]?.characters||''));});
 for(const s of penpotUtils.findShapes(s=>norm(s).startsWith('row/'),b)){
  const raw=norm(s).slice(4);const labels=penpotUtils.findShapes(s=>norm(s).startsWith('row/'),b);const i=labels.indexOf(s);s.y=b.y+333+i*72;s.fontSize='13';
  const value=find(b,'value/'+raw);if(value){value.y=b.y+355+i*72;value.fontSize='12';value.lineHeight='1.25';}
 }
 if(['08','09'].includes(id)){
  const row=rows[0];row.fills=[{fillColor:Q.c.soft,fillOpacity:1}];
 }
 const actions=penpotUtils.findShapes(s=>s.type==='board'&&norm(s).startsWith('action/'),b).filter(s=>s.parent.id===b.id);
 if(find(b,'navigation/dock')){
  actions.forEach((a,i)=>{a.y=b.y+704+i*62;});
 }
}
// Hide duplicate search quick-actions left by an interrupted import.
const search=Q.boards['27'];for(const name of ['search/cinema','search/map']){
 const matches=penpotUtils.findShapes(s=>norm(s)===name,search);if(matches.length>1)for(const s of matches.slice(0,-1))s.remove();
}
// Additional semantic connections that belong to visible controls.
for(const id of ['16','17','12']){const s=find(Q.boards[id],'map/search-glass');s.addInteraction('click',{type:'navigate-to',destination:Q.boards['27'],animation:{type:'dissolve',duration:200,easing:'ease-out'}});}
const warning=find(Q.boards['14'],'candidate/unknown');warning.addInteraction('click',{type:'navigate-to',destination:Q.boards['15'],animation:{type:'dissolve',duration:200,easing:'ease-out'}});
const result=find(Q.boards['29'],'chat/candidate-card');result.addInteraction('click',{type:'navigate-to',destination:Q.boards['21'],animation:{type:'dissolve',duration:200,easing:'ease-out'}});
// The current route demo uses a clearly labelled provider-placeholder view.
for(const id of ['24','25','26']){
 const b=Q.boards[id];
 const label=find(b,'route/mode');if(id==='24')label.characters='ПРЕДПРОСМОТР · ПРОВАЙДЕР НЕ ПОДКЛЮЧЁН';
 if(id==='25'){const line=find(b,'route/schematic-polyline');line.hidden=true;}
 const primary=penpotUtils.findShapes(s=>s.type==='board'&&norm(s).startsWith('action/'),b).filter(s=>s.parent.id===b.id)[0];
 if(primary&&id!=='24'&&!primary.interactions.length){primary.opacity=0.45;primary.setPluginData('disabled-reason','Подключение провайдера требуется для внешней навигации');}
}
// Shared palette lives in the actual Penpot library.
const library=penpot.library.local;
for(const [name,color] of Object.entries(Q.c)){let c=library.colors.find(c=>c.name==='QETTYQ/'+name||c.name==='QETTYQ / '+name);if(!c){c=library.createColor();c.name='QETTYQ/'+name;c.color=color;}}
Q.page=penpot.currentPage;
penpot.selection=[Q.boards['14']];penpot.viewport.zoomIntoView([Q.boards['14']]);
return {polished:generic.length,colors:library.colors.length};
