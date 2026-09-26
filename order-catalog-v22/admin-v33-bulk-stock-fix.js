/* V2.16 - reliable bulk retail + stock update with verification */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function readOptionalStock(sel){
    const el=document.querySelector(sel); if(!el)return null;
    const raw=String(el.value??'').trim();
    if(raw==='')return null;
    const v=Number(raw);
    return Number.isFinite(v)&&v>=0?Math.floor(v):NaN;
  }

  async function patchStockWithRetry(p,use10,use30,s10,s30,attempts=4){
    const stock={...(p.stock||{})};
    if(use10&&s10!==null)stock['10ml']=s10;
    if(use30&&s30!==null)stock['30ml']=s30;
    let lastErr=null;
    for(let a=1;a<=attempts;a++){
      try{
        const saved=await req('/api/admin/products/'+encodeURIComponent(p.id),{
          method:'PATCH',
          body:JSON.stringify({stock,stockTracked:true})
        });
        return saved;
      }catch(e){
        lastErr=e;
        if(a<attempts)await sleep(350*a);
      }
    }
    throw lastErr||new Error('อัปเดต Stock ไม่สำเร็จ');
  }

  function matchesStock(p,use10,use30,s10,s30){
    if(!p)return false;
    if((use10&&s10!==null)&&Number(p.stock?.['10ml']??-1)!==s10)return false;
    if((use30&&s30!==null)&&Number(p.stock?.['30ml']??-1)!==s30)return false;
    return p.stockTracked===true;
  }

  async function updatePool(items,worker,progress){
    let cursor=0,done=0,failed=[];
    const runners=Array.from({length:Math.min(2,items.length)},async()=>{
      while(true){
        const i=cursor++;
        if(i>=items.length)return;
        const item=items[i];
        try{await worker(item)}catch(e){failed.push({item,error:e})}
        done++;
        if(progress)progress.textContent=`กำลังอัปเดต Stock ${done}/${items.length} รายการ...`;
      }
    });
    await Promise.all(runners);
    return failed;
  }

  function wireReliableBulk(){
    const btn=document.querySelector('#bulkApply');
    const box=document.querySelector('.bulkbox');
    if(!btn||!box)return;

    const title=box.querySelector('.sectiontitle');
    if(title)title.textContent='กำหนดราคาปลีกและ Stock สินค้าทั้งหมดในครั้งเดียว';
    btn.textContent='กำหนดราคาปลีกและ Stock ให้สินค้าที่เลือก';

    btn.onclick=async()=>{
      const use10=!!document.querySelector('#bulkSize10')?.checked;
      const use30=!!document.querySelector('#bulkSize30')?.checked;
      if(!use10&&!use30)return alert('กรุณาเลือกอย่างน้อย 1 ขนาด');

      const r10=Number(document.querySelector('#bulkR10')?.value||0);
      const r30=Number(document.querySelector('#bulkR30')?.value||0);
      const s10=readOptionalStock('#bulkS10');
      const s30=readOptionalStock('#bulkS30');
      if(Number.isNaN(s10)||Number.isNaN(s30))return alert('Stock ต้องเป็นเลข 0 ขึ้นไป');

      const prices={};
      if(use10)prices['10ml']={retail:Math.max(0,r10)};
      if(use30)prices['30ml']={retail:Math.max(0,r30)};
      const activeOnly=!!document.querySelector('#bulkActiveOnly')?.checked;
      const target=(products||[]).filter(p=>!activeOnly||p.active!==false);
      const hasStock=(use10&&s10!==null)||(use30&&s30!==null);
      const scope=activeOnly?'เฉพาะสินค้าที่เปิดแสดง':'สินค้าทั้งหมด';
      const details=[];
      if(use10)details.push(`10ml ปลีก ${r10.toLocaleString('th-TH')} บาท${s10===null?' / Stock ไม่เปลี่ยน':` / Stock ${s10}`}`);
      if(use30)details.push(`30ml ปลีก ${r30.toLocaleString('th-TH')} บาท${s30===null?' / Stock ไม่เปลี่ยน':` / Stock ${s30}`}`);
      if(!confirm(`ยืนยันอัปเดต${scope} ${target.length} รายการ?\n\n${details.join('\n')}\n\nระบบจะตรวจสอบ Stock ซ้ำหลังบันทึกให้ครบทุกสินค้า`))return;

      const progress=document.querySelector('#bulkStockProgress');
      btn.disabled=true;
      try{
        if(progress)progress.textContent='กำลังอัปเดตราคาปลีก...';
        await req('/api/admin/products/bulk-prices',{method:'PUT',body:JSON.stringify({prices,activeOnly})});

        let unresolved=[];
        if(hasStock){
          const targetIds=new Set(target.map(p=>String(p.id)));
          const failed=await updatePool(target, p=>patchStockWithRetry(p,use10,use30,s10,s30,4), progress);

          if(progress)progress.textContent='กำลังตรวจสอบ Stock หลังบันทึก...';
          let latest=await req('/api/admin/products');
          unresolved=latest.filter(p=>targetIds.has(String(p.id))&&!matchesStock(p,use10,use30,s10,s30));

          // Retry any mismatches one by one, then verify again.
          for(let round=1;round<=2 && unresolved.length;round++){
            if(progress)progress.textContent=`ตรวจพบ ${unresolved.length} รายการยังไม่ตรง กำลังแก้ซ้ำรอบ ${round}...`;
            for(let i=0;i<unresolved.length;i++){
              try{await patchStockWithRetry(unresolved[i],use10,use30,s10,s30,4)}catch{}
              if(progress)progress.textContent=`แก้ซ้ำรอบ ${round}: ${i+1}/${unresolved.length}`;
            }
            latest=await req('/api/admin/products');
            unresolved=latest.filter(p=>targetIds.has(String(p.id))&&!matchesStock(p,use10,use30,s10,s30));
          }
          products=latest;
          if(failed.length&&progress)progress.textContent=`รอบแรกมี ${failed.length} รายการที่ต้อง retry • ตรวจสอบสุดท้ายแล้ว`;
        }else{
          products=await req('/api/admin/products');
        }

        drawProducts();
        if(unresolved.length){
          const ids=unresolved.slice(0,12).map(p=>p.id).join(', ');
          if(progress)progress.textContent=`ยังมี ${unresolved.length} รายการที่ Stock ไม่ตรง`;
          alert(`ราคาปลีกอัปเดตแล้ว แต่ยังมี Stock ไม่ตรง ${unresolved.length} รายการ\n${ids}${unresolved.length>12?' ...':''}`);
        }else{
          const msg=hasStock?`Stock ตรวจสอบครบ ${target.length}/${target.length} รายการ`:`ไม่ได้เปลี่ยน Stock`;
          if(progress)progress.textContent=`สำเร็จ • ราคา ${target.length} รายการ • ${msg}`;
          alert(`อัปเดตสำเร็จ\nราคาปลีก: ${target.length} รายการ\n${msg}`);
        }
      }catch(e){
        if(progress)progress.textContent='เกิดข้อผิดพลาด: '+e.message;
        alert(e.message);
      }finally{
        btn.disabled=false;
      }
    };

    document.title='Admin ร้านค้า V2.16';
    const h1=document.querySelector('.wrap>h1');
    if(h1)h1.textContent='จัดการร้าน V2.16';
  }

  wireReliableBulk();
  const app=document.querySelector('#app');
  if(app)new MutationObserver(()=>{if(!app.hidden)setTimeout(wireReliableBulk,0)}).observe(app,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('load',()=>{
    wireReliableBulk();
    setTimeout(wireReliableBulk,1200);
    setTimeout(wireReliableBulk,1800);
  });
})();
