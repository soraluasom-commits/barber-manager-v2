/* Optional customer counts. No monetary calculations or license state. */
(() => {
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 function validate(row){
  const p=row.paymentCounts,h=row.haircuts;
  if((p!=null||h!=null)&&!integer(row.heads))throw Error("จำนวนลูกค้าต้องเป็นจำนวนเต็มที่ถูกต้อง");
  if(p!=null&&(!integer(p.cash)||!integer(p.transfer)||p.cash+p.transfer!==row.heads))throw Error('เงินสด + เงินโอน ต้องเท่ากับจำนวนลูกค้า');
  if(h!=null&&(!Array.isArray(h)||!h.length||h.length>500||h.some(x=>!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>200||!(x.styleId===null||typeof x.styleId==='string'&&x.styleId.length<=500)||!integer(x.count)||!x.count)||h.reduce((s,x)=>s+x.count,0)!==row.heads))throw Error('จำนวนคนทุกทรงต้องเท่ากับจำนวนลูกค้า');
  return true;
 }
 const colors=['#2455c7','#d72e45','#16a34a','#9333ea','#0891b2','#d97706','#be185d','#4f46e5'];
 function aggregate(rows,key){const m=new Map();let covered=0,missing=0;
  for(const r of rows){try{validate({heads:r.heads,[key]:r[key]})}catch{missing+=Number(r.heads)||0;continue}if(r[key]==null){missing+=Number(r.heads)||0;continue}covered+=r.heads;
   const parts=key==='paymentCounts'?[{name:'เงินสด',count:r[key].cash},{name:'เงินโอน',count:r[key].transfer}]:r[key];
   for(const p of parts){const k=key==='haircuts'?JSON.stringify([p.styleId,p.name]):p.name;const v=m.get(k)||{name:p.name,count:0};v.count+=p.count;m.set(k,v)}
  }
  const items=[...m.values()].filter(x=>x.count>0),total=items.reduce((s,x)=>s+x.count,0);
  const units=items.map(x=>Math.floor(x.count/total*1000));let remainder=1000-units.reduce((s,x)=>s+x,0);
  items.map((x,i)=>({i,f:x.count/total*1000-units[i]})).sort((a,b)=>b.f-a.f||a.i-b.i).slice(0,remainder).forEach(x=>units[x.i]++);
  return {covered,missing,total,items:items.map((x,i)=>({...x,percent:units[i]/10,color:colors[i%colors.length]}))};
 }
 const selectedByForm=new WeakMap();
 let catalog=[];
 async function refresh(form){try{catalog=LearningRepo.merged(await LearningRepo.read()).filter(x=>x.type==='learnHair'&&!x.deleted&&!x.hidden);if(!form.isConnected)return;form.querySelector('#workStyles').innerHTML=catalog.map(x=>`<option value="${esc(x.name)}"></option>`).join('')}catch{toast('อ่านคลังไม่ได้ ยังพิมพ์ชื่อทรงเองได้')}}
 function list(form){const selected=selectedByForm.get(form);const node=form.querySelector('.work-selected');node.replaceChildren();selected.forEach((x,i)=>{const row=document.createElement('div');row.className='actions';const label=document.createElement('span');label.textContent=x.name;const input=document.createElement('input');input.type='number';input.min='1';input.step='1';input.value=x.count;input.setAttribute('aria-label','จำนวนคน '+x.name);input.oninput=()=>{selected[i].count=Number(input.value)};const b=document.createElement('button');b.type='button';b.className='btn small danger';b.textContent='ลบ';b.onclick=()=>{selected.splice(i,1);list(form)};row.append(label,input,document.createTextNode(' คน '),b);node.append(row)})}
 const oldOpen=openEntryModal;
 openEntryModal=function(key=''){oldOpen(key);const form=document.querySelector('#modalbox form');if(!form)return;const record=state.entries.find(x=>x.id===key);const selected=structuredClone(record?.haircuts||[]);selectedByForm.set(form,selected);const grid=form.querySelector('.formgrid');grid.classList.add('work-entry-grid');document.querySelector('#modalbox').classList.add('work-entry-modal');
  const heads=form.elements.heads.closest('.field');heads.querySelector('label').textContent='จำนวนลูกค้า (คน)';
  heads.insertAdjacentHTML('afterend',`<div class="field"><label for="workCash">เงินสด (คน)</label><input id="workCash" name="cashPeople" type="number" min="0" step="1" value="${record?.paymentCounts?.cash??''}"></div><div class="field"><label for="workTransfer">เงินโอน (คน)</label><input id="workTransfer" name="transferPeople" type="number" min="0" step="1" value="${record?.paymentCounts?.transfer??''}"></div><div class="field"><label for="workStyle">ทรงผม</label><input id="workStyle" list="workStyles" maxlength="200" placeholder="ค้นหาหรือพิมพ์ชื่อทรง"><datalist id="workStyles"></datalist></div><div class="field"><label for="workCount">จำนวน (คน)</label><input id="workCount" type="number" min="1" step="1"></div><button type="button" class="btn" id="workAdd">+ เพิ่มทรง</button><div class="work-selected" aria-live="polite"></div>`);
  form.elements.date.closest('.field').classList.add('work-date');form.querySelector('#workAdd').onclick=async()=>{await refresh(form);if(!form.isConnected)return;const name=form.querySelector('#workStyle').value.trim(),count=Number(form.querySelector('#workCount').value);if(!name||!integer(count)||!count)return toast('กรอกชื่อทรงและจำนวนเต็มมากกว่า 0');const style=catalog.find(x=>x.name===name),styleId=style?.id??null,existing=selected.find(x=>x.styleId===styleId&&x.name===name);if(existing)existing.count+=count;else selected.push({styleId,name,count});list(form);form.querySelector('#workStyle').value='';form.querySelector('#workCount').value=''};
  form.querySelector('#workStyle').addEventListener('focus',()=>refresh(form));refresh(form);list(form);
 };
 function read(form){
  const selected=selectedByForm.get(form);
  if(!selected||!form.elements.cashPeople||!form.elements.transferPeople||!form.querySelector('#workStyle')||!form.querySelector('#workCount'))throw Error('ฟอร์มรายละเอียดงานโหลดไม่ครบ กรุณาเปิดแบบฟอร์มใหม่ก่อนบันทึก');
  const cash=form.elements.cashPeople.value,transfer=form.elements.transferPeople.value;if(form.querySelector('#workStyle').value.trim()||form.querySelector('#workCount').value)throw Error('กด + เพิ่มทรง หรือเคลียร์ช่องทรงที่ยังไม่ได้เพิ่มก่อนบันทึก');const detail={paymentCounts:cash===''&&transfer===''?null:{cash:cash===''?NaN:Number(cash),transfer:transfer===''?NaN:Number(transfer)},haircuts:selected.length?structuredClone(selected):null};validate({...detail,heads:Number(form.elements.heads.value)});return detail}

 const pct=x=>x.percent.toFixed(1)+'%';
 function glyphs(name){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(name)].map(x=>x.segment):Array.from(name)}
 function displayItems(data){if(data.items.length<=2)return data.items;const sorted=data.items.map((x,i)=>({...x,order:i})).sort((a,b)=>b.count-a.count||a.order-b.order);const main=sorted.filter((x,i)=>i<3||x.count/data.total>=.03).slice(0,5),rest=sorted.filter(x=>!main.includes(x));return rest.length?[...main,{name:'อื่น ๆ',count:rest.reduce((n,x)=>n+x.count,0),percent:rest.reduce((n,x)=>n+Math.round(x.percent*10),0)/10,color:'#64748b',members:rest}]:main}
 function wrapName(name,font=17){const c=document.createElement('canvas').getContext('2d');c.font='500 '+font+'px Poppins, Prompt, sans-serif';const out=[];let line='';for(const segment of glyphs(name)){if(line&&c.measureText(line+segment).width>116){out.push(line);line=''}line+=segment}if(line)out.push(line);return out}
 function donutModel(data){data={...data,items:displayItems(data)};const font=typeof innerWidth==='number'&&innerWidth<600?20:data.items.length>=4?16:17;const inside=!data.forceOutside&&data.items.length<=2&&data.items.every(x=>x.count/data.total>=.2&&wrapName(x.name).length===1);let angle=-Math.PI/2;const items=data.items.map(x=>{const a=angle,b=a+x.count/data.total*Math.PI*2;angle=b;return {...x,a,b,mid:(a+b)/2,lines:wrapName(x.name,font),side:Math.cos((a+b)/2)<0?-1:1}});const sides=[items.filter(x=>x.side<0),items.filter(x=>x.side>0)];const heights=sides.map(xs=>xs.reduce((n,x)=>n+x.lines.length*22+40,0));const height=inside?360:Math.max(360,...heights.map(x=>x+48));for(const xs of sides){xs.sort((a,b)=>Math.sin(a.mid)-Math.sin(b.mid));let y=(height-xs.reduce((n,x)=>n+x.lines.length*22+40,0))/2;for(const x of xs){x.labelY=y+18;y+=x.lines.length*22+40}}return {items,inside,font,height,cx:240,cy:height/2-6,r:inside?146:100,inner:inside?78:58}}
 function ringPath(m,x,dy=0){const point=(r,a)=>[m.cx+r*Math.cos(a),m.cy+dy+r*Math.sin(a)];const a=x.a,b=x.b-0.00001,large=b-a>Math.PI?1:0;return 'M'+point(m.r,a)+' A'+m.r+','+m.r+' 0 '+large+',1 '+point(m.r,b)+' L'+point(m.inner,b)+' A'+m.inner+','+m.inner+' 0 '+large+',0 '+point(m.inner,a)+' Z'}
 let chartId=0;
 function donutSVG(data,title){const m=donutModel(data),uid='wd'+(++chartId);return '<svg class="work-pie" style="--donut-font:'+m.font+'px;--donut-percent:'+(m.font+3)+'px" viewBox="0 0 480 '+m.height+'" role="img" aria-label="'+esc(title+' '+data.items.map(x=>x.name+' '+pct(x)).join(', '))+'"><defs>'+m.items.map((x,i)=>'<linearGradient id="'+uid+i+'" x1="0" y1="0" x2="0.65" y2="1"><stop stop-color="'+x.color+'"/><stop offset="1" stop-color="'+x.color+'" stop-opacity=".80"/></linearGradient>').join('')+'</defs><ellipse cx="240" cy="'+(m.cy+m.r+16)+'" rx="'+m.r+'" ry="12" fill="#0b1733" opacity=".10"/>'+m.items.map((x,i)=>'<path d="'+ringPath(m,x,10)+'" fill="'+x.color+'"/><path d="'+ringPath(m,x,10)+'" fill="#07132d" opacity=".3"/><path d="'+ringPath(m,x)+'" fill="url(#'+uid+i+')" stroke="var(--panel,#fff)" stroke-width="2"><title>'+esc(x.name+' '+pct(x))+'</title></path>').join('')+'<text class="donut-center" x="240" y="'+(m.cy-3)+'" text-anchor="middle">สัดส่วน</text><text class="donut-total" x="240" y="'+(m.cy+27)+'" text-anchor="middle">100%</text>'+m.items.map(x=>{if(m.inside){const r=(m.r+m.inner)/2,px=m.cx+r*Math.cos(x.mid),py=m.cy+r*Math.sin(x.mid);return '<text class="donut-inside" x="'+px+'" y="'+(py-5)+'" text-anchor="middle"><tspan x="'+px+'">'+esc(x.name)+'</tspan><tspan class="donut-percent" x="'+px+'" dy="25">'+pct(x)+'</tspan></text>'}const px=x.side<0?130:350,anchor=x.side<0?'end':'start',sx=m.cx+m.r*Math.cos(x.mid),sy=m.cy+m.r*Math.sin(x.mid);return '<path d="M'+sx+','+sy+' L'+(m.cx+x.side*112)+','+sy+' L'+(px-x.side*7)+','+(x.labelY-5)+'" fill="none" stroke="'+x.color+'" stroke-width="1.6"/><text class="donut-label" x="'+px+'" y="'+x.labelY+'" text-anchor="'+anchor+'">'+x.lines.map((line,i)=>'<tspan x="'+px+'" dy="'+(i?22:0)+'">'+esc(line)+'</tspan>').join('')+'<tspan class="donut-percent" x="'+px+'" dy="25">'+pct(x)+'</tspan></text>'}).join('')+'</svg>'}
 function chart(data,title){const shown=displayItems(data),grouped=shown.some(x=>x.members);return '<section class="card work-chart"><h3>'+title+'</h3>'+(data.total?donutSVG(data,title)+(grouped?'<p class="muted donut-note">วงกราฟแสดงหมวดหลักและอื่น ๆ · รายละเอียดครบทุกทรงด้านล่าง</p>':'')+'<ul class="work-legend">'+data.items.map(item=>'<li><i style="background:'+(shown.some(x=>x.members?.some(member=>member.name===item.name&&member.order===data.items.indexOf(item)))?'#64748b':item.color)+'"></i><span>'+esc(item.name)+'</span><b>'+num(item.count)+' คน ('+pct(item)+')</b></li>').join('')+'</ul><p class="work-chart-total">รวม '+num(data.total)+' คน</p>':'<p class="empty">ไม่มีข้อมูลบันทึก</p>')+(data.missing?'<p class="muted donut-note">คำนวณเฉพาะรายการที่บันทึกข้อมูลครบ</p>':'')+'</section>'}
 let reportStaff='';
 function report(period){const rows=state.entries.filter(x=>x.date.startsWith(period)&&(!reportStaff||x.staff===reportStaff));return `<section class="work-analytics"><div class="toolbar"><div class="field"><label>ช่างสำหรับกราฟ</label><select data-csp-change="report-staff"><option value="">ทุกคน</option>${[...new Set(state.entries.map(x=>x.staff))].map(x=>`<option ${x===reportStaff?'selected':''}>${esc(x)}</option>`).join('')}</select></div></div><div class="grid two">${chart(aggregate(rows,'paymentCounts'),'สัดส่วนวิธีการชำระเงิน')}${chart(aggregate(rows,'haircuts'),'สัดส่วนทรงผม')}</div></section>`}
 const daily=dailyPage,monthly=monthlyPage,summary=monthlySummaryPage,annual=annualSummaryPage,analytics=analyticsPage;
 dailyPage=()=>daily()+report(filters.daily||isoToday());monthlyPage=()=>monthly()+report(filters.month||currentMonth());monthlySummaryPage=()=>summary()+report(filters.summaryMonth||currentMonth());annualSummaryPage=()=>annual()+report(String(filters.annualYear||new Date().getFullYear()));
 analyticsPage=()=>analytics()+report(filters.anaMonth||currentMonth());
 function nameLines(name){const letters=glyphs(name),lines=[];for(let i=0;i<letters.length;i+=36)lines.push(letters.slice(i,i+36).join(''));return lines}
 function jpgRows(rows){return rows.filter(x=>!reportStaff||x.staff===reportStaff)}

 function jpgLegend(data,context){
  const columns=data.legendColumns===2&&data.items.length>1&&context?2:1;
  const rows=[];
  if(columns===2){context.save();context.font='500 18px Prompt, sans-serif';}
  try{
   for(let i=0;i<data.items.length;i+=columns){
    const items=data.items.slice(i,i+columns).map(item=>{
     if(columns===1)return{item,lines:nameLines(item.name)};
     const lines=[];let line='';
     for(const letter of glyphs(item.name)){
      if(line&&context.measureText(line+letter).width>278){lines.push(line);line=letter;}else line+=letter;
     }
     if(line)lines.push(line);
     return{item,lines};
    });
    rows.push({items,height:Math.max(...items.map(entry=>entry.lines.length))*24+30});
   }
  }finally{if(columns===2)context.restore();}
  return rows;
 }
 function jpgHeight(rows,models=null,context=null){
  return 250+Math.max(...['paymentCounts','haircuts'].map(key=>{
   const data=models?.[key]||aggregate(jpgRows(rows),key);
   return donutModel(data).height*1.22+jpgLegend(data,context).reduce((sum,row)=>sum+row.height,0);
  }));
 }
 function drawJPG(c,rows,y,models=null,scope=reportStaff||'ช่างทุกคน'){for(const [j,key,title] of [[0,'paymentCounts','สัดส่วนวิธีการชำระเงิน'],[1,'haircuts','สัดส่วนทรงผม']]){const d=models?.[key]||aggregate(jpgRows(rows),key),x=72+j*640;canvasText(c,title,x,y+30,26,700,'#182b49');canvasText(c,scope,x,y+60,18,500,'#566b87');if(!d.total){canvasText(c,'ไม่มีข้อมูลบันทึก',x,y+180,22,500,'#566b87');continue}const m=donutModel(d);c.save();c.translate(x,y+75);c.scale(1.22,1.22);for(const item of m.items){c.fillStyle=item.color;c.fill(new Path2D(ringPath(m,item,10)));c.fillStyle='rgba(7,19,45,.3)';c.fill(new Path2D(ringPath(m,item,10)));const gradient=c.createLinearGradient(0,m.cy-m.r,0,m.cy+m.r);gradient.addColorStop(0,item.color);gradient.addColorStop(1,item.color+'cc');c.fillStyle=gradient;c.fill(new Path2D(ringPath(m,item)));c.strokeStyle='#f5f7fc';c.lineWidth=2;c.stroke(new Path2D(ringPath(m,item)))}canvasText(c,'สัดส่วน',240,m.cy-3,16,500,'#566b87','center');canvasText(c,'100%',240,m.cy+27,28,700,'#182b49','center');for(const item of m.items){if(m.inside){const r=(m.r+m.inner)/2,px=m.cx+r*Math.cos(item.mid),py=m.cy+r*Math.sin(item.mid);canvasText(c,item.name,px,py-5,17,600,'#ffffff','center');canvasText(c,pct(item),px,py+20,21,700,'#ffffff','center')}else{const px=item.side<0?130:350,align=item.side<0?'right':'left',sx=m.cx+m.r*Math.cos(item.mid),sy=m.cy+m.r*Math.sin(item.mid);c.beginPath();c.moveTo(sx,sy);c.lineTo(m.cx+item.side*112,sy);c.lineTo(px-item.side*7,item.labelY-5);c.strokeStyle=item.color;c.lineWidth=1.6;c.stroke();item.lines.forEach((line,i)=>canvasText(c,line,px,item.labelY+i*22,m.font,500,'#182b49',align));canvasText(c,pct(item),px,item.labelY+(item.lines.length-1)*22+25,m.font+3,700,'#182b49',align)}}c.restore();let detailY=y+105+m.height*1.22;
for(const row of jpgLegend(d,c)){
 row.items.forEach(({item,lines},column)=>{
  const left=x+column*312;
  c.fillStyle=item.color;c.beginPath();c.arc(left+6,detailY-6,5,0,Math.PI*2);c.fill();
  lines.forEach((line,index)=>canvasText(c,line,left+22,detailY+index*24,18,500,'#182b49'));
  canvasText(c,num(item.count)+' คน ('+pct(item)+')',left+22,detailY+lines.length*24,18,600,'#182b49');
 });
 detailY+=row.height;
}
canvasText(c,'รวม '+num(d.total)+' คน',x,detailY+8,20,700,'#182b49');if(d.missing)canvasText(c,'คำนวณเฉพาะรายการที่บันทึกข้อมูลครบ',x,detailY+38,17,500,'#566b87')}}
 function entryBreakdown(row){
  const payment=row.paymentCounts,styles=row.haircuts;
  let payText='ยังไม่ได้บันทึก',hairText='ยังไม่ได้บันทึก';
  if(payment!=null){
   try{validate({heads:row.heads,paymentCounts:payment});payText='เงินสด '+num(payment.cash)+' คน · เงินโอน '+num(payment.transfer)+' คน';}
   catch{payText='ข้อมูลไม่สอดคล้องกับจำนวนลูกค้า';}
  }
  if(styles!=null){
   try{validate({heads:row.heads,haircuts:styles});hairText=styles.map(style=>esc(style.name)+' '+num(style.count)+' คน').join(' · ');}
   catch{hairText='ข้อมูลไม่สอดคล้องกับจำนวนลูกค้า';}
  }
  return '<details class="entry-breakdown"><summary>วิธีชำระและทรงผม</summary><div>วิธีชำระ · '+payText+'</div><div>ทรงผม · '+hairText+'</div></details>';
 }
 window.WorkDetails={chart,validate,entryBreakdown,read,aggregate,refresh,report,displayItems,donutModel,jpgHeight,drawJPG,setStaff(value){reportStaff=value;render()}};
})();
