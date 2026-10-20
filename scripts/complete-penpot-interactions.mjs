import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {connect,execute,callTool} from './penpot-mcp.mjs';
const root=path.resolve(import.meta.dirname,'..');
await connect();
const names=['house','search','map','user-round','settings','map-pin','arrow-right','chevron-right','chevron-left','clock-3','wallet','layers','heart','x','rotate-ccw','route','sliders-horizontal','list','locate-fixed','sparkles','send','share-2','check','circle-help','chevrons-right','move-horizontal','message-circle','plus','external-link','loader-circle','shield-check'];
const icons={};
for(const name of names){const mod=await import(pathToFileURL(path.join(root,`node_modules/lucide-react/dist/esm/icons/${name==='circle-help'?'circle-question-mark':name}.mjs`)));icons[name]=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${mod.__iconData.node.map(([tag,a])=>`<${tag} ${Object.entries(a).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('')}</svg>`;}
console.log(await execute(`storage.icons=${JSON.stringify(icons)};storage.placeData=${await fs.readFile(path.join(root,'data/places.json'),'utf8')};return {icons:Object.keys(storage.icons).length};`));
for(const script of process.argv.slice(2))console.log(script,await execute(await fs.readFile(path.resolve(root,script),'utf8')));
const index=await execute(`return {fileId:penpot.currentFile.id,pageId:penpot.currentPage.id,boards:penpot.currentPage.root.children.filter(s=>s.type==='board'&&s.getPluginData('screenId')).map(b=>({id:b.getPluginData('screenId'),boardId:b.id,name:b.name}))};`);
await fs.writeFile(path.join(root,'design/penpot/board-index.json'),JSON.stringify(index,null,2));
console.log('boards',index.boards.length);
