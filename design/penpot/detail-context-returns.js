const Q=storage.q,U=storage.ui,norm=s=>s.name.replaceAll(' / ','/');
for(const [id,name] of [['21','chrome/back'],['21.alt','action/Вернуться к диалогу'],['21.puppet','action/К списку мест']]){
 const s=U.find(Q.boards[id],name);if(!s)continue;for(const h of [s,...penpotUtils.findShapes(()=>true,s)])U.link(h,'previous');
 const label=U.find(s,'label');if(label)label.characters='Назад';s.setPluginData('return-behavior','Previous screen, preserving caller candidate');
}
for(const id of ['16','17','17.alt'])storage.repairList.mapLinks(Q.boards[id],false);
for(const id of ['14.dance','14.puppet']){const tab=U.find(Q.boards[id],'tab/Для тебя');for(const s of [tab,...penpotUtils.findShapes(()=>true,tab)])U.link(s,id);}
return {detailBack:'previous-screen, not hardcoded chat/list',mapMarkers:'three matching candidates',activeTab:'preserves carousel slide'};
