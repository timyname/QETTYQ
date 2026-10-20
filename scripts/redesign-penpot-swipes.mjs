import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {connect,execute,callTool} from './penpot-mcp.mjs';
const root=path.resolve(import.meta.dirname,'..');
const icons={};
for(const name of ['rotate-ccw','arrow-right','chevrons-right','move-horizontal','chevron-left','chevron-right']){
 const mod=await import(pathToFileURL(path.join(root,`node_modules/lucide-react/dist/esm/icons/${name}.mjs`)));
 icons[name]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${mod.__iconData.node.map(([tag,a])=>`<${tag} ${Object.entries(a).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('')}</svg>`;
}
await connect();
console.log(await execute(`await penpot.currentFile.saveVersion('QETTYQ · before edge-to-edge swipe redesign');const p=penpotUtils.getPageByName('02 · App assembly · editable');penpot.openPage(p);storage.icons=${JSON.stringify(icons)};return {page:p.id};`));
console.log(await execute(await fs.readFile(path.join(root,'design/penpot/native-renderer.js'),'utf8')));
console.log(await execute(`const Q=storage.q;Q.boards=Object.fromEntries(penpot.currentPage.root.children.filter(s=>s.type==='board'&&s.getPluginData('screenId')).map(s=>[s.getPluginData('screenId'),s]));Q.media15=[];for(let i=1;i<=15;i++){const id=i===1?'05':'05.'+String(i).padStart(2,'0'),b=Q.boards[id];Q.media15.push({id,title:penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='interest/title',b).characters,media:penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='interest/media-3x4',b).fills[0].fillImage});}return {cards:Q.media15.length,existing:Object.keys(Q.boards).length};`));
console.log(await execute(await fs.readFile(path.join(root,'design/penpot/swipe-fullbleed.js'),'utf8')));
for(let i=0;i<15;i++)console.log(await execute(`return storage.swipe.rebuild(${i});`));
console.log(await execute(`return storage.swipe.finish();`));
console.log(await execute(`await penpot.currentFile.saveVersion('QETTYQ · full-bleed 15 interests + swipe feedback + two-step continue');penpot.selection=[storage.q.boards['05']];penpot.viewport.zoomIntoView(penpot.selection);return {saved:true};`));
for(const id of ['05','06','07','05.hint','05.continue','05.done']){
 const board=await execute(`const b=storage.q.boards[${JSON.stringify(id)}];return {id:b.id};`);
 const exported=await callTool('export_shape',{shapeId:board.id,format:'png',filePath:path.join(root,`design/penpot/previews/${id}.png`)});
 console.log('Exported',id,exported.isError?'ERROR':'OK');
}
const index=await execute(`return {fileId:penpot.currentFile.id,pageId:penpot.currentPage.id,boards:penpot.currentPage.root.children.filter(s=>s.type==='board'&&s.getPluginData('screenId')).map(b=>({id:b.getPluginData('screenId'),boardId:b.id,name:b.name}))};`);
await fs.writeFile(path.join(root,'design/penpot/board-index.json'),JSON.stringify(index,null,2));
console.log('Total boards',index.boards.length);
