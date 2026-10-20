const Q=storage.q,U=storage.ui,norm=s=>s.name.replaceAll(' / ','/');
storage.mapModes={};const M=storage.mapModes;
M.modes=[['12.destination','Конечная точка · пример','10'],['12.venue','Площадка · пример','37'],['12.route-origin','Старт маршрута · пример','24'],['12.route-destination','Конец маршрута · пример','24']];
M.build=i=>{
 const [id,title,target]=M.modes[i];if(Q.boards[id])Q.boards[id].remove();const b=Q.boards['12.selected'].clone();Q.boards[id]=b;b.setPluginData('screenId',id);b.name=id+' · '+title;b.x=0;b.y=30000+i*1040;
 const label=U.find(b,'origin/type');if(label)label.characters=title;
 for(const s of penpotUtils.findShapes(s=>norm(s).startsWith('origin/search')||norm(s)==='icon/search',b))s.remove();
 Q.text(b,22,118,386,'Фиксированная точка примера · не геолокация',12,600,Q.c.jade,'mode/example-disclosure');
 for(const s of penpotUtils.findShapes(s=>s.type==='board'&&s.getPluginData('target')==='10',b))for(const h of [s,...s.children])U.link(h,target);
 for(const s of penpotUtils.findShapes(s=>s.type==='board'&&s.getPluginData('target')==='12',b))for(const h of [s,...s.children])U.link(h,target);
 for(let n=0;n<3;n++){const pin=U.find(b,'map/marker-'+n);if(pin){if(n>0)pin.hidden=true;else for(const h of [pin,...pin.children])U.link(h,id);}}
 if(id==='12.venue'){const t=U.find(b,'origin/privacy');if(t)t.characters='Право использовать эту площадку\nнужно подтвердить у владельца.';}
 b.setPluginData('returnTo',target);b.setPluginData('actualLocationSelection','not-implemented');return {id,returnTo:target};
};
M.bind=()=>{
 for(const [screen,index,target] of [['10',1,'12.destination'],['37',3,'12.venue']]){
  const b=Q.boards[screen],s=storage.screenDoc.screens.find(s=>s.id===screen),r=s.rows[index];for(const name of ['content/row-'+index,'row/'+r.label,'value/'+r.label,'editor/field-hit-'+index]){const shape=U.find(b,name);if(shape)U.link(shape,target);}
 }
 for(const [name,target] of [['action/Точка A','12.route-origin'],['action/Точка B','12.route-destination']]){const b=U.find(Q.boards['24'],name);if(b)for(const s of [b,...b.children])U.link(s,target);}
 return {modeSpecificReturns:true};
};
return {ready:true,run:'storage.mapModes.build(0..3), then bind()'};
