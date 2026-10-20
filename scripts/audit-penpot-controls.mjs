import fs from 'node:fs/promises';
import {connect,execute} from './penpot-mcp.mjs';
await connect();
const ids=await execute(`return penpotUtils.getPageByName('02 · App assembly · editable').root.children.filter(b=>b.type==='board'&&b.getPluginData('screenId')).map(b=>b.getPluginData('screenId'));`);
const report=[];
for(let offset=0;offset<ids.length;offset+=10){
 const selected=ids.slice(offset,offset+10);
 const chunk=await execute(`
 const allowed=${JSON.stringify(selected)},norm=s=>s.name.replaceAll(' / ','/');
 const hidden=s=>{let p=s;while(p&&p.id!=='00000000-0000-0000-0000-000000000000'){if(p.hidden)return true;p=p.parent;}return false;};
 const page=penpotUtils.getPageByName('02 · App assembly · editable');
 return page.root.children.filter(b=>b.type==='board'&&allowed.includes(b.getPluginData('screenId'))).map(b=>{
  const nodes=penpotUtils.findShapes(()=>true,b).filter(s=>!hidden(s));
  const texts=nodes.filter(s=>s.type==='text').map(s=>({id:s.id,name:norm(s),text:s.characters,x:s.x-b.x,y:s.y-b.y,w:s.width,h:s.height}));
  const collisions=[];
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
   const a=texts[i],c=texts[j];if(a.name.includes('brand-dot')||c.name.includes('brand-dot'))continue;
   const dx=Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x),dy=Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y);
   if(dx>3&&dy>3)collisions.push({a:a.name,b:c.name,overlap:[Math.round(dx),Math.round(dy)],y:[Math.round(a.y),Math.round(c.y)]});
  }
  const prefixes=['action/','profile/','search/','tab/','chrome/','settings/','editor/'];
  const candidates=nodes.filter(s=>s.type==='board'&&(prefixes.some(p=>norm(s).startsWith(p))||norm(s)==='chat/new-conversation'||norm(s)==='chat/send'));
  const missing=candidates.filter(s=>!s.interactions.some(i=>i.trigger==='click')&&!s.getPluginData('disabled-reason')&&!s.blocked&&!(norm(s).startsWith('tab/')&&b.getPluginData('screenId')==='19')).map(s=>({name:norm(s),target:s.getPluginData('target'),opacity:s.opacity}));
  return{id:b.getPluginData('screenId'),boardId:b.id,name:b.name,textCount:texts.length,interactiveCount:nodes.filter(s=>s.interactions.length).length,missing,collisions,outside:texts.filter(t=>t.x<-1||t.y<-1||t.x+t.w>b.width+1||t.y+t.h>b.height+1).map(t=>({name:t.name,x:t.x,y:t.y,w:t.w,h:t.h}))};
 });`);
 report.push(...chunk);console.log('Audited',report.length,'/',ids.length);
}
await fs.writeFile('design/penpot/control-audit-after.json',JSON.stringify(report,null,2));
const summarize=key=>report.flatMap(b=>b[key].map(item=>({screen:b.id,...item})));
console.log(JSON.stringify({boards:report.length,missing:summarize('missing'),collisions:summarize('collisions'),outside:summarize('outside')},null,2));
await fs.writeFile('design/penpot/board-index.json',JSON.stringify({fileId:'b7ada7fc-31ac-8106-8008-d0c87d4f6af8',pageId:'dece5f48-f581-80ff-8008-d1666d5b4128',boards:report.map(({id,boardId,name})=>({id,boardId,name}))},null,2));
