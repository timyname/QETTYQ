import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,execute,callTool} from './penpot-mcp.mjs';
const root=path.resolve(import.meta.dirname,'..');
await connect();
const audit=await execute(`const page=penpotUtils.getPageByName('02 · App assembly · editable');return page.root.children.filter(s=>s.type==='board'&&s.getPluginData('screenId')).map(b=>({id:b.getPluginData('screenId'),boardId:b.id,name:b.name,layers:penpotUtils.findShapes(()=>true,b).length,textLayers:penpotUtils.findShapes(s=>s.type==='text',b).length,interactive:penpotUtils.findShapes(s=>s.interactions.length>0,b).length,outside:penpotUtils.analyzeDescendants(b,(root,s)=>s.type==='text'&&!penpotUtils.isContainedIn(s,root)?{name:s.name,x:s.x-root.x,y:s.y-root.y,width:s.width,height:s.height}:null).map(x=>x.result)}));`);
await fs.writeFile(path.join(root,'design/penpot/visual-audit.json'),JSON.stringify(audit,null,2));
await fs.writeFile(path.join(root,'design/penpot/board-index.json'),JSON.stringify({fileId:'b7ada7fc-31ac-8106-8008-d0c87d4f6af8',pageId:'dece5f48-f581-80ff-8008-d1666d5b4128',boards:audit.map(({id,boardId,name})=>({id,boardId,name}))},null,2));
console.log(JSON.stringify({frames:audit.length,textLayers:audit.reduce((n,s)=>n+s.textLayers,0),interactiveLayers:audit.reduce((n,s)=>n+s.interactive,0),outside:audit.flatMap(s=>s.outside.map(issue=>({screen:s.id,...issue})))},null,2));
for(const id of process.argv.includes('--audit-only')?[]:['02','05','14','16','27','32','33','36','45']){
 const b=audit.find(b=>b.id===id);if(!b)continue;
 const result=await callTool('export_shape',{shapeId:b.boardId,format:'png',filePath:path.join(root,`design/penpot/previews/${id}.png`)});
 console.log('Exported',id,result.content?.find(c=>c.type==='text')?.text?.slice(0,160));
}
