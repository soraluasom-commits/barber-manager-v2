import {workspaceData} from './store/workspace-data.js';

export function mountLegacyImport(content,host,refresh) {
  const oldImport=content.querySelector('input[data-csp-change="import-json"]');
  const tabs=content.querySelector(':scope > .page-tabs');
  const add=section=>{if(tabs)tabs.after(section);else content.prepend(section);};
  if(host.releaseMode){
    oldImport?.closest('label')?.remove();
    for(const action of ['reset-shop','restore-snapshot'])content.querySelector('[data-csp-click="'+action+'"]')?.remove();
    const open=document.createElement('a');open.className='btn';open.href='?review-copy=1#backup';
    open.textContent='ทดสอบนำเข้า JSON ในสำเนาร้าน';
    add(open);
    return;
  }
  const card=document.createElement('section');card.className='card';
  card.innerHTML='<h2>นำเข้า JSON จากเว็บร้านเดิม</h2><p>ตรวจจำนวนรายการและยอดเงินก่อนนำเข้า พื้นที่นี้ใช้ตรวจการกู้คืน</p><label class="field">ไฟล์ JSON รุ่นเดิม<input type="file" accept=".json,application/json"></label><div class="actions"><button class="btn" type="button">ตรวจไฟล์</button><button class="btn primary" type="button" disabled>ยืนยันนำเข้า</button></div><p role="status" aria-live="polite"></p>';
  add(card);
  const file=card.querySelector('input'),[inspect,apply]=card.querySelectorAll('button'),status=card.querySelector('[role="status"]');
  let prepared,busy=false;
  const setBusy=active=>{
    busy=active;file.disabled=active;inspect.disabled=active;apply.disabled=active||!prepared;
  };
  file.addEventListener('change',()=>{prepared=null;status.textContent='กดตรวจไฟล์เพื่อดูข้อมูลก่อนนำเข้า';setBusy(false);});
  inspect.addEventListener('click',async()=>{
    const selected=file.files[0];
    prepared=null;
    if(!selected){status.textContent='กรุณาเลือกไฟล์ JSON';return;}
    setBusy(true);
    try{
      if(selected.size>4*1024*1024)throw Error('ไฟล์ข้อมูลร้านเกิน 4 MB');
      const raw=JSON.parse((await selected.text()).replace(/^\uFEFF/,''));
      window.SubscriptionBackupValidation.validate(raw);
      const model=workspaceData(raw,state);
      const total=model.entries.reduce((sum,row)=>sum+Number(row.amount),0);
      const heads=model.entries.reduce((sum,row)=>sum+Number(row.heads),0);
      prepared={model,previous:WorkspaceStorage.getItem(STORAGE),revision:(await LearningRepo.read()).revision};
      status.textContent='ช่าง '+model.staff.length+' คน · งาน '+model.entries.length+' รายการ · ลูกค้า '+heads+' คน · ยอดงาน '+total.toLocaleString('th-TH')+' บาท';
    } catch(error){status.textContent=error instanceof SyntaxError?'อ่านไฟล์ JSON ไม่ได้':error.message;}
    finally{setBusy(false);}
  });
  apply.addEventListener('click',async()=>{
    if(!prepared||busy||!confirm('แทนที่ข้อมูลเฉพาะในพื้นที่ตรวจนี้ด้วยไฟล์ที่ตรวจแล้วหรือไม่?'))return;
    const expected=prepared;prepared=null;setBusy(true);
    try {
      await WorkspaceStorage.flush();
      const library=await LearningRepo.read();
      if(library.revision!==expected.revision || WorkspaceStorage.getItem(STORAGE)!==expected.previous)throw Error('ข้อมูลเปลี่ยนหลังตรวจไฟล์ กรุณาตรวจใหม่');
      await LearningRepo.restore(library,library.revision,JSON.stringify(expected.model));
      await refresh();toast('นำเข้า JSON แล้ว');
    }catch(error){status.textContent=error.message;}
    finally{setBusy(false);}
  });
}
