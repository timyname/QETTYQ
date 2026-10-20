const Q=storage.q,S=storage.swipe;
const b=S.make('05.hint-left','Подсказка · влево',1530,17500);S.draw(b,Q.media15[0],0,'left');
Q.rect(b,84,430,262,62,'#FFFFFF',31,'gesture/idle-glass',0.92);Q.icon(b,'move-horizontal',102,449,24,Q.c.deep);Q.text(b,137,452,193,'Листай вправо или влево',12,600,Q.c.deep,'gesture/idle-copy');
for(const [id,next,delay] of [['05.hint','05.hint-left',800],['05.hint-left','05.ready',800]]){const frame=Q.boards[id];for(const it of [...frame.interactions])frame.removeInteraction(it);frame.addInteraction('after-delay',{type:'navigate-to',destination:Q.boards[next],animation:{type:'dissolve',duration:220,easing:'ease-out'}},delay);}
S.nav(S.hit(b,0,184,212,520,'prototype-only/left-swipe-preview'),'07','left');S.nav(S.hit(b,218,184,212,520,'prototype-only/right-swipe-preview'),'06','right');
for(const id of ['06','07']){const undo=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='action/undo',Q.boards[id]);undo.fills=[{fillColor:'#F7FAF7',fillOpacity:0.94}];}
const undo=penpotUtils.findShape(s=>s.name.replaceAll(' / ','/')==='action/undo',Q.boards['05.done']);for(const h of [undo,...undo.children]){for(const it of [...h.interactions])h.removeInteraction(it);S.nav(h,'05.15');}
return {hint:'right then left once, no choice',doneUndo:'05.15',boards:Object.keys(Q.boards).length};
