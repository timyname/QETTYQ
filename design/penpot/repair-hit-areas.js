const Q=storage.q;
const norm=s=>s.name.replaceAll(' / ','/');
const all=Object.values(Q.boards).filter((b,i,list)=>list.findIndex(x=>x.id===b.id)===i);
let repaired=0;
for(const b of all){
 const id=b.getPluginData('screenId');
 const buttons=penpotUtils.findShapes(s=>s.type==='board'&&norm(s).startsWith('action/'),b).filter(s=>s.parent.id===b.id);
 if(['14','15'].includes(id))buttons.forEach(s=>s.y=b.y+763);
 if(['20','21','23','18','30'].includes(id))buttons.forEach(s=>s.y=b.y+762);
 if(['22','31','35','42','44'].includes(id)){
  const y=id==='22'?698:746;buttons.forEach((s,i)=>s.y=b.y+y+i*62);
 }
 const dock=penpotUtils.findShape(s=>norm(s)==='navigation/dock',b);
 if(!dock||id==='19')continue;
 for(const tab of dock.children){
  if(tab.type!=='board')continue;
  const target=tab.getPluginData('target');if(!Q.boards[target])continue;
  tab.fills=[{fillColor:'#FFFFFF',fillOpacity:0.001}];
  // Native text/icon child hit areas share the same destination as their parent.
  for(const shape of [tab,...penpotUtils.findShapes(s=>s.type==='text'||s.type==='group',tab)]){
   for(const old of [...shape.interactions])shape.removeInteraction(old);
   shape.addInteraction('click',{type:'navigate-to',destination:Q.boards[target],animation:{type:'dissolve',duration:200,easing:'ease-out'}});
  }
  repaired++;
 }
}
// Settings close targets really close the overlay without resetting the feed.
const settings=Q.boards['45'];for(const s of penpotUtils.findShapes(s=>s.getPluginData('target')==='close',settings)){
 for(const old of [...s.interactions])s.removeInteraction(old);s.addInteraction('click',{type:'close-overlay',animation:{type:'dissolve',duration:180,easing:'ease-out'}});
}
penpot.selection=[Q.boards['14']];penpot.viewport.zoomIntoView([Q.boards['14']]);
return {dockTabs:repaired};
