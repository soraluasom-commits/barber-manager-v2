/* Small embedded portraits follow existing staff JSON backup/sync. */
(() => {
 const valid=src=>typeof src==='string'&&src.length<=100000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src);
 const photo=name=>{const src=state.staff.find(s=>s.name===name)?.photo;return valid(src)?src:''};
 const image=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('เปิดภาพไม่ได้ กรุณาเลือกไฟล์ใหม่'));img.src=src});
 let draft=null,version=0;
 async function select(file){
  const ticket=++version;if(!file||!draft)return;
  const status=document.getElementById('staffPhotoStatus'),submit=document.getElementById('staffPhotoSave');
  submit.disabled=true;status.textContent='กำลังเตรียมรูป…';
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('รองรับรูป JPG, PNG และ WebP');
   if(file.size>10*1024*1024)throw Error('กรุณาเลือกรูปขนาดไม่เกิน 10 MB');
   const url=URL.createObjectURL(file);let img;try{img=await image(url)}finally{URL.revokeObjectURL(url)}
   if(ticket!==version||!draft)return;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
   const c=canvas.getContext('2d'),side=Math.min(img.naturalWidth,img.naturalHeight);
   c.fillStyle='#ffffff';c.fillRect(0,0,192,192);
   c.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,192,192);
   draft.photo=canvas.toDataURL('image/jpeg',.82);preview();status.textContent='รูปพร้อมแล้ว กดบันทึกเพื่อใช้รูปนี้';
  }catch(err){if(ticket===version)status.textContent=err.message}
  finally{if(ticket===version&&submit.isConnected)submit.disabled=false}
 }
 function preview(){const el=document.getElementById('staffPhotoPreview');if(el)el.innerHTML=draft?.photo?`<img src="${esc(draft.photo)}" alt="ตัวอย่างรูปช่าง">`:'<span aria-hidden="true">👤</span>'}
 function open(index=null){
  version++;const person=index===null?null:state.staff[index];if(index!==null&&!person)return;
  draft={person,photo:person?photo(person.name):''};
  modal(`<div class="modalhead"><h3>${person?'รูปประจำตัว: '+esc(person.name):'เพิ่มช่าง'}</h3><button class="close" type="button" aria-label="ปิด" onclick="closeModal()">✕</button></div><form id="staffPhotoForm"><div class="staff-photo-editor"><div id="staffPhotoPreview" class="staff-photo-preview"></div><div class="field">${person?'':`<label for="staffNewName">ชื่อช่าง</label><input id="staffNewName" required maxlength="120" autocomplete="off">`}<label for="staffPhotoFile">รูปใบหน้า (ไม่บังคับ)</label><input id="staffPhotoFile" type="file" accept="image/jpeg,image/png,image/webp"><small class="muted">เลือกภาพใบหน้าตรงกลาง ระบบจะครอปกลางภาพและย่อให้</small><button type="button" class="btn small" id="staffPhotoRemove">นำรูปออก</button></div></div><p id="staffPhotoStatus" role="status" aria-live="polite"></p><div class="actions"><button class="btn primary" id="staffPhotoSave">บันทึก</button><button type="button" class="btn" onclick="closeModal()">ยกเลิก</button></div></form>`);
  preview();document.getElementById('staffPhotoFile').onchange=e=>select(e.target.files[0]);
  document.getElementById('staffPhotoRemove').onclick=()=>{version++;draft.photo='';preview();document.getElementById('staffPhotoFile').value='';document.getElementById('staffPhotoSave').disabled=false;document.getElementById('staffPhotoStatus').textContent='กดบันทึกเพื่อนำรูปออก'};
  document.getElementById('staffPhotoForm').onsubmit=event=>{
   event.preventDefault();const status=document.getElementById('staffPhotoStatus');if(!draft)return;
   const name=person?person.name:document.getElementById('staffNewName').value.trim();
   if(!name){status.textContent='กรุณาระบุชื่อช่าง';return}
   if(!person&&staffNames().includes(name)){status.textContent='มีชื่อช่างนี้แล้ว';return}
   if(person&&!state.staff.includes(person)){status.textContent='ข้อมูลช่างเปลี่ยนแล้ว กรุณาปิดและเปิดใหม่';return}
   const next=clone(state),target=person?next.staff[state.staff.indexOf(person)]:{name};
   if(draft.photo)target.photo=draft.photo;else delete target.photo;
   if(!person)next.staff.push(target);
   const previous=state;
   try{state=next;if(save(person?'บันทึกรูปช่างแล้ว':'เพิ่มช่างแล้ว')===false)throw Error('save declined');draft=null;version++;closeModal()}
   catch(err){state=previous;try{localStorage.setItem(STORAGE,JSON.stringify(previous))}catch(_){}status.textContent='บันทึกไม่ได้ พื้นที่จัดเก็บอาจเต็ม กรุณาสำรองข้อมูลแล้วลองใหม่'}
  };
  document.getElementById(person?'staffPhotoFile':'staffNewName').focus();
 }
 const original=staffPage;
 staffPage=function(){const template=document.createElement('template');template.innerHTML=original();template.content.querySelectorAll('.staff-row').forEach((row,i)=>{const person=state.staff[i];if(!person)return;const label=row.querySelector('b');label.classList.add('staff-identity');label.insertAdjacentHTML('afterbegin',`<span class="avatar staff-avatar">${staffAvatar(i,person.name)}</span>`);row.querySelector('.actions')?.insertAdjacentHTML('afterbegin',`<button class="btn small" onclick="BarberStaff.open(${i})">${photo(person.name)?'เปลี่ยนรูป':'เพิ่มรูป'}</button>`)});return template.innerHTML};
 addStaff=()=>open();
 window.BarberStaff={open,photo,load:async name=>{try{return photo(name)?await image(photo(name)):null}catch(_){return null}}};
})();
