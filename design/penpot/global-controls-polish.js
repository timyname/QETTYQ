const Q=storage.q,U=storage.ui,norm=s=>s.name.replaceAll(' / ','/');
let logos=0,childHits=0;
for(const b of Object.values(Q.boards)){
 const logo=penpotUtils.findShape(s=>s.type==='text'&&(norm(s)==='chrome/wordmark'||norm(s)==='brand/wordmark'),b);
 if(logo){U.link(logo,'14');const existing=U.find(b,'chrome/logo-hit');if(existing)existing.remove();U.hot(b,Math.max(0,logo.x-b.x-4),Math.max(0,logo.y-b.y-8),Math.min(164,b.width),44,'14',false,'chrome/logo-hit');logos++;}
 for(const button of penpotUtils.findShapes(s=>s.type==='board'&&s.interactions.some(i=>i.trigger==='click'),b)){
  const interaction=button.interactions.find(i=>i.trigger==='click');
  for(const child of penpotUtils.findShapes(s=>s.type==='text'||s.type==='path'||s.type==='group',button))if(!child.interactions.length){child.addInteraction('click',interaction.action);childHits++;}
 }
}
for(const id of ['14','15']){
 const b=Q.boards[id];for(const [label,target] of [['120 минут','08'],['до 5 000 ₸','09']])for(const prefix of ['chip/','chip-label/']){const s=U.find(b,prefix+label);if(s)U.link(s,target);}
 for(const name of ['feed/candidate-card','candidate/category-illustration','candidate/title','candidate/reason']){const s=U.find(b,name);if(s)U.link(s,'21');}
}
for(const id of ['16','17','17.alt']){const b=Q.boards[id];if(!b)continue;const s=U.find(b,'map/search-glass');if(s)U.hot(b,s.x-b.x,s.y-b.y,s.width,s.height,'27',false,'map/search-hit');}
for(const button of penpotUtils.findShapes(s=>s.type==='board'&&norm(s)==='action/Сбросить',Q.boards['19']))for(const h of [button,...button.children])U.link(h,Q.boards['19.selected.all']?'19.selected.all':'19');
penpot.selection=[Q.boards['27']];penpot.viewport.zoomIntoView(penpot.selection);
return {logoHomeTargets:logos,additionalChildHitSurfaces:childHits,home:'14',appOrDeployChanged:false};
