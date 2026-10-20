import fs from 'node:fs/promises';
import {connect,execute} from './penpot-mcp.mjs';
await connect();
console.log(await execute(await fs.readFile('design/penpot/control-editors-native.js','utf8')));
const groups=await execute('return storage.editors.groups.map(g=>({id:g.id,options:g.options.length}));');
for(const g of groups)console.log(await execute(`return storage.editors.prepareGroup('${g.id}');`));
for(const g of groups){
 console.log(await execute(`return storage.editors.drawEditor('${g.id}');`));
 for(let i=0;i<g.options;i++)console.log(await execute(`return storage.editors.drawResult('${g.id}',${i});`));
 console.log(await execute(`return storage.editors.bindOwner('${g.id}');`));
}
console.log(await execute('return storage.editors.bindCity();'));
