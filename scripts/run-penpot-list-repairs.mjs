import fs from 'node:fs/promises';
import {connect,execute} from './penpot-mcp.mjs';
await connect();
console.log(await execute(await fs.readFile('design/penpot/list-logo-controls.js','utf8')));
for(const code of ['prepare()','buildPuppetDetails()','buildPuppetMap()','buildList()','buildOrganizerEmpty()','buildOrganizerList()',"buildOriginSelected('gorky')","buildOriginSelected('dance')","buildOriginSelected('puppet')",'buildOriginSearch()','patchOrigin()'])console.log(code,await execute(`return storage.repairList.${code};`));
