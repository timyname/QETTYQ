import fs from 'node:fs/promises';
import {connect,execute} from './penpot-mcp.mjs';
await connect();const init=await execute(await fs.readFile('design/penpot/clip-map-surfaces.js','utf8'));console.log(init);
for(const id of init.ids)console.log(await execute(`return storage.clipMap.one(${JSON.stringify(id)});`));
console.log(await execute(`await penpot.currentFile.saveVersion('QETTYQ · map viewport clipping and clean bounds');return{saved:true};`));
