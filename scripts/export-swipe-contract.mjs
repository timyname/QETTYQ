import fs from 'node:fs/promises';
import {connect,execute} from './penpot-mcp.mjs';
await connect();
const cards=await execute('return storage.q.media15.map(({id,title})=>({id,title}));');
const transitions=[];
cards.forEach((card,index)=>{
 const right=index===0?'06':`${card.id}.right`,left=index===0?'07':`${card.id}.left`,next=index===14?'05.done':cards[index+1].id;
 for(const [direction,target,reaction] of [['right',right,'like'],['left',left,'skip']])transitions.push({from:card.id,control:`swipe-${direction}`,to:target,runtimeReaction:reaction,prototypeTrigger:`click-${direction}-review-zone`,prototypePersistence:false});
 for(const feedback of [right,left])transitions.push({from:feedback,control:'feedback-complete',to:next,prototypeDelayMs:700});
 transitions.push({from:card.id,control:'continue-circle',to:'05.continue',kind:'anchored-overlay',position:'bottom-right-relative-to-circle'},{from:card.id,control:'undo',to:index===0?null:cards[index-1].id,disabled:index===0});
});
transitions.push({from:'05.continue',control:'confirm-second-press',to:'08'},{from:'05',control:'idle-no-choice',to:'05.hint',delayMs:3500},{from:'05.hint',control:'hint-no-choice',to:'05.hint-left',delayMs:800},{from:'05.hint-left',control:'hint-no-choice',to:'05.ready',delayMs:800},{from:'05.done',control:'undo-last',to:'05.15'});
await fs.writeFile('design/penpot/swipe-flow-v2.json',JSON.stringify({version:2,status:'native-design-prototype-not-runtime-drag',cards,transitions,unseenPolicy:'No reaction for unviewed or uncommitted cards'},null,2));
console.log({cards:cards.length,transitions:transitions.length});
