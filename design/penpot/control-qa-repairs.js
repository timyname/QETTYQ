const Q=storage.q,U=storage.ui,norm=s=>s.name.replaceAll(' / ','/');
storage.finalQA={};const F=storage.finalQA;
F.one=ids=>{
 let bound=0,logos=0;
 for(const id of ids){const b=Q.boards[id];
  for(const s of penpotUtils.findShapes(()=>true,b)){
   if(s.hidden)continue;const target=s.getPluginData('target');
   if(target&&Q.boards[target]&&!s.interactions.some(i=>i.trigger==='click')){U.link(s,target,['03','11','19','31','45'].includes(target));bound++;}
  }
  const undo=U.find(b,'action/undo');if(undo&&!undo.interactions.length)undo.setPluginData('disabled-reason','Пока нет выбора для отмены');
  const logo=penpotUtils.findShape(s=>s.type==='text'&&(norm(s)==='chrome/wordmark'||norm(s)==='brand/wordmark'),b);
  if(logo){U.link(logo,'14');logos++;if(!U.find(b,'chrome/logo-hit'))U.hot(b,Math.max(0,logo.x-b.x-4),Math.max(0,logo.y-b.y-8),Math.min(164,b.width),44,'14',false,'chrome/logo-hit');}
  for(const button of penpotUtils.findShapes(s=>s.type==='board'&&s.interactions.some(i=>i.trigger==='click'),b)){
   if(norm(button).startsWith('tab/'))button.fills=[{fillColor:'#FFFFFF',fillOpacity:0.001}];
   const interaction=button.interactions.find(i=>i.trigger==='click');
   for(const child of penpotUtils.findShapes(s=>s.type==='text'||s.type==='path'||s.type==='group',button))if(!child.interactions.length)child.addInteraction('click',interaction.action);
  }
  const disclosure=U.find(b,'map/disclosure');if(disclosure){
   if(['24','25','26'].includes(id)){disclosure.y=b.y+590;for(let i=0;i<3;i++){const pin=U.find(b,'map/marker-'+i);if(pin)pin.hidden=true;}}
   else disclosure.y=b.y+250;
  }
 }
 return {boards:ids.length,bound,logos};
};
F.arrange=()=>{
 const all=Object.values(Q.boards).sort((a,b)=>{const x=a.getPluginData('screenId'),y=b.getPluginData('screenId');const xb=x.length===2,yb=y.length===2;return xb!==yb?(xb?-1:1):x.localeCompare(y,undefined,{numeric:true});});
 all.forEach((b,i)=>{b.x=(i%6)*510;b.y=Math.floor(i/6)*1040;});
 let removed=0;for(const flow of [...penpot.currentPage.flows])if(/^Flow [0-9]+$/.test(flow.name)){flow.remove();removed++;}
 penpot.selection=[Q.boards['27']];penpot.viewport.zoomIntoView(penpot.selection);
 return {boards:all.length,grid:'6 columns, no overlaps',generatedFlowsRemoved:removed};
};
return {ready:true,run:'storage.finalQA.one(ids) in small batches; then arrange()'};
