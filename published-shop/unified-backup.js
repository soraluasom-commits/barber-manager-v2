/* Profile-local backup. No identity/license database is opened by this module. */
(() => {
 'use strict';
 const R=LearningRepo, FORMAT='barber-unified-backup', VERSION=1, MAX=110*1024*1024;
 const fields=['staffDirectory','staff','entries','expenses','funds','monthlySettings','expenseCategories','shopName','attendance','entryAudit','learningNotes','attendanceBackfillBackup'];
 let restoreBusy=true;R.read().then(r=>{restoreBusy=!!r.journal}).catch(()=>{restoreBusy=true});window.addEventListener("barber-restore-complete",()=>{restoreBusy=false});const guardedSave=save;save=function(...args){if(restoreBusy){toast('กำลังกู้คืนข้อมูล กรุณาดำเนินการให้เสร็จหรือย้อนกลับก่อน');return false}return guardedSave(...args)};
 const encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
 const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
 const un64=s=>{if(typeof s!=='string'||!s.length||s.length>MAX*1.4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)||s.length%4)throw Error('ข้อมูลไฟล์ไม่ถูกต้อง');return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
 const hash=async s=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof s==='string'?encoder.encode(s):s)));
 const mb=n=>n>0&&n<1024*1024?(n/1024).toFixed(1)+' KB':(n/1024/1024).toFixed(2)+' MB';
 function object(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
 function safeTree(x,depth=0){if(depth>24)throw Error('โครงสร้างข้อมูลลึกเกินไป');if(x&&typeof x==='object')for(const [k,v]of Object.entries(x)){if(['__proto__','prototype','constructor'].includes(k)||/private.?key|secret|license|device.?key|access.?token|refresh.?token/i.test(k))throw Error('พบข้อมูลกุญแจหรือฟิลด์ที่ไม่รองรับ');safeTree(v,depth+1)}}
 async function shopData(input){
  if(!object(input)||!Array.isArray(input.staff)||!Array.isArray(input.entries))throw Error('ไม่พบโครงสร้างข้อมูลร้าน');
  const out={};for(const k of fields)if(input[k]!==undefined)out[k]=structuredClone(input[k]);safeTree(out);
  for(const k of ['staff','entries','expenses','funds','expenseCategories','attendance','entryAudit'])if(out[k]!==undefined&&!Array.isArray(out[k]))throw Error('ชนิดข้อมูลไม่ถูกต้อง: '+k);
  for(const k of ['monthlySettings','learningNotes','attendanceBackfillBackup'])if(out[k]!==undefined&&!object(out[k]))throw Error('ชนิดข้อมูลไม่ถูกต้อง: '+k);
  for(const [month,setting] of Object.entries(out.monthlySettings||{})){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!object(setting))throw Error('การตั้งค่าเดือนไม่ถูกต้อง');if(setting.goals!==undefined&&(!object(setting.goals)||setting.goals.staff!==undefined&&!object(setting.goals.staff)||setting.goals.total!==undefined&&!object(setting.goals.total)))throw Error('โครงสร้างเป้าหมายไม่ถูกต้อง')}
  if((out.expenseCategories||[]).some(x=>typeof x!=='string'))throw Error('หมวดรายจ่ายไม่ถูกต้อง');
  for(const a of out.attendance||[])if(!object(a)||typeof a.staff!=='string'||typeof a.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||!['work','off','leave','unknown'].includes(a.status))throw Error('สถานะวันทำงานไม่ถูกต้อง');
  for(const note of Object.values(out.learningNotes||{}))if(!object(note)||note.note!==undefined&&typeof note.note!=='string')throw Error('บันทึกศูนย์เรียนรู้ไม่ถูกต้อง');
  for(const event of out.entryAudit||[])if(!object(event)||typeof event.action!=='string'||typeof event.at!=='string'||event.before!==null&&event.before!==undefined&&!object(event.before)||event.after!==null&&event.after!==undefined&&!object(event.after))throw Error('ประวัติแก้ไขไม่ถูกต้อง');
  if(out.attendanceBackfillBackup&&(!Array.isArray(out.attendanceBackfillBackup.before)||!Array.isArray(out.attendanceBackfillBackup.after)))throw Error('ประวัติสถานะย้อนหลังไม่ถูกต้อง');
  if(out.shopName!==undefined&&(typeof out.shopName!=='string'||out.shopName.length>500))throw Error('ชื่อร้านไม่ถูกต้อง');
  for(const k of ['entries','expenses','funds'])for(const row of out[k]||[]){if(!object(row)||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Number(row.amount))||row.amount===null)throw Error('รายการเงินไม่ถูกต้อง');if(k==='entries'&&(typeof row.staff!=='string'||!Number.isFinite(Number(row.heads))))throw Error('รายการช่างไม่ถูกต้อง')}
  for(const row of out.entries)window.WorkDetails?.validate(row);
  for(const event of out.entryAudit||[])for(const row of [event.before,event.after])if(row)window.WorkDetails?.validate(row);
  for(const staff of out.staff){if(!object(staff)||typeof staff.name!=='string')throw Error('ข้อมูลช่างไม่ถูกต้อง');if(staff.photo){if(typeof staff.photo!=='string'||staff.photo.length>200000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(staff.photo))throw Error('รูปช่างไม่ถูกต้อง');await R.imageBlob(new Blob([un64(staff.photo.split(',')[1])],{type:staff.photo.slice(5,staff.photo.indexOf(';'))}))}}
  if(out.staffDirectory!==undefined){if(!Array.isArray(out.staffDirectory)||out.staffDirectory.some(x=>!object(x)||typeof x.id!=='string'||!x.id||x.id.length>200||typeof x.name!=='string'||!Array.isArray(x.aliases)||x.aliases.some(a=>typeof a!=='string')||typeof x.active!=='boolean')||new Set(out.staffDirectory.map(x=>x.id)).size!==out.staffDirectory.length)throw Error('ทะเบียนรหัสช่างไม่ถูกต้อง');const ids=new Set(out.staffDirectory.map(x=>x.id));if(out.staff.some(x=>x.id&&!ids.has(x.id))||new Set(out.staff.filter(x=>x.id).map(x=>x.id)).size!==out.staff.filter(x=>x.id).length)throw Error('รหัสช่างซ้ำหรือไม่พบทะเบียน');for(const row of [...out.entries,...(out.attendance||[]),...(out.entryAudit||[]).flatMap(x=>[x.before,x.after].filter(Boolean))])if(row.staffId&&!ids.has(row.staffId))throw Error('รายการอ้างอิงรหัสช่างที่ไม่พบ');}
  // Same-origin WorkspaceStorage is typically smaller than IDB; reject oversized shop JSON early.
  if(JSON.stringify(out).length>4*1024*1024)throw Error('ข้อมูลบริหารร้านเกินขนาดที่รองรับ 4 ล้านตัวอักษร');
  return upgrade(out);
 }
 function counts(shop,lc){const records=lc?.records||[],map=new Map(R.seed.map(x=>[x.id,x]));for(const r of records)map.set(r.id,{...map.get(r.id),...r});const merged=[...map.values()];return {staff:shop.staff.length,entries:shop.entries.length,expenses:shop.expenses.length,funds:shop.funds.length,attendance:(shop.attendance||[]).length,audit:(shop.entryAudit||[]).length,hair:records.filter(x=>x.type==='learnHair').length,tools:records.filter(x=>x.type==='learnTools').length,brands:records.filter(x=>x.type==='learnBrands').length,images:(lc?.images.length||0)+shop.staff.filter(x=>x.photo).length,categories:new Set(records.filter(x=>x.cat).map(x=>x.type+':'+x.cat)).size,favorites:merged.filter(x=>x.favorite??shop.learningNotes?.[x.legacyKey]?.favorite).length,notes:merged.filter(x=>(records.find(r=>r.id===x.id)?.note)||(x.shopNote??shop.learningNotes?.[x.legacyKey]?.note)).length,trash:records.filter(x=>x.deleted||x.hidden).length}}
 async function key(password,salt,usage){return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,[usage])}
 function parseBackup(text) {
  const value=JSON.parse(text.replace(/^\uFEFF/,''));
  if(!object(value))throw Error('ไฟล์ JSON ไม่มีข้อมูลร้าน');
  return value;
 }
 async function restoreContext() {
  const host=window.BarberStoreHost;
  if(!host?.reviewCopy)throw Error('เปิดสำเนาร้านก่อนนำเข้า JSON');
  const context=await host.readContext();
  const access=await host.authorize(context);
  if(!access.canWrite)throw Error('บัญชีนี้ไม่มีสิทธิ์นำเข้าไฟล์');
  return context;
 }
 function checkBackupStore(context,source) {
  const sameStore=source?.storeId===context.storeId;
  const shopToReview=source?.storeId==='barber-v2'&&context.storeId==='barber-v2-review';
  if(source?.accountId!==context.accountId||!(sameStore||shopToReview))throw Error('ไฟล์สำรองนี้ระบุบัญชีหรือร้านอื่น');
 }
 async function create(password=''){await WorkspaceStorage.flush();
  const revision=(await R.read()).revision, original=JSON.stringify(state),shop=await shopData(state),learningCenter=await R.bundle();
  if(revision!==(await R.read()).revision||JSON.stringify(state)!==original)throw Error('ข้อมูลเปลี่ยนระหว่างสำรอง กรุณาลองใหม่');
  const {accountId,storeId}=await window.BarberStoreHost.readContext();
  const content=JSON.stringify({storeContext:{accountId,storeId},shop,learningCenter,createdAt:new Date().toISOString(),appVersion:'S0.18.0',counts:counts(shop,learningCenter)});
  const integrity=await hash(content);let envelope={format:FORMAT,schemaVersion:VERSION,encrypted:false,integrity,content};
  if(password){if(password.length<12)throw Error('รหัสผ่านสำรองต้องมีอย่างน้อย 12 ตัวอักษร');const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(FORMAT+':1')},await key(password,salt,'encrypt'),encoder.encode(JSON.stringify({content,integrity})));envelope={format:FORMAT,schemaVersion:VERSION,encrypted:true,kdf:'PBKDF2-SHA256',iterations:600000,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(cipher))}}
  const text=JSON.stringify(envelope);if(new Blob([text]).size>MAX)throw Error('ไฟล์สำรองใหญ่เกินขนาดที่รองรับ');return text;
 }
 async function inspect(text,password=''){
  if(new Blob([text]).size>MAX)throw Error('ไฟล์ใหญ่เกิน 110 MB');
  const context=await restoreContext();
  let value=parseBackup(text),payload,legacy=false;
  if(value.format==='sora-business-local-export'&&value.schemaVersion===1){
   if(Object.hasOwn(value,'storeContext'))checkBackupStore(context,value.storeContext);
   if(Object.hasOwn(value,'accountId')||Object.hasOwn(value,'storeId'))checkBackupStore(context,value);
   value=value.state;
   if(!object(value))throw Error('ไฟล์ JSON ไม่มีข้อมูลร้าน');
  }
  if(value.format===FORMAT){if(value.schemaVersion!==VERSION)throw Error('ไม่รองรับเวอร์ชันไฟล์นี้');let content=value.content,integrity=value.integrity;
   if(value.encrypted===true){if(value.kdf!=='PBKDF2-SHA256'||value.iterations!==600000)throw Error('วิธีเข้ารหัสไม่รองรับ');const salt=un64(value.salt),iv=un64(value.iv);if(salt.length!==16||iv.length!==12)throw Error('ข้อมูลเข้ารหัสไม่ถูกต้อง');try{const decoded=JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode(FORMAT+':1')},await key(password,salt,'decrypt'),un64(value.ciphertext))));content=decoded.content;integrity=decoded.integrity}catch{throw Error('รหัสผ่านไม่ถูกต้อง หรือไฟล์ถูกแก้ไข/เสียหาย')}}else if(value.encrypted!==false)throw Error('สถานะเข้ารหัสไม่ถูกต้อง');
   if(typeof content!=='string'||await hash(content)!==integrity)throw Error('ไฟล์เสียหายหรือข้อมูลไม่ครบ (checksum)');payload=JSON.parse(content);
   if(!object(payload)||!payload.learningCenter||!payload.createdAt||!object(payload.counts))throw Error('ข้อมูลในไฟล์ไม่ครบ');
   checkBackupStore(context,payload.storeContext);
  }else{
   if(Object.hasOwn(value,'format'))throw Error('ไม่รองรับรูปแบบไฟล์สำรองนี้');
   legacy=true;
   if(Object.hasOwn(value,'storeContext'))checkBackupStore(context,value.storeContext);
   if(Object.hasOwn(value,'accountId')||Object.hasOwn(value,'storeId'))checkBackupStore(context,value);
   payload={shop:value,learningCenter:value.learningCenter,createdAt:value.appMeta?.exportedAt||'ไม่ระบุ',appVersion:value.appMeta?.version||value.appMeta?.app||'เดิม'};
  }
  SubscriptionBackupValidation.validate(payload.shop);
  const shop=await shopData(payload.shop);
  const learning=payload.learningCenter?await R.validateBundle(payload.learningCenter):null;
  const summary=counts(shop,learning);if(!legacy&&JSON.stringify(summary)!==JSON.stringify(payload.counts))throw Error('จำนวนข้อมูลไม่ตรงกับบัญชีรายการสำรอง');
  return {shop,learning,summary,createdAt:payload.createdAt,version:legacy?'Legacy '+payload.appVersion:'Schema 1 / '+payload.appVersion,legacy,fileSize:new Blob([text]).size};
 }
 async function capacity(prepared){const current=await R.read(),bytes=prepared.learning?.images.reduce((n,x)=>n+x.blob.size,0)||0;const estimate=await navigator.storage?.estimate?.();const needed=bytes+JSON.stringify(prepared.shop).length*2+JSON.stringify(prepared.learning?.records||[]).length*2+1024*1024;if(estimate?.quota&&estimate.quota-estimate.usage<needed)throw Error('พื้นที่อุปกรณ์ไม่เพียงพอสำหรับกู้คืนพร้อมข้อมูลย้อนกลับ');return current}
 async function restore(prepared,expected){
  await restoreContext();
  await WorkspaceStorage.flush();
  const current=await capacity(prepared);
  if(expected&&(current.revision!==expected.revision||WorkspaceStorage.getItem(STORAGE)!==expected.shop))throw Error('ข้อมูลเปลี่ยนหลังเปิดหน้าตรวจสอบ กรุณาเลือกไฟล์ใหม่');
  if(current.journal)throw Error('มีการกู้คืนค้างอยู่');
  restoreBusy=true;
  try{
   await R.restore(prepared.learning||{version:1,records:current.records,images:current.images,history:current.history},
    current.revision,JSON.stringify(prepared.shop));
  }finally{restoreBusy=!!(await R.read()).journal}
  await window.BarberStorefront.refresh();
  toast('กู้คืนข้อมูลในสำเนาร้านแล้ว');
 }
 function modal(title,body){document.getElementById('ubDialog')?.remove();const d=document.createElement('dialog');d.id='ubDialog';d.className='lc-dialog';d.innerHTML=`<header><h2>${esc(title)}</h2><button class="btn" data-close type="button">ปิด</button></header>${body}<p id="ubError" role="alert"></p>`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();return d}
 const fail=(d,e)=>{const node=d.querySelector('#ubError');if(node)node.textContent=e instanceof SyntaxError?'อ่านไฟล์ JSON ไม่ได้ กรุณาเลือกไฟล์สำรองที่สมบูรณ์':e.message};
 async function write(text){const blob=new Blob([text],{type:'application/json'}),name=`barber_all_${isoToday()}.json`;if(window.showSaveFilePicker){try{const h=await showSaveFilePicker({suggestedName:name,types:[{description:'Barber backup',accept:{'application/json':['.json']}}]});const w=await h.createWritable();await w.write(blob);await w.close();return}catch(e){if(e.name==='AbortError')throw e}}download(name,text)}
 saveBackupAs=function(){const d=modal('สำรองข้อมูลร้านทั้งหมด',`<p>รวมข้อมูลบริหารร้าน ศูนย์เรียนรู้ทั้ง 3 หมวด รูปที่อัปโหลด รายการโปรด บันทึก และถังขยะของร้านนี้</p><form id="ubExport"><label><input id="ubEncrypt" type="checkbox"> เข้ารหัสไฟล์ด้วยรหัสผ่าน</label><div class="field"><label for="ubPassword">รหัสผ่านสำรอง (อย่างน้อย 12 ตัวอักษร)</label><input id="ubPassword" type="password" autocomplete="new-password" disabled></div><div class="field"><label for="ubRepeat">ยืนยันรหัสผ่าน</label><input id="ubRepeat" type="password" autocomplete="new-password" disabled></div><p id="ubPrivacy" class="notice">ไฟล์นี้ไม่ได้เข้ารหัส ผู้ที่ได้ไฟล์สามารถอ่านข้อมูลร้านได้</p><button class="btn primary" id="ubDownload">บันทึกไฟล์สำรอง</button></form>`);d.querySelector('#ubEncrypt').onchange=e=>{for(const id of ['ubPassword','ubRepeat'])d.querySelector('#'+id).disabled=!e.target.checked;d.querySelector('#ubPrivacy').textContent=e.target.checked?'โปรดเก็บรหัสผ่านแยกจากไฟล์ หากลืมจะไม่สามารถกู้คืนได้':'ไฟล์นี้ไม่ได้เข้ารหัส ผู้ที่ได้ไฟล์สามารถอ่านข้อมูลร้านได้'};d.querySelector('form').onsubmit=async e=>{e.preventDefault();const btn=d.querySelector('#ubDownload');btn.disabled=true;try{const password=d.querySelector('#ubEncrypt').checked?d.querySelector('#ubPassword').value:'';if(d.querySelector('#ubEncrypt').checked&&(password.length<12||password!==d.querySelector('#ubRepeat').value))throw Error('รหัสผ่านต้องตรงกันและมีอย่างน้อย 12 ตัวอักษร');await write(await create(password));d.close();toast('สำรองข้อมูลร้านทั้งหมดแล้ว')}catch(err){if(err.name!=='AbortError')fail(d,err)}finally{btn.disabled=false}}};
 const labels={staff:'ช่าง',entries:'รายการงาน',expenses:'รายจ่าย',funds:'รายรับ',attendance:'สถานะวันทำงาน',audit:'ประวัติแก้ไข',hair:'ทรงผมที่เพิ่ม/ปรับ',tools:'เครื่องมือที่เพิ่ม/ปรับ',brands:'แบรนด์ที่เพิ่ม/ปรับ',images:'รูปที่อัปโหลดรวมรูปช่าง',categories:'หมวดหมู่ของรายการที่ปรับ',favorites:'รายการโปรด/บันทึกเดิม',notes:'บันทึกช่าง',trash:'รายการในถังขยะ/ซ่อน'};
 importJSON=async function(file){if(!file)return;const d=modal('ตรวจสอบไฟล์ก่อนกู้คืน','<p id="ubStatus">กำลังตรวจสอบไฟล์…</p>');try{await restoreContext();if(window.OwnerSubscriptionAccess?.recoveryPending)throw Error('มีการกู้คืนค้างอยู่ กรุณาเลือกกู้คืนต่อหรือย้อนกลับก่อนนำเข้าไฟล์ใหม่');if(file.size>MAX)throw Error('ไฟล์ใหญ่เกิน 110 MB');const text=await file.text(),encrypted=parseBackup(text).encrypted===true;
   const preview=async password=>{const prepared=await inspect(text,password),current=await capacity(prepared),expected={revision:current.revision,shop:WorkspaceStorage.getItem(STORAGE)};
    const heads=prepared.shop.entries.reduce((total,row)=>total+Number(row.heads),0);
    const income=prepared.shop.entries.reduce((total,row)=>total+Number(row.amount),0);
    const headKeys=['staff','entries','expenses','funds'];
    const countsHTML=keys=>'<dl class="ub-counts">'+keys.map(k=>'<div><dt>'+labels[k]+'</dt><dd>'+num(prepared.summary[k])+'</dd></div>').join('')+'</dl>';
    const otherKeys=Object.keys(prepared.summary).filter(k=>!headKeys.includes(k));
    d.querySelector('#ubStatus')?.remove();d.querySelector('#ubUnlock')?.remove();d.querySelector('#ubError').textContent='';const section=document.createElement('section');section.innerHTML=`<h3>${esc(prepared.shop.shopName||'ร้านไม่ระบุชื่อ')}</h3><p>วันที่สำรอง: ${esc(Number.isNaN(Date.parse(prepared.createdAt))?prepared.createdAt:new Date(prepared.createdAt).toLocaleString('th-TH'))}<br>เวอร์ชัน: ${esc(prepared.version)}<br>ขนาดไฟล์: ${mb(file.size)}</p>${countsHTML(headKeys)}<details><summary>รายละเอียดอื่นในไฟล์</summary>${countsHTML(otherKeys)}</details><p>ลูกค้ารวม ${num(heads)} คน · ยอดจากรายการงาน ${money(income)}</p><p class="notice">จะแทนที่ข้อมูลในสำเนาร้าน “${esc(state.shopName||'ร้านปัจจุบัน')}” ${prepared.learning?'พร้อมศูนย์เรียนรู้และรูปที่อัปโหลดทั้งหมด':'เท่านั้น ศูนย์เรียนรู้ปัจจุบันจะคงอยู่'} ข้อมูลร้านออนไลน์จะคงเดิม</p>${prepared.legacy?'<p>ไฟล์รุ่นเดิมไม่มีค่าตรวจความสมบูรณ์หรือหลักฐานยืนยันเจ้าของ ใช้สำหรับกู้คืนในสำเนาร้านเท่านั้น</p>':''}<p>ควรสำรองข้อมูลปัจจุบันก่อนดำเนินการ หากข้อมูลเปลี่ยนหลังหน้านี้ ระบบจะหยุดให้ตรวจใหม่</p><button class="btn danger" id="ubRestore">ยืนยันกู้คืนในสำเนาร้าน</button>`;d.append(section);d.querySelector('#ubRestore').onclick=async()=>{const btn=d.querySelector('#ubRestore');btn.disabled=true;d.querySelector('[data-close]').disabled=true;const block=e=>e.preventDefault();d.addEventListener('cancel',block);try{await restore(prepared,expected);d.close()}catch(e){fail(d,e);if((await R.read()).journal){const b=document.createElement('button');b.className='btn';b.textContent='ย้อนกลับข้อมูลก่อนกู้คืน';b.onclick=async()=>{try{await R.rollback();restoreBusy=false;save('ย้อนกลับแล้ว');d.close();render()}catch(e){fail(d,e)}};d.append(b)}}finally{d.removeEventListener('cancel',block);d.querySelector('[data-close]').disabled=false}}};
   if(encrypted){d.querySelector('#ubStatus').textContent='ไฟล์เข้ารหัส กรุณาใส่รหัสผ่านสำรอง';d.insertAdjacentHTML('beforeend','<form id="ubUnlock"><label for="ubUnlockPassword">รหัสผ่านสำรอง</label><input id="ubUnlockPassword" type="password" autocomplete="off" required><button class="btn primary">ตรวจสอบไฟล์</button></form>');d.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await preview(d.querySelector('#ubUnlockPassword').value)}catch(err){fail(d,err)}finally{b.disabled=false}}}else await preview('');
  }catch(e){fail(d,e);d.querySelector('#ubStatus')?.remove()}};
 async function storagePanel(node){try{const root=await R.read();if(root.journal){restoreBusy=true;node.innerHTML='<h2>การกู้คืนยังไม่เสร็จ</h2><p>ข้อมูลเดิมยังอยู่ใน journal กรุณาเลือกทำต่อหรือย้อนกลับก่อนแก้ไขข้อมูล</p><button class="btn" id="ubResume">กู้คืนต่อ</button> <button class="btn" id="ubRollback">ย้อนกลับข้อมูลเดิม</button><p role="alert" id="ubRecoveryError"></p>';window.OwnerRecoveryDiagnostics?.(node,root);for(const [id,fn] of [['ubResume',R.recover],['ubRollback',R.rollback]])node.querySelector('#'+id).onclick=async()=>{try{await fn();restoreBusy=false;save('ดำเนินการกู้คืนแล้ว');render()}catch(e){node.querySelector('#ubRecoveryError').textContent=e.message}};return}const used=root.images.reduce((n,x)=>n+x.blob.size,0),pct=used/R.limit*100,estimate=await navigator.storage?.estimate?.(),persistent=await navigator.storage?.persisted?.();node.innerHTML=`<h2>พื้นที่ภาพศูนย์เรียนรู้</h2><p><b>${mb(used)}</b> / 50 MB · เหลือ ${mb(Math.max(0,R.limit-used))} (รวมถังขยะ)</p><progress max="50" value="${used/1024/1024}" aria-label="พื้นที่ภาพที่ใช้"></progress>${pct>=80?`<p role="alert" class="notice">${pct>=95?'พื้นที่ใกล้เต็ม':'ใช้พื้นที่เกิน 80%'} กรุณาสำรองและตรวจภาพที่ไม่ใช้ก่อนเพิ่มภาพใหม่</p>`:''}<p class="muted">เบราว์เซอร์อาจลบข้อมูลเมื่อพื้นที่อุปกรณ์ไม่พอหรือผู้ใช้ล้างข้อมูล แม้ภาพยังไม่ถึง 50 MB ควรเก็บไฟล์สำรองนอกเครื่อง<br>การจัดเก็บถาวร: ${persistent?'เบราว์เซอร์อนุญาตแล้ว (ยังล้างเองได้)':'ยังไม่ได้รับอนุญาต'}${estimate?.quota?' · พื้นที่ origin โดยประมาณ '+mb(estimate.usage)+' / '+mb(estimate.quota):''}</p><button class="btn" id="ubPersist">ขอให้เบราว์เซอร์เก็บข้อมูลถาวร</button><h3>ภาพที่ใช้พื้นที่มาก (เรียงจากมากไปน้อย)</h3><div class="ub-images">${root.images.slice().sort((a,b)=>b.blob.size-a.blob.size).map(x=>`<div><span>${esc(root.records.filter(r=>r.images.includes(x.id)).map(r=>r.name+(r.deleted?' (ถังขยะ)':'')).join(', ')||'ภาพไม่มีรายการอ้างอิง')} · ${mb(x.blob.size)}</span><button class="btn" data-remove-image="${x.id}">ลบภาพ</button></div>`).join('')||'<p>ยังไม่มีภาพที่อัปโหลดในศูนย์เรียนรู้</p>'}</div>`;node.querySelector('#ubPersist').onclick=async()=>{await navigator.storage?.persist?.();await storagePanel(node)};node.querySelectorAll('[data-remove-image]').forEach(b=>b.onclick=async()=>{if(!confirm('ลบไฟล์ภาพนี้จากทุกรายการที่อ้างอิง รวมถังขยะ? ภาพหน้าปกจะเปลี่ยนเป็นภาพถัดไป สำรองก่อนหากต้องการเก็บภาพนี้'))return;try{await R.removeImage(b.dataset.removeImage,root.revision);await storagePanel(node)}catch(e){alert(e.message)}})}catch(e){node.textContent=e.message}}
 const previousRender=render;render=function(){const result=previousRender();if(page==='backup'){const content=document.getElementById('content');content.querySelectorAll('[data-csp-click="backup"]').forEach(b=>b.textContent='สำรองข้อมูลร้านทั้งหมด');const box=document.createElement('section');box.className='card';box.id='ubStorage';content.append(box);storagePanel(box)}return result};
 window.UnifiedBackup={create,inspect,restore,capacity,counts,storagePanel};
})();
