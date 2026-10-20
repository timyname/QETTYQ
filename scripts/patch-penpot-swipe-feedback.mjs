// Surgical native Penpot patch. Does not rebuild boards or touch buttons/links.
// Default is read-only inspection. Apply only with --apply and a connected official plugin.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { connect, execute, callTool } from './penpot-mcp.mjs';

const root=path.resolve(import.meta.dirname,'..');
const apply=process.argv.includes('--apply');
const expected=['06','07',...Array.from({length:14},(_,i)=>String(i+2).padStart(2,'0')).flatMap(n=>[`05.${n}.right`,`05.${n}.left`]),'05.hint','05.hint-left'];
const selection=`const page=penpotUtils.getPageByName('02 · App assembly · editable');if(!page)throw Error('ASSEMBLY_PAGE_MISSING');const expected=${JSON.stringify(expected)};const boards=page.root.children.filter(b=>b.type==='board'&&expected.includes(b.getPluginData('screenId')));if(boards.length!==expected.length||new Set(boards.map(b=>b.getPluginData('screenId'))).size!==expected.length)throw Error('EXPECTED_32_UNIQUE_FEEDBACK_BOARDS');const norm=s=>s.name.replaceAll(' / ','/');`;
await connect();
let inspected={boards:[]};
for(let offset=0;offset<expected.length;offset+=3){
const part=await execute(`${selection}const active=boards.filter(b=>${JSON.stringify(expected.slice(offset,offset+3))}.includes(b.getPluginData('screenId')));return {fileId:penpot.currentFile.id,pageId:page.id,boards:active.map(b=>({screenId:b.getPluginData('screenId'),boardId:b.id,feedbackLayers:b.children.filter(s=>norm(s).startsWith('gesture/feedback')).map(s=>({id:s.id,name:norm(s),type:s.type,text:s.type==='text'?s.characters:null,links:s.interactions.length})),links:[b,...b.children].reduce((n,s)=>n+s.interactions.length,0)}))};`);
inspected={...part,boards:[...inspected.boards,...part.boards]};
}
console.log(JSON.stringify({mode:apply?'apply':'inspect',fileId:inspected.fileId,pageId:inspected.pageId,boards:inspected.boards.length,links:inspected.boards.reduce((n,b)=>n+b.links,0)}));
if(!apply)process.exit(0);

// Reuse precisely the installed Lucide heart, not a generated bitmap or improvised icon.
const heart=await import(pathToFileURL(path.join(root,'node_modules/lucide-react/dist/esm/icons/heart.mjs')));
const nodes=heart.__iconData.node.map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('');
const heartSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CFFC55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
await execute(`${selection}penpot.openPage(page);return {pageId:page.id};`);
// Separate request: openPage is asynchronous in the official Penpot plugin API.
await execute(`await penpot.currentFile.saveVersion('QETTYQ · before plain swipe feedback patch');return {savedBefore:true};`);
const chunks=[];
for(let offset=0;offset<expected.length;offset+=3){
const chunk=await execute(`${selection}
 const active=boards.filter(b=>${JSON.stringify(expected.slice(offset,offset+3))}.includes(b.getPluginData('screenId')));
 const permitted=new Set(['gesture/feedback','gesture/feedback-label','gesture/feedback-heart']);
 const signature=s=>JSON.stringify({id:s.id,name:s.name,type:s.type,x:s.x,y:s.y,w:s.width,h:s.height,text:s.type==='text'?s.characters:null,links:s.interactions.map(i=>({trigger:i.trigger,type:i.action.type,destination:i.action.destination?.id??null}))});
 const snapshots=[];
 // Complete preflight BEFORE the first mutation.
 for(const b of active){
  const nodes=[...b.children];if(nodes.length>100)throw Error('DIRECT_CHILD_LIMIT');const label=nodes.find(s=>norm(s)==='gesture/feedback-label');
  if(!label||label.type!=='text')throw Error('FEEDBACK_TEXT_MISSING:'+b.getPluginData('screenId'));
  for(const s of nodes.filter(s=>['gesture/feedback','gesture/feedback-heart'].includes(norm(s))))if(s.interactions.length)throw Error('FEEDBACK_VISUAL_HAS_LINKS:'+b.getPluginData('screenId'));
  const excluded=new Set(nodes.filter(s=>permitted.has(norm(s))).map(s=>s.id));
  snapshots.push({b,label,nodes:nodes.filter(s=>!excluded.has(s.id)).map(s=>({id:s.id,signature:signature(s)})),boardSignature:signature(b),linkCount:[b,...nodes].reduce((n,s)=>n+s.interactions.length,0)});
 }
 const font=penpot.fonts.findByName('Manrope');
 for(const snapshot of snapshots){
  const {b,label}=snapshot,id=b.getPluginData('screenId'),left=id==='07'||id.endsWith('.left')||id==='05.hint-left';
  for(const s of [...b.children].filter(s=>['gesture/feedback','gesture/feedback-heart'].includes(norm(s))))s.remove();
  label.characters=left?'Не сейчас':'Интересно';label.resize(left?232:270,40);label.x=b.x+(left?174:70);label.y=b.y+250;
  if(font){const variant=font.variants.find(v=>String(v.fontWeight)==='700');if(variant)font.applyToText(label,variant);}
  label.fontSize='28';label.fontWeight='700';label.lineHeight='1.3';label.align=left?'right':'left';label.fills=[{fillColor:'#FFFFFF',fillOpacity:1}];label.strokes=[];label.growType='auto-height';
  label.shadows=[{style:'drop-shadow',offsetX:0,offsetY:2,blur:10,spread:0,color:{color:'#071D18',opacity:0.6}}];
  if(!left){const icon=penpot.createShapeFromSvg(${JSON.stringify(heartSvg)});if(!icon)throw Error('HEART_CREATION_FAILED');b.appendChild(icon);icon.name='gesture/feedback-heart';icon.resize(30,30);icon.x=b.x+28;icon.y=b.y+250;}
 }
 const violations=[];
 for(const snapshot of snapshots){const currentNodes=new Map(snapshot.b.children.map(s=>[s.id,s]));if(signature(snapshot.b)!==snapshot.boardSignature)violations.push({screen:snapshot.b.getPluginData('screenId'),reason:'BOARD_OR_INTERACTION_CHANGED'});for(const old of snapshot.nodes){const current=currentNodes.get(old.id);if(!current||signature(current)!==old.signature)violations.push({screen:snapshot.b.getPluginData('screenId'),shape:old.id,reason:'NON_FEEDBACK_LAYER_CHANGED'});}}
 return {changedBoards:snapshots.length,feedbackStyle:'plain-heart-and-text-no-frame',nonFeedbackViolations:violations,boards:snapshots.map(s=>({screenId:s.b.getPluginData('screenId'),boardId:s.b.id,linksBefore:s.linkCount,linksAfter:[s.b,...s.b.children].reduce((n,native)=>n+native.interactions.length,0)}))};
`);
chunks.push(chunk);console.log(JSON.stringify({changed:offset+chunk.changedBoards,violations:chunk.nonFeedbackViolations.length}));
}
const result={changedBoards:chunks.reduce((n,c)=>n+c.changedBoards,0),feedbackStyle:'plain-heart-and-text-no-frame',nonFeedbackViolations:chunks.flatMap(c=>c.nonFeedbackViolations),boards:chunks.flatMap(c=>c.boards)};
if(result.nonFeedbackViolations.length||result.boards.some(b=>b.linksBefore!==b.linksAfter))throw new Error(`NON_FEEDBACK_INVARIANT_FAILED ${JSON.stringify(result)}`);
await execute(`await penpot.currentFile.saveVersion('QETTYQ · 32 swipe feedback states · plain heart and text');return {savedAfter:true};`);
for(const id of ['06','07']){
 const board=result.boards.find(b=>b.screenId===id);
 await callTool('export_shape',{shapeId:board.boardId,format:'png',filePath:path.join(root,`design/penpot/previews/${id}.png`)});
}
await fs.writeFile(path.join(root,'design/penpot/swipe-feedback-patch-report.json'),JSON.stringify({applied:true,savedVersionLabel:'QETTYQ · 32 swipe feedback states · plain heart and text',...result},null,2));
console.log(JSON.stringify(result,null,2));
