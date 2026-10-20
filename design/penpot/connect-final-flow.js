const Q=storage.q;
const page=penpotUtils.getPageByName('02 · App assembly · editable');
const norm=s=>s.name.replaceAll(' / ','/');
const find=(b,name)=>penpotUtils.findShape(s=>norm(s)===name,b);
const nav=(s,target)=>{for(const it of [...s.interactions])s.removeInteraction(it);s.setPluginData('target',target);s.addInteraction('click',{type:'navigate-to',destination:Q.boards[target]||Q.variants[target],animation:{type:'dissolve',duration:200,easing:'ease-out'}});};
// A/B confirmation is the sole exit into retrieval; choosing a location never runs search on its own.
const geography=Q.boards['10'];
const geo=find(geography,'action/Моя геопозиция');const manual=find(geography,'action/Указать вручную');
geo.resize(187,54);geo.x=geography.x+22;geo.y=geography.y+713;
manual.resize(187,54);manual.x=geography.x+221;manual.y=geography.y+713;
for(const bt of [geo,manual]){const label=find(bt,'label');label.resize(155,22);label.fontSize='12';for(const icon of penpotUtils.findShapes(s=>norm(s).startsWith('icon/'),bt))icon.hidden=true;}
let collect=find(geography,'context/collect');if(!collect)collect=Q.button(geography,22,786,386,'Собрать варианты','13','primary','arrow-right','context/collect');nav(collect,'13');
// Retain the real quality of the approximate route in the prototype.
const estimated=Q.boards['25'];let save=find(estimated,'route/save-estimate');
if(!save)save=Q.button(estimated,40,818,350,'Сохранить как оценку','26','secondary','bookmark','route/save-estimate');nav(save,'26');
// Unavailable data is a state, with a path back to usable screens.
const loading=Q.boards['13'];let fallback=find(loading,'review/fallback');
if(!fallback){fallback=Q.button(loading,22,680,386,'Если сервис недоступен','43','text','arrow-right','review/fallback');}nav(fallback,'43');
// Fallback is a prototype branch for review, explicitly named rather than mixed into successful results.
fallback.setPluginData('design-only-control','true');
// All existing primary cards lead to their matching detail screen.
for(const id of ['14','15']){nav(find(Q.boards[id],'feed/candidate-card'),'21');}
nav(find(Q.boards['29'],'chat/candidate-card'),'21');
// Repair the source shape direction in the UI library and keep it independent of app navigation.
penpot.selection=[Q.boards['14']];penpot.viewport.zoomIntoView([Q.boards['14']]);
return {contextExit:'10→13',estimate:'25→26',fallback:'13→43'};
