const Q=storage.q,norm=s=>s.name.replaceAll(' / ','/');
const find=(b,n)=>penpotUtils.findShape(s=>norm(s)===n,b);
for(const id of ['12','16','17']){
 const label=find(Q.boards[id],'map/disclosure');if(label){label.y=Q.boards[id].y+569;label.x=Q.boards[id].x+22;label.fontSize='10';}
}
const filters=Q.boards['19'];
if(!find(filters,'row/Доступность'))Q.row(filters,{label:'Доступность',value:'Только подтверждённые свойства'},632,5);
const labels=penpotUtils.findShapes(s=>norm(s).startsWith('row/'),filters);
labels.forEach((s,i)=>{s.y=filters.y+333+i*62;const value=find(filters,'value/'+s.characters);if(value)value.y=filters.y+355+i*62;const bg=find(filters,'content/row-'+i);if(bg){bg.y=filters.y+322+i*62;bg.resize(386,58);}});
const save=find(Q.boards['25'],'route/save-estimate');if(save){for(const old of penpotUtils.findShapes(s=>norm(s)==='icon/bookmark',save))old.remove();Q.icon(save,'check',314,17,20);}
// Make the UI kit page discoverable without making it an application screen.
const kit=penpotUtils.getPageByName('03 · UI kit · layers & states');const flow=penpotUtils.getPageByName('05 · UX flow · four tabs');
penpot.selection=[Q.boards['14']];penpot.viewport.zoomIntoView([Q.boards['14']]);
return {assembly:penpot.currentPage.id,kit:kit.id,flow:flow.id};
