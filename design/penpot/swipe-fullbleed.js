// Official Penpot plugin API only. Does not change application code or deploy.
const Q=storage.q;
storage.swipe={};const S=storage.swipe;
S.make=(id,name,x,y)=>{let b=Q.boards[id];if(!b){b=penpot.createBoard();b.setPluginData('screenId',id);Q.boards[id]=b;b.x=x;b.y=y;}b.name=id+' · '+name;b.resize(430,932);b.clipContent=true;b.fills=[{fillColor:Q.c.deep,fillOpacity:1}];for(const c of [...b.children])c.remove();for(const it of [...b.interactions])b.removeInteraction(it);b.setPluginData('interaction-contract','SWIPE_BEHAVIOR.md');return b;};
S.nav=(s,target,direction)=>{s.setPluginData('target',target);s.addInteraction('click',{type:'navigate-to',destination:Q.boards[target],animation:direction?{type:'slide',way:'out',direction,duration:260,easing:'ease-out'}:{type:'dissolve',duration:180,easing:'ease-out'}});};
S.hit=(p,x,y,w,h,name)=>Q.rect(p,x,y,w,h,'#FFFFFF',0,name,0.001);
S.circle=(b,x,name,icon,disabled=false)=>{const p=penpot.createBoard();Q.place(p,b,x,844,60,60,name);p.borderRadius=30;p.showInViewMode=false;p.fills=[{fillColor:'#F7FAF7',fillOpacity:disabled?0.55:0.94}];p.strokes=[{strokeColor:'#FFFFFF',strokeOpacity:0.75,strokeWidth:1,strokeAlignment:'inner',strokeStyle:'solid'}];p.shadows=Q.shadow;Q.icon(p,icon,18,18,24,disabled?'#82908A':Q.c.deep);return p;};
S.draw=(b,item,index,mode='rest')=>{
 const full=Q.rect(b,0,0,430,932,Q.c.deep,0,'interest/media-3x4');full.fills=[{fillImage:item.media,fillOpacity:1}];
 const top=Q.rect(b,0,0,430,280,Q.c.deep,0,'interest/top-readability');top.fills=[{fillColorGradient:{type:'linear',startX:0,startY:0,endX:0,endY:1,width:1,stops:[{color:'#071D18',opacity:0.72,offset:0},{color:'#071D18',opacity:0.15,offset:0.7},{color:'#071D18',opacity:0,offset:1}]}}];
 const bottom=Q.rect(b,0,460,430,472,Q.c.deep,0,'interest/bottom-readability');bottom.fills=[{fillColorGradient:{type:'linear',startX:0,startY:0,endX:0,endY:1,width:1,stops:[{color:'#071D18',opacity:0,offset:0},{color:'#071D18',opacity:0.66,offset:0.5},{color:'#071D18',opacity:0.92,offset:1}]}}];
 Q.text(b,22,30,240,'QETTYQ',22,800,'#FFFFFF','chrome/wordmark');Q.text(b,341,35,67,`${index+1} / 15`,12,600,'#FFFFFF','progress/count','right');
 for(let k=0;k<15;k++)Q.rect(b,22+k*26,76,20,3,k<=index?Q.c.lime:'#FFFFFF',2,'progress/segment-'+k,k<=index?1:0.3);
 Q.text(b,22,101,386,'Выбери, что тебе по душе',26,700,'#FFFFFF','content/title');
 Q.text(b,22,143,386,'Подборка будет учитывать твои интересы',13,400,'#FFFFFF','content/subtitle');
 Q.text(b,24,710,382,item.title,36,700,'#FFFFFF','interest/title');
 Q.text(b,24,808,340,'ИДЕЯ ДОСУГА · ИЛЛЮСТРАЦИЯ',10,600,'#DAE6DF','interest/provenance');
 if(['right','left','hint'].includes(mode)){
  const isLeft=mode==='left';
  if(!isLeft){const heart=Q.icon(b,'heart',28,250,30,Q.c.lime);if(heart)heart.name='gesture/feedback-heart';}
  const feedback=Q.text(b,isLeft?174:70,250,isLeft?232:270,isLeft?'Не сейчас':'Интересно',28,700,'#FFFFFF','gesture/feedback-label',isLeft?'right':'left');
  feedback.shadows=[{style:'drop-shadow',offsetX:0,offsetY:2,blur:10,spread:0,color:{color:'#071D18',opacity:0.6}}];
  if(mode==='hint'){Q.rect(b,84,430,262,62,'#FFFFFF',31,'gesture/idle-glass',0.92);Q.icon(b,'move-horizontal',102,449,24,Q.c.deep);Q.text(b,137,452,193,'Листай вправо или влево',12,600,Q.c.deep,'gesture/idle-copy');}
 }
 const left=S.circle(b,22,'action/undo','rotate-ccw',index===0);
 const right=S.circle(b,348,'action/continue','chevrons-right');
 left.setPluginData('accessibleLabel','Отменить последний выбор');right.setPluginData('accessibleLabel','Пропустить оставшиеся карточки и перейти к условиям');
 if(index>0){const prev=index===1?'05':'05.'+String(index).padStart(2,'0');for(const h of [left,...left.children])S.nav(h,prev);}
 for(const h of [right,...right.children])h.addInteraction('click',{type:'open-overlay',destination:Q.boards['05.continue'],relativeTo:right,position:'bottom-right',closeWhenClickOutside:true,addBackgroundOverlay:false,animation:{type:'slide',way:'in',direction:'left',duration:220,easing:'ease-out'}});
 b.setPluginData('prototype-note','Click zones preview swipe states only; Penpot has no drag trigger. Production: drag, keyboard and assistive actions; no implicit selection.');
 return b;
};
// One anchored overlay is shared by all 15 cards. No decisions are submitted.
const overlay=S.make('05.continue','К условиям · раскрытая плашка',3100,11600);overlay.resize(282,60);overlay.fills=[];overlay.clipContent=false;
Q.rect(overlay,0,0,282,60,'#FFFFFF',30,'continue/glass',0.96).shadows=Q.shadow;
Q.text(overlay,22,20,196,'К условиям подборки',14,600,Q.c.deep,'continue/label');Q.icon(overlay,'arrow-right',240,18,24,Q.c.deep);
for(const h of [overlay,...overlay.children])S.nav(h,'08');
S.rebuild=index=>{
 const item=Q.media15[index],base=Q.boards[item.id];S.make(item.id,index===0?'Выбор интересов':item.title,base.x,base.y);S.draw(base,item,index);
 for(const mode of ['right','left']){
  const id=index===0?(mode==='right'?'06':'07'):`${item.id}.${mode}`;
  const b=S.make(id,`${item.title} · ${mode==='right'?'интересно':'не сейчас'}`,((index*2+(mode==='left'?1:0))%6)*510,12000+Math.floor((index*2+(mode==='left'?1:0))/6)*1040);
  S.draw(b,item,index,mode);
 }
 return {id:item.id,width:base.width,height:base.height,footer:'two circles',media:'full-bleed'};
};
S.finish=()=>{
 const first=Q.media15[0];
 for(const [id,name,mode,x] of [['05.hint','Подсказка при бездействии','hint',0],['05.ready','Выбор после подсказки','rest',510]]){const b=S.make(id,name,x,17500);S.draw(b,first,0,mode);}
 const done=S.make('05.done','Интересы просмотрены',1020,17500);S.draw(done,Q.media15[14],14);for(const s of [...done.children])if(s.name.replaceAll(' / ','/').startsWith('gesture/'))s.remove();
 const title=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='interest/title',done);title.characters='Теперь — время\nи бюджет';title.fontSize='34';
 const sub=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='content/subtitle',done);sub.characters='15 карточек просмотрено. Можно изменить последний выбор.';sub.fontSize='12';
 for(let i=0;i<15;i++){
  const item=Q.media15[i],right=i===0?'06':`${item.id}.right`,left=i===0?'07':`${item.id}.left`,next=i===14?'05.done':'05.'+String(i+2).padStart(2,'0');
  for(const id of [item.id,...(i===0?['05.hint','05.ready']:[])]){
   const b=Q.boards[id];S.nav(S.hit(b,0,184,212,520,'prototype-only/left-swipe-preview'),left,'left');S.nav(S.hit(b,218,184,212,520,'prototype-only/right-swipe-preview'),right,'right');
  }
  for(const id of [left,right]){const b=Q.boards[id];const undo=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='action/undo',b);for(const h of [undo,...undo.children]){for(const it of [...h.interactions])h.removeInteraction(it);S.nav(h,item.id);}b.addInteraction('after-delay',{type:'navigate-to',destination:Q.boards[next],animation:{type:'dissolve',duration:200,easing:'ease-out'}},700);S.nav(S.hit(b,0,310,430,394,'prototype-only/advance-feedback'),next);}
 }
 Q.boards['05'].addInteraction('after-delay',{type:'navigate-to',destination:Q.boards['05.hint'],animation:{type:'dissolve',duration:280,easing:'ease-out'}},3500);
 Q.boards['05.hint'].addInteraction('after-delay',{type:'navigate-to',destination:Q.boards['05.ready'],animation:{type:'dissolve',duration:320,easing:'ease-out'}},1600);
 penpot.currentPage.createFlow('QETTYQ · Full-bleed swipe review',Q.boards['05']);
 return {interestCards:15,feedbackStates:30,idleHint:'one-shot, no preference written',continue:'circle → anchored label → conditions',actualDrag:false};
};
return {ready:true,overlay:overlay.id};
