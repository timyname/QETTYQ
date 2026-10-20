import fs from 'node:fs/promises';
import {connect,execute,callTool} from './penpot-mcp.mjs';
await connect();
const state=await execute(`const boards=penpot.currentPage.root.children.filter(b=>b.type==='board'&&b.getPluginData('screenId'));return{fileId:penpot.currentFile.id,pageId:penpot.currentPage.id,boards:boards.map(b=>({id:b.getPluginData('screenId'),boardId:b.id})),viewOrder:boards.map(b=>b.getPluginData('screenId')).reverse()};`);
const links={};for(const id of ['05','27','14','08','19','36','31','34'])links[id]=`http://localhost:9001/#/view?file-id=${state.fileId}&page-id=${state.pageId}&section=interactions&index=${state.viewOrder.indexOf(id)}&zoom=fit`;
await fs.writeFile('design/penpot/review-links.json',JSON.stringify(links,null,2));
for(const id of ['05','14','14.dance','14.puppet','16','24','08','08.editor','19.selected.culture','27','28','29','29.followup','36','38.selected.unknown','45.selected.kk']){
 const b=state.boards.find(b=>b.id===id);await callTool('export_shape',{shapeId:b.boardId,format:'png',filePath:`/Users/phonelab/Documents/QETTYQ/design/penpot/previews/${id}.png`});console.log('Exported',id);
}
console.log(links);
