const Q=storage.q,U=storage.ui,norm=s=>s.name.replaceAll(' / ','/');
storage.clipMap={};const CM=storage.clipMap;
CM.ids=Object.entries(Q.boards).filter(([id,b])=>U.find(b,'map/provider-replaceable-base')).map(([id])=>id);
CM.one=id=>{
 const b=Q.boards[id],base=U.find(b,'map/provider-replaceable-base');if(!base)return{skip:id};
 let viewport=U.find(b,'map/viewport');if(viewport)return{already:id};
 const small=['24','25','26'].includes(id),x=base.x,y=base.y,w=base.width,h=base.height;
 viewport=penpot.createBoard();b.appendChild(viewport);viewport.name='map/viewport';viewport.resize(w,h);viewport.x=x;viewport.y=y;viewport.clipContent=true;viewport.showInViewMode=false;viewport.fills=[];viewport.borderRadius=small?20:0;
 const inside=penpotUtils.findShapes(s=>{const n=norm(s);return n==='map/provider-replaceable-base'||n==='map/river-schematic'||n.startsWith('map/schematic-road-')||n.startsWith('map/marker-')||n==='route/schematic-polyline';},b);
 for(const s of inside){const sx=s.x,sy=s.y;viewport.appendChild(s);s.x=sx;s.y=sy;}
 viewport.sendToBack();const disclosure=U.find(b,'map/disclosure');if(disclosure)disclosure.y=b.y+(small?590:552);
 b.setPluginData('map-surface','clipped viewport; schematic only');
 return {id,viewport:[viewport.x-b.x,viewport.y-b.y,w,h],clipped:inside.length};
};
return {ready:true,ids:CM.ids};
