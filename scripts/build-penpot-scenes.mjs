import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect, execute } from './penpot-mcp.mjs';

const root=path.resolve(import.meta.dirname,'..');
const doc=JSON.parse(await fs.readFile(path.join(root,'design/penpot/screen-content.json'),'utf8'));
const names=['house','search','map','user-round','settings','map-pin','arrow-right','chevron-right','clock-3','wallet','layers','heart','x','rotate-ccw','route','sliders-horizontal','list','locate-fixed','sparkles','send','share-2','check','circle-help'];
const icons={};
for(const name of names){
 const canonical=name==='circle-help'?'circle-question-mark':name;
 const mod=await import(pathToFileURL(path.join(root,`node_modules/lucide-react/dist/esm/icons/${canonical}.mjs`)));
 const nodes=mod.__iconData.node.map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('');
 icons[name]=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
}
await connect();
const page=await execute(`let p=penpotUtils.getPageByName('02 · App assembly · editable');if(!p){p=penpot.createPage();p.name='02 · App assembly · editable';}penpot.openPage(p);storage.icons=${JSON.stringify(icons)};return {id:p.id};`);
console.log('Assembly page',page.id);
console.log(await execute(await fs.readFile(path.join(root,'design/penpot/native-renderer.js'),'utf8')));
const boards=[];
for(let i=0;i<doc.screens.length;i++){
 const s=doc.screens[i];
 const result=await execute(`const existing=penpotUtils.findShape(s=>s.type==='board'&&s.getPluginData('screenId')===${JSON.stringify(s.id)},penpot.root);if(existing&&existing.getPluginData('assembled')==='true'){storage.q.boards[${JSON.stringify(s.id)}]=existing;return {id:${JSON.stringify(s.id)},boardId:existing.id,reused:true};}if(existing)existing.remove();return storage.q.render(${JSON.stringify(s)},${i});`);
 boards.push(result);console.log('Board',s.id,result.boardId);
}
await fs.writeFile(path.join(root,'design/penpot/board-index.json'),JSON.stringify({fileId:'b7ada7fc-31ac-8106-8008-d0c87d4f6af8',pageId:page.id,boards},null,2));
const linked=await execute(`let count=0;for(const l of storage.q.links){const target=storage.q.boards[l.target];if(target){l.shape.addInteraction('click',{type:'navigate-to',destination:target,animation:{type:'dissolve',duration:200,easing:'ease-out'}});count++;}}penpot.currentPage.createFlow('QETTYQ · First contact',storage.q.boards['02']);penpot.currentPage.createFlow('QETTYQ · Four tabs',storage.q.boards['14']);penpot.selection=[storage.q.boards['14']];penpot.viewport.zoomIntoView([storage.q.boards['14']]);return {boards:Object.keys(storage.q.boards).length,links:count};`);
console.log(JSON.stringify(linked));
