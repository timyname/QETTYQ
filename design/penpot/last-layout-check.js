const Q=storage.q,norm=s=>s.name.replaceAll(' / ','/');
for(const id of ['14','15']){
 const b=Q.boards[id];const conditions=penpotUtils.findShape(s=>norm(s)==='action/Условия',b);
 conditions.x=b.x+298;conditions.y=b.y+96;
 conditions.fills=[{fillColor:'#FFFFFF',fillOpacity:0.001}];
 for(const s of penpotUtils.findShapes(s=>s.type==='text',conditions))s.addInteraction('click',{type:'navigate-to',destination:Q.boards['08'],animation:{type:'dissolve',duration:200,easing:'ease-out'}});
}
const boards=penpot.currentPage.root.children.filter(s=>s.type==='board'&&(s.getPluginData('screenId')==='05'||s.getPluginData('screenId').startsWith('05.')||['06','07'].includes(s.getPluginData('screenId'))));
for(const b of boards){
 const title=penpotUtils.findShape(s=>norm(s)==='interest/title',b);title.y=b.y+613;title.fontSize='24';title.lineHeight='1.2';
 const provenance=penpotUtils.findShape(s=>norm(s)==='interest/provenance',b);provenance.y=b.y+591;
}
penpot.selection=[Q.boards['14']];penpot.viewport.zoomIntoView([Q.boards['14']]);
return {conditionsRestored:true,swipeCaptions:boards.length};
