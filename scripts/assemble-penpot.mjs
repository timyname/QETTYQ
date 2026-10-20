import fs from 'node:fs/promises';
import path from 'node:path';
import { connect, callTool, execute } from './penpot-mcp.mjs';

const root = path.resolve(import.meta.dirname, '..');
const mode = process.argv[2] ?? 'inspect';
await connect();
if (mode === 'inspect') {
  console.log(JSON.stringify(await execute('return {pages:penpotUtils.getPages(), current:penpot.currentPage?.id};'), null, 2));
} else if (mode === 'assets') {
  const page = await execute(`let p=penpotUtils.getPageByName('04 · Interest assets · 15'); if(!p){p=penpot.createPage();p.name='04 · Interest assets · 15';} penpot.openPage(p); storage.media=storage.media||{}; return {id:p.id};`);
  console.log('Assets page', page.id);
  const names = (await fs.readdir(path.join(root, 'public/assets/ideas'))).filter((name) => name.endsWith('.jpg')).sort();
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    const exists = await execute(`const s=penpotUtils.findShape(s=>s.name===${JSON.stringify(`media/${name}`)}||s.name===${JSON.stringify(name)},penpot.root);if(s){s.name=${JSON.stringify(`media/${name}`)};s.borderRadius=28;storage.media[${JSON.stringify(name)}]=s.fills[0].fillImage;}return Boolean(s);`);
    if (exists) { console.log('Reused', name); continue; }
    const result = await callTool('import_image', { filePath: path.join(root, 'public/assets/ideas', name), x: (index % 5) * 330, y: Math.floor(index / 5) * 450, width: 288, height: 384 });
    const id = JSON.parse(result.content[0].text).shapeId;
    await execute(`const s=penpotUtils.findShapeById(${JSON.stringify(id)});s.name=${JSON.stringify(`media/${name}`)};s.borderRadius=28;storage.media[${JSON.stringify(name)}]=s.fills[0].fillImage;return {id:s.id,name:s.name};`);
    console.log('Imported', name);
  }
  await execute('penpot.viewport.zoomToFitAll();return {assets:Object.keys(storage.media).length};');
} else if (mode === 'run') {
  const file = process.argv[3];
  const pageName=file.endsWith('ui-kit.js')?'03 · UI kit · layers & states':file.endsWith('flow-board.js')?'05 · UX flow · four tabs':'02 · App assembly · editable';
  await execute(`let p=penpotUtils.getPageByName(${JSON.stringify(pageName)});if(!p){p=penpot.createPage();p.name=${JSON.stringify(pageName)};}penpot.openPage(p);return p.id;`);
  console.log(JSON.stringify(await execute(await fs.readFile(path.resolve(root,file), 'utf8')), null, 2));
}
