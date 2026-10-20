import fs from 'node:fs/promises';
import {connect,execute} from './penpot-mcp.mjs';
await connect();console.log(await execute(await fs.readFile('design/penpot/control-qa-repairs.js','utf8')));
const ids=await execute('return Object.keys(storage.q.boards);');
for(let i=0;i<ids.length;i+=8)console.log(await execute(`return storage.finalQA.one(${JSON.stringify(ids.slice(i,i+8))});`));
console.log(await execute('return storage.finalQA.arrange();'));
console.log(await execute(`await penpot.currentFile.saveVersion('QETTYQ · complete clickable controls and conversation states');return{saved:true};`));
