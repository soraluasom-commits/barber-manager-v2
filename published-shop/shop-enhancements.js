/* Owner-authorized attendance, entry journal and learning annotations. */
(() => {
 const attendance=()=>Array.isArray(state.attendance)?state.attendance:[];
 const journal=()=>Array.isArray(state.entryAudit)?state.entryAudit:[];
 const statusLabels={work:'มาทำงาน',off:'หยุด',leave:'ลา'};
 function workingDays(name,period){
  const dates=new Set(state.entries.filter(e=>e.staff===name&&e.date?.startsWith(period)).map(e=>e.date));
  attendance().filter(a=>a.staff===name&&a.status==='work'&&a.date?.startsWith(period)&&a.date<=isoToday()).forEach(a=>dates.add(a.date));
  return dates.size;
 }
 function commit(change,message){
  const before=clone(state);
  try{change();if(save(message)===false)throw Error('บันทึกไม่สำเร็จ');return true}
  catch(err){state=before;toast('บันทึกไม่สำเร็จ ข้อมูลเดิมยังอยู่');return false}
 }
 function dayStatus(name,date){const explicit=attendance().find(a=>a.staff===name&&a.date===date)?.status;return explicit&&explicit!=='unknown'?explicit:(state.entries.some(e=>e.staff===name&&e.date===date)?'work':'off')}
 function attendancePanel(){
  const date=filters.attendanceDate||isoToday();
  return `<section class="card ops-attendance"><h2>วันทำงานและวันหยุด</h2><p class="muted">วันมีรายการงานนับเป็นวันทำงานอัตโนมัติ วันที่ไม่มีรายการนับเป็นหยุด • เลือกมาทำงานได้แม้ไม่มีลูกค้า</p><div class="field"><label for="attendanceDate">วันที่ตรวจ</label><input type="date" id="attendanceDate" value="${esc(date)}" max="${isoToday()}" data-csp-change="filter" data-csp-arg="attendanceDate"></div>${state.staff.map((s,i)=>`<div class="attendance-row"><span class="staff-identity"><span class="staff-avatar">${staffAvatar(i,s.name)}</span><b>${esc(s.name)}</b></span><label>สถานะของ ${esc(s.name)}<select aria-label="สถานะ ${esc(s.name)}" data-csp-change="attendance" data-csp-arg="${esc(i)}">${Object.entries(statusLabels).map(([key,label])=>`<option value="${key}" ${dayStatus(s.name,date)===key?'selected':''}>${label}</option>`).join('')}</select></label></div>`).join('')||'<p class="muted">เพิ่มชื่อช่างก่อนบันทึกสถานะ</p>'}</section>`;
 }
 function setAttendance(index,status){
  const name=state.staff[index]?.name,date=filters.attendanceDate||isoToday();
  if(!name||!Object.hasOwn(statusLabels,status)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>isoToday())return toast('ตรวจวันที่และสถานะอีกครั้ง');
  if(status!=='work'&&state.entries.some(e=>e.staff===name&&e.date===date)){toast('วันนี้มีรายการงาน หากลงผิดให้แก้รายการก่อน');render();return}
  commit(()=>{state.attendance=attendance().filter(a=>!(a.staff===name&&a.date===date));if(status!=='unknown')state.attendance.push({id:'attendance:'+date+':'+encodeURIComponent(name),staff:name,date,status,...(window.StaffIdentity?.selected(name)?{staffId:StaffIdentity.selected(name)}:{})})},'บันทึกสถานะแล้ว');
 }
 function log(action,before,after){state.entryAudit=[...journal(),{id:id(),at:new Date().toISOString(),action,before:before?clone(before):null,after:after?clone(after):null}]}
 let editBaseline=null;
 const openOriginal=openEntryModal;
 openEntryModal=function(key=''){
  const row=key?state.entries.find(e=>e.id===key):null;if(key&&!row)return toast('ไม่พบรายการนี้แล้ว');openOriginal(key);editBaseline=row?clone(row):null;
  const form=document.querySelector('#modalbox form');if(!form)return;
  const notice=document.createElement('div');notice.className='notice duplicate-notice';notice.hidden=true;form.prepend(notice);
  function check(){const f=new FormData(form),rows=state.entries.filter(e=>e.id!==key&&e.staff===f.get('staff')&&e.date===f.get('date'));notice.hidden=!rows.length;notice.replaceChildren();if(!rows.length)return;
   const p=document.createElement('p');p.textContent=`มี ${rows.length} รายการในวันนี้แล้ว รวม ${sum(rows,e=>e.heads)} คน / ${money(sum(rows,e=>e.amount))} เลือกแก้รายการเดิม หรือยืนยันเพิ่มรายการแยก`;notice.append(p);
   rows.forEach(row=>{const b=document.createElement('button');b.type='button';b.className='btn small';b.textContent=`แก้รายการเดิม ${num(row.heads)} คน / ${money(row.amount)}`;b.onclick=()=>openEntryModal(row.id);notice.append(b)});
   const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.name='confirmSeparate';label.append(check,document.createTextNode(' ยืนยันบันทึกเป็นรายการแยก'));notice.append(label);
  }
  form.elements.date.addEventListener('change',check);form.elements.staff.addEventListener('change',check);check();
  if(key){const b=document.createElement('button');b.type='button';b.className='btn danger';b.textContent='ลบรายการนี้';b.onclick=()=>remove(key);form.querySelector('.actions').append(b)}
 };
 saveEntry=function(event,key=''){
  event.preventDefault();const form=event.target,f=new FormData(form),current=key?state.entries.find(e=>e.id===key):null;
  if(key&&(!current||JSON.stringify(current)!==JSON.stringify(editBaseline)))return toast('รายการเปลี่ยนแล้ว กรุณาปิดและเปิดใหม่ก่อนแก้ไข');
  const next={id:key||id(),date:String(f.get('date')),staff:String(f.get('staff')),amount:n(f.get('amount')),heads:n(f.get('heads')),notes:String(f.get('notes')||'')};next.weekday=weekday(next.date);if(window.StaffIdentity){const sid=StaffIdentity.selected(next.staff);if(sid)next.staffId=sid;}
  if(window.WorkDetails){try{Object.assign(next,WorkDetails.read(form))}catch(e){return toast(e.message)}}
  if(!next.staff||!/^\d{4}-\d{2}-\d{2}$/.test(next.date)||next.amount<0||next.heads<0||!Number.isInteger(next.heads))return toast('ตรวจชื่อ วันที่ รายได้ และจำนวนลูกค้า');
  const same=state.entries.filter(e=>e.id!==key&&e.staff===next.staff&&e.date===next.date);
  if(same.length&&!f.has('confirmSeparate'))return toast('มีรายการวันเดียวกันแล้ว กรุณาเลือกแก้เดิมหรือยืนยันเพิ่มแยก');
  if(['off','leave'].includes(attendance().find(a=>a.staff===next.staff&&a.date===next.date)?.status))return toast('วันนี้ระบุหยุด/ลา กรุณาเปลี่ยนสถานะเป็นมาทำงานก่อน');
  if(commit(()=>{if(key)state.entries[state.entries.findIndex(e=>e.id===key)]=next;else state.entries.push(next);log(key?'แก้ไข':'เพิ่ม',current,next)},'บันทึกงานแล้ว')){filters.entryDate=next.date;closeModal()}
 };
 function remove(key){const row=state.entries.find(e=>e.id===key);if(!row||!confirm(`ลบงาน ${row.staff} วันที่ ${row.date} จำนวน ${num(row.heads)} คน? กู้คืนได้ในประวัติการแก้ไข`))return;
  if(commit(()=>{state.entries=state.entries.filter(e=>e.id!==key);log('ลบ',row,null)},'ลบแล้ว กู้คืนได้ในประวัติการแก้ไข'))closeModal();
 }
 const oldDelete=del;del=function(collection,key){return collection==='entries'?remove(key):oldDelete(collection,key)};
 function restore(auditId){const item=journal().find(a=>a.id===auditId);if(!item||item.action!=='ลบ'||!item.before)return;
  if(state.entries.some(e=>e.id===item.before.id))return toast('รายการนี้อยู่ในข้อมูลแล้ว ไม่กู้คืนซ้ำ');
  if(['off','leave'].includes(attendance().find(a=>a.staff===item.before.staff&&a.date===item.before.date)?.status))return toast('วันนี้ระบุหยุด/ลา กรุณาเปลี่ยนสถานะก่อนกู้คืนงาน');
  if(!confirm(`กู้คืนงาน ${item.before.staff} วันที่ ${item.before.date}?`))return;
  commit(()=>{state.entries.push(clone(item.before));log('กู้คืน',null,item.before)},'กู้คืนรายการแล้ว');
 }
 function history(){return `<section class="card ops-audit"><h2>ประวัติการแก้ไขและกู้คืน</h2><p class="muted">เริ่มเก็บตั้งแต่เปิดใช้ฟังก์ชันนี้ • บัญชีร้านใช้ร่วมกัน จึงไม่ระบุว่าใครเป็นผู้แก้ไข • แสดง 50 เหตุการณ์ล่าสุด</p>${journal().slice().reverse().slice(0,50).map(a=>{const row=a.after||a.before;return `<details><summary>${esc(a.action)} · ${esc(row?.staff)} · ${esc(row?.date)} <small>${esc(new Date(a.at).toLocaleString('th-TH'))}</small></summary>${a.before?`<p>ก่อน: ${num(a.before.heads)} คน / ${money(a.before.amount)} · ${esc(a.before.notes)}</p>`:''}${a.after?`<p>หลัง: ${num(a.after.heads)} คน / ${money(a.after.amount)} · ${esc(a.after.notes)}</p>`:''}${a.action==='ลบ'&&!state.entries.some(e=>e.id===a.before?.id)?`<button class="btn small" data-restore="${esc(a.id)}">กู้คืนรายการนี้</button>`:''}</details>`}).join('')||'<p class="muted">ยังไม่มีประวัติการแก้ไข</p>'}</section>`}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-restore]');if(b)restore(b.dataset.restore)});
 const oldHistory=historyPage;historyPage=()=>oldHistory()+history();
 const oldEntry=entryPage;entryPage=()=>oldEntry()+history();
 const oldStaff=staffPage;staffPage=()=>oldStaff()+attendancePanel();
 renameStaff=function(index){const old=state.staff[index]?.name;if(!old)return;const name=prompt('เปลี่ยนชื่อช่าง',old)?.trim();if(!name||name===old)return;if(staffNames().includes(name))return toast('มีชื่อนี้แล้ว');
  commit(()=>{state.staff[index].name=name;state.entries.forEach(e=>{if(e.staff===old)e.staff=name});attendance().forEach(a=>{if(a.staff===old)a.staff=name});Object.values(state.monthlySettings).forEach(s=>{if(s.goals?.staff?.[old]){s.goals.staff[name]=s.goals.staff[old];delete s.goals.staff[old]}})},'เปลี่ยนชื่อแล้ว');
 };
 const personalKey=x=>x.id||'library:'+encodeURIComponent(x.en);
 function personal(x){return state.learningNotes?.[personalKey(x)]||{}}
 function personalHTML(x){const p=personal(x);return `<div class="learning-personal"><button class="btn small" data-personal="${esc(personalKey(x))}">${p.favorite?'★ รายการโปรด':'☆ บันทึกของร้าน'}</button><span class="learn-review">${p.reviewed?'✓ ช่างตรวจแล้ว':'รอตรวจ'+(x.image?'ภาพ':'ข้อมูล')}</span>${p.note?`<p>${esc(p.note)}</p>`:''}</div>`}
 function editPersonal(key){const p=state.learningNotes?.[key]||{};modal(`<div class="modalhead"><h3>บันทึกของร้าน</h3><button class="close" data-csp-click="close-modal">✕</button></div><form id="personalForm"><label class="check-row"><input type="checkbox" name="favorite" ${p.favorite?'checked':''}> รายการโปรด</label><label class="check-row"><input type="checkbox" name="reviewed" ${p.reviewed?'checked':''}> ฉันตรวจเทียบภาพ/ข้อมูลแล้ว</label><div class="field"><label for="personalNote">หมายเหตุช่าง</label><textarea id="personalNote" name="note" maxlength="2000">${esc(p.note||'')}</textarea></div><p class="muted">การยืนยันนี้มาจากผู้ใช้บัญชีร้าน ไม่ใช่การรับรองโดย AI</p><div class="actions"><button class="btn primary">บันทึก</button><button type="button" class="btn" data-csp-click="close-modal">ยกเลิก</button></div></form>`);document.getElementById('personalForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);if(commit(()=>{state.learningNotes??={};state.learningNotes[key]={favorite:f.has('favorite'),reviewed:f.has('reviewed'),note:String(f.get('note')||'').slice(0,2000),updatedAt:new Date().toISOString()}},'บันทึกของร้านแล้ว'))closeModal()}}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-personal]');if(b)editPersonal(b.dataset.personal)});
 function backfillPlan(){
  const cutoff=isoToday().slice(0,7)+'-01',dates=state.entries.map(e=>e.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<cutoff).sort();
  if(!dates.length)return null;
  const start=dates[0],names=[...new Set([...state.staff.map(s=>s.name),...state.entries.map(e=>e.staff)].filter(Boolean))],worked=new Set(state.entries.map(e=>e.date+'|'+e.staff)),rows=[];
  for(let d=new Date(start+'T12:00:00');;d.setDate(d.getDate()+1)){const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(date>=cutoff)break;for(const staff of names)rows.push({id:'attendance:'+date+':'+encodeURIComponent(staff),staff,date,status:worked.has(date+'|'+staff)?'work':'off'});}
  return {start,cutoff,rows};
 }
 function backfill(){const p=backfillPlan();if(!p)return toast('ไม่มีรายการก่อนเดือนนี้');if(!confirm(`ปรับสถานะ ${p.rows.length} วัน-คน ตั้งแต่ ${p.start} ถึงก่อน ${p.cutoff} ตามรายการงาน? เดือนนี้ไม่เปลี่ยน และย้อนคืนได้`))return;
  commit(()=>{const before=clone(attendance()),after=[...before.filter(a=>a.date<p.start||a.date>=p.cutoff),...p.rows];state.attendanceBackfillBackup={before,after:clone(after),start:p.start,cutoff:p.cutoff,at:new Date().toISOString()};state.attendance=after},'ปรับข้อมูลย้อนหลังแล้ว');
 }
 function undoBackfill(){const b=state.attendanceBackfillBackup;if(!b)return;const range=a=>a.date>=b.start&&a.date<b.cutoff;if(JSON.stringify(attendance().filter(range))!==JSON.stringify(b.after.filter(range)))return toast('มีการแก้สถานะย้อนหลังเพิ่มแล้ว จึงไม่ย้อนทับข้อมูลใหม่');if(!confirm('คืนสถานะย้อนหลังเป็นก่อนปรับ โดยคงเดือนนี้ไว้?'))return;commit(()=>{state.attendance=[...attendance().filter(a=>!range(a)),...b.before.filter(range)];delete state.attendanceBackfillBackup},'คืนสถานะเดิมแล้ว')}
 function leaveReason(index){const name=state.staff[index]?.name,date=filters.attendanceDate||isoToday(),row=attendance().find(a=>a.staff===name&&a.date===date);if(row?.status!=='leave')return;modal(`<h3>เหตุผลการลา · ${esc(name)}</h3><form id="leaveReasonForm"><div class="field"><label for="leaveReason">เหตุผลการลา (ไม่บังคับ)</label><textarea id="leaveReason" maxlength="1000">${esc(row.reason||'')}</textarea></div><div class="actions"><button class="btn primary">บันทึกเหตุผล</button><button type="button" class="btn" data-csp-click="close-modal">ยกเลิก</button></div></form>`);document.getElementById('leaveReasonForm').onsubmit=e=>{e.preventDefault();const reason=document.getElementById('leaveReason').value.trim();if(commit(()=>{const current=attendance().find(a=>a.staff===name&&a.date===date);if(current?.status!=='leave')throw Error();current.reason=reason},'บันทึกเหตุผลแล้ว'))closeModal()}}
 const attendanceStaffPage=staffPage;staffPage=()=>{let html=attendanceStaffPage();const p=backfillPlan(),b=state.attendanceBackfillBackup;html+=`<section class="card"><h2>ปรับสถานะย้อนหลัง</h2><p class="muted">มีรายการงาน = มาทำงาน · ไม่มีรายการ = หยุด รวมชื่อช่างในประวัติ ไม่เปลี่ยนข้อมูลเดือนนี้หรือรายการเงิน</p>${p?`<p>ช่วง ${esc(p.start)} ถึงก่อน ${esc(p.cutoff)} · ${p.rows.length} วัน-คน</p><button class="btn primary" data-csp-click="attendance-backfill">ปรับข้อมูลย้อนหลังตามรายการงาน</button>`:'<p>ไม่มีรายการก่อนเดือนนี้</p>'}${b?`<p role="status">ปรับย้อนหลังแล้ว ${esc(b.start)} ถึงก่อน ${esc(b.cutoff)}</p><button class="btn" data-csp-click="attendance-undo">ย้อนคืนสถานะก่อนปรับ</button>`:''}</section>`;const date=filters.attendanceDate||isoToday();html+=state.staff.map((s,i)=>{const a=attendance().find(a=>a.staff===s.name&&a.date===date&&a.status==='leave');return a?`<section class="card"><b>${esc(s.name)} · ลา</b><p>${esc(a.reason||'ยังไม่ได้ระบุเหตุผล')}</p><button class="btn small" data-csp-click="leave-reason" data-csp-arg="${esc(i)}">เพิ่ม / แก้เหตุผลการลา</button></section>`:''}).join('');return html};
 const setStatus=setAttendance;setAttendance=function(index,status){const old=attendance().find(a=>a.staff===state.staff[index]?.name&&a.date===(filters.attendanceDate||isoToday()));if(old?.status===status){if(status==='leave')leaveReason(index);return}setStatus(index,status);if(status==='leave')leaveReason(index)};
 window.BarberOps={workingDays,setAttendance,personal,personalHTML,restore,backfill,backfillPlan,undoBackfill,leaveReason};
})();
