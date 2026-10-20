const Q=storage.q,norm=s=>s.name.replaceAll(' / ','/');
const find=(b,name)=>penpotUtils.findShape(s=>norm(s)===name,b);
const report=[];
for(const s of storage.screenDoc.screens){
 const b=Q.boards[s.id];const rows=penpotUtils.findShapes(x=>norm(x).startsWith('content/row-'),b);if(!rows.length)continue;
 s.rows.slice(0,rows.length).forEach((r,i)=>{
  const y=316+i*64,row=find(b,'content/row-'+i),label=find(b,'row/'+r.label),value=find(b,'value/'+r.label);
  if(row){row.y=b.y+y;row.resize(386,62);}
  if(label){label.y=b.y+y+9;label.fontSize='13';label.lineHeight='1.25';}
  if(value){value.y=b.y+y+31;value.fontSize='12';value.lineHeight='1.25';}
 });
 for(const slider of penpotUtils.findShapes(x=>norm(x).startsWith('slider/'),b))slider.hidden=true;
 report.push({id:s.id,rows:rows.length});
}
return {repaired:report};
