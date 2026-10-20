import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,execute,callTool} from './penpot-mcp.mjs';
const root=path.resolve(import.meta.dirname,'..');
const content=JSON.parse(await fs.readFile(path.join(root,'design/penpot/screen-content.json'),'utf8'));
await connect();
// Reuse the native 05 frame to make all 15 media choices reviewable in the same flow.
const titles=['Культура и история','Рок и живая музыка','Балет и театр','Бачата и танцы','Барабаны и ритм','Армрестлинг и сила','Активный отдых','Баня и загородный отдых','Шашлык и компания','Fine dining','Кофе и спокойный вечер','Современное искусство','Кино','Мастер-класс и творчество','Прогулка и архитектура'];
const media=(await fs.readdir(path.join(root,'public/assets/ideas'))).filter(n=>n.endsWith('.jpg')).sort();
console.log(await execute(`const page=penpotUtils.getPageByName('02 · App assembly · editable');penpot.openPage(page);storage.q.page=page;storage.q.variants={};return {page:page.id};`));
for(let i=1;i<15;i++){
 const key=`05.${String(i+1).padStart(2,'0')}`;
 await execute(`const Q=storage.q;let b=penpotUtils.findShape(s=>s.type==='board'&&s.getPluginData('screenId')===${JSON.stringify(key)},penpot.root);if(!b){b=Q.boards['05'].clone();b.name=${JSON.stringify(`${key} · ${titles[i]}`)};b.setPluginData('screenId',${JSON.stringify(key)});b.x=${((i-1)%6)*510};b.y=${8320+Math.floor((i-1)/6)*1040};}Q.variants[${JSON.stringify(key)}]=b;return b.id;`);
 console.log(await execute(`const b=storage.q.variants[${JSON.stringify(key)}];const find=name=>penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')===name,b);find('interest/media-3x4').fills=[{fillImage:storage.media[${JSON.stringify(media[i])}],fillOpacity:1}];find('interest/title').characters=${JSON.stringify(titles[i])};find('progress/count').characters=${JSON.stringify(`${i+1} / 15`)};find('progress/value').resize(${386*(i+1)/15},4);return {id:${JSON.stringify(key)},boardId:b.id};`));
}
console.log(await execute(`const Q=storage.q;const all={...Q.boards,...Q.variants};for(const [id,b] of Object.entries(Q.variants)){const num=Number(id.split('.')[1]);const next=num===15?'08':'05.'+String(num+1).padStart(2,'0');for(const button of penpotUtils.findShapes(s=>s.type==='board'&&s.name.replaceAll(' / ','/').startsWith('action/'),b)){const label=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='label',button)?.characters;let target=next;if(label==='Отменить последний выбор')target=num===2?'05':'05.'+String(num-1).padStart(2,'0');else if(label==='К условиям подборки')target='08';button.setPluginData('target',target);for(const it of [...button.interactions])button.removeInteraction(it);button.addInteraction('click',{type:'navigate-to',destination:all[target],animation:{type:'dissolve',duration:220,easing:'ease-out'}});}const counter=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='progress/count',b);counter.fontSize='11';}for(const id of ['06','07']){const b=Q.boards[id];for(const button of penpotUtils.findShapes(s=>s.type==='board'&&s.name.replaceAll(' / ','/').startsWith('action/'),b)){const label=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='label',button)?.characters;if(label==='Следующая идея'){for(const it of [...button.interactions])button.removeInteraction(it);button.setPluginData('target','05.02');button.addInteraction('click',{type:'navigate-to',destination:Q.variants['05.02'],animation:{type:'dissolve',duration:220,easing:'ease-out'}});}}}return {swipeStates:15};`));
console.log(await execute(`const Q=storage.q;for(const id of ['14','15']){const b=Q.boards[id];if(!penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='candidate/source',b)){const t=Q.text(b,42,687,346,'Источник: OpenStreetMap · 19.10.2026 ↗',11,400,Q.c.jade,'candidate/source');t.addInteraction('click',{type:'open-url',url:'https://www.openstreetmap.org/node/455447680'});}}return {sources:'visible'};`));
// Additional product entry points are controls, rather than a review menu inside app screens.
console.log(await execute(`const Q=storage.q;const b=Q.boards['27'];Q.button(b,22,470,185,'Кино и сеансы','22','secondary','arrow-right','search/cinema');Q.button(b,222,470,186,'Открыть карту','16','secondary','map','search/map');for(const n of ['search/cinema','search/map']){const s=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')===n,b);s.addInteraction('click',{type:'navigate-to',destination:Q.boards[s.getPluginData('target')],animation:{type:'dissolve',duration:200,easing:'ease-out'}});}return {entries:'cinema/map'};`));
// Modal close controls return to their initiator.
console.log(await execute(`const Q=storage.q;let fixed=0;for(const id of ['03','11','19','31','45']){const b=Q.boards[id];for(const s of penpotUtils.findShapes(s=>s.name.replaceAll(' / ','/')==='chrome/back'||s.getPluginData('target')==='close',b)){for(const it of [...s.interactions])s.removeInteraction(it);s.addInteraction('click',{type:'close-overlay',animation:{type:'dissolve',duration:180,easing:'ease-out'}});fixed++;}}return {overlayCloses:fixed};`));

// UI kit is built from the same native styles as the app frames.
const kit=await execute(`const Q=storage.q;let p=penpotUtils.getPageByName('03 · UI kit · layers & states');if(!p){p=penpot.createPage();p.name='03 · UI kit · layers & states';}penpot.openPage(p);storage.q.kit=p;return {id:p.id,existing:p.root.children.length};`);
if(!kit.existing){
 console.log(await execute(await fs.readFile(path.join(root,'design/penpot/ui-kit.js'),'utf8')));
}
await execute(`penpot.openPage(storage.q.page);penpot.selection=[storage.q.boards['14']];penpot.viewport.zoomIntoView([storage.q.boards['14']]);return {ready:true};`);
const index=await execute(`return {pageId:storage.q.page.id,boards:[...Object.values(storage.q.boards),...Object.values(storage.q.variants)].map(b=>({id:b.getPluginData('screenId'),boardId:b.id,name:b.name}))};`);
await fs.writeFile(path.join(root,'design/penpot/board-index.json'),JSON.stringify({fileId:'b7ada7fc-31ac-8106-8008-d0c87d4f6af8',...index},null,2));
console.log('Saved index',index.boards.length);
