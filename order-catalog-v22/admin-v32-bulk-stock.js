/* V2.15 - bulk retail price + stock for all products */
(function(){
  const STYLE_ID='v215-bulk-stock-style';

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const st=document.createElement('style');
    st.id=STYLE_ID;
    st.textContent=`
      .bulkbox .v215-price-stock-grid{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:8px;margin-top:8px}
      .bulk-stock-warning{margin-top:8px;padding:9px 11px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px}
      .bulk-stock-progress{margin-top:8px;font-size:13px;font-weight:700;color:#475569}
      @media(max-width:800px){.bulkbox .v215-price-stock-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.bulkbox .v215-price-stock-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function optionalNonNegative(selector){
    const el=document.querySelector(selector);
    if(!el)return null;
    const raw=String(el.value??'').trim();
    if(raw==='')return null;
    const v=Number(raw);
    if(!Number.isFinite(v)||v<0)return NaN;
    return Math.floor(v);
  }

  async function runPool(items,limit,worker){
    let next=0,done=0;
    const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
      while(true){
        const i=next++;
        if(i>=items.length)return;
        await worker(items[i],i);
        done++;
        const p=document.querySelector('#bulkStockProgress');
        if(p)p.textContent=`กำลังอัปเดต Stock ${done}/${items.length} รายการ...`;
      }
    });
    await Promise.all(runners);
  }

  function applyBulkRetailStockUI(){
    ensureStyle();
    const box=document.querySelector('.bulkbox');
    if(!box)return;

    const title=box.querySelector('.sectiontitle');
    if(title)title.textContent='กำหนดราคาปลีกและ Stock สินค้าทั้งหมดในครั้งเดียว';

    // Wholesale inputs remain removed; wholesale pricing is managed by tier settings.
    ['#bulkW10','#bulkW30'].forEach(sel=>{
      const input=document.querySelector(sel);
      if(input){
        const label=input.closest('label');
        if(label)label.remove(); else input.remove();
      }
    });

    const grid=box.querySelector('.pricegrid');
    if(grid){
      grid.classList.add('v215-price-stock-grid');
      grid.style.gridTemplateColumns='';
      if(!document.querySelector('#bulkS10')){
        const label=document.createElement('label');
        label.className='field';
        label.innerHTML='<span>Stock 10ml</span><input id="bulkS10" type="number" min="0" placeholder="เว้นว่าง = ไม่เปลี่ยน">';
        grid.appendChild(label);
      }
      if(!document.querySelector('#bulkS30')){
        const label=document.createElement('label');
        label.className='field';
        label.innerHTML='<span>Stock 30ml</span><input id="bulkS30" type="number" min="0" placeholder="เว้นว่าง = ไม่เปลี่ยน">';
        grid.appendChild(label);
      }
    }

    let note=[...box.querySelectorAll('.muted')].find(el=>el.textContent.includes('ราคาปลีก')||el.textContent.includes('ตั้งราคาสินค้าจำนวนมาก'));
    if(note)note.textContent='กำหนดราคาปลีกและจำนวน Stock ของสินค้าหลายรายการพร้อมกัน โดยไม่กระทบราคาส่งแบบสเตป';

    if(!box.querySelector('.bulk-stock-warning')){
      const warn=document.createElement('div');
      warn.className='bulk-stock-warning';
      warn.textContent='Stock: เว้นว่าง = ไม่เปลี่ยนค่าเดิม • ใส่ 0 = สินค้าขนาดนั้นหมด และจะแสดง “สินค้าหมด” หน้าร้าน';
      box.appendChild(warn);
    }
    if(!document.querySelector('#bulkStockProgress')){
      const p=document.createElement('div');p.id='bulkStockProgress';p.className='bulk-stock-progress';box.appendChild(p);
    }

    const btn=document.querySelector('#bulkApply');
    if(btn){
      btn.textContent='กำหนดราคาปลีกและ Stock ให้สินค้าที่เลือก';
      btn.onclick=async()=>{
        const use10=!!document.querySelector('#bulkSize10')?.checked;
        const use30=!!document.querySelector('#bulkSize30')?.checked;
        if(!use10&&!use30)return alert('กรุณาเลือกอย่างน้อย 1 ขนาด');

        const r10=Number(document.querySelector('#bulkR10')?.value||0);
        const r30=Number(document.querySelector('#bulkR30')?.value||0);
        const s10=optionalNonNegative('#bulkS10');
        const s30=optionalNonNegative('#bulkS30');
        if(Number.isNaN(s10)||Number.isNaN(s30))return alert('Stock ต้องเป็นเลข 0 ขึ้นไป');

        const prices={};
        if(use10)prices['10ml']={retail:Math.max(0,r10)};
        if(use30)prices['30ml']={retail:Math.max(0,r30)};

        const activeOnly=!!document.querySelector('#bulkActiveOnly')?.checked;
        const target=(products||[]).filter(p=>!activeOnly||p.active!==false);
        const parts=[];
        if(use10)parts.push(`10ml ปลีก ${r10.toLocaleString('th-TH')} บาท${s10===null?' / Stock ไม่เปลี่ยน':` / Stock ${s10}`}`);
        if(use30)parts.push(`30ml ปลีก ${r30.toLocaleString('th-TH')} บาท${s30===null?' / Stock ไม่เปลี่ยน':` / Stock ${s30}`}`);
        const scope=activeOnly?'เฉพาะสินค้าที่เปิดแสดง':'สินค้าทั้งหมด';
        if(!confirm(`ยืนยันกำหนดราคาปลีกและ Stock กับ${scope} ${target.length} รายการ?\n\n${parts.join('\n')}\n\nราคาส่งแบบสเตปจะไม่ถูกเปลี่ยน`))return;

        const progress=document.querySelector('#bulkStockProgress');
        if(progress)progress.textContent='กำลังอัปเดตราคาปลีก...';
        btn.disabled=true;
        try{
          // Fast server-side bulk retail price update.
          await req('/api/admin/products/bulk-prices',{method:'PUT',body:JSON.stringify({prices,activeOnly})});

          // Stock values are optional; when supplied, update every matching product.
          const hasStock=(use10&&s10!==null)||(use30&&s30!==null);
          let stockUpdated=0;
          if(hasStock){
            const stockTargets=target.filter(p=>(use10&&p.sizes?.includes('10ml')&&s10!==null)||(use30&&p.sizes?.includes('30ml')&&s30!==null));
            await runPool(stockTargets,6,async p=>{
              const stock={...(p.stock||{})};
              if(use10&&s10!==null&&p.sizes?.includes('10ml'))stock['10ml']=s10;
              if(use30&&s30!==null&&p.sizes?.includes('30ml'))stock['30ml']=s30;
              await req('/api/admin/products/'+encodeURIComponent(p.id),{method:'PATCH',body:JSON.stringify({stock,stockTracked:true})});
            });
            stockUpdated=stockTargets.length;
          }

          products=await req('/api/admin/products');
          drawProducts();
          if(progress)progress.textContent=`สำเร็จ • ราคา ${target.length} รายการ${hasStock?` • Stock ${stockUpdated} รายการ`:''}`;
          alert(`อัปเดตสำเร็จ\nราคาปลีก: ${target.length} รายการ${hasStock?`\nStock: ${stockUpdated} รายการ`:''}`);
        }catch(e){
          if(progress)progress.textContent='เกิดข้อผิดพลาด: '+e.message;
          alert(e.message);
        }finally{btn.disabled=false}
      };
    }

    document.title='Admin ร้านค้า V2.15';
    const h1=document.querySelector('.wrap>h1');
    if(h1)h1.textContent='จัดการร้าน V2.15';
  }

  applyBulkRetailStockUI();
  const app=document.querySelector('#app');
  if(app)new MutationObserver(()=>{if(!app.hidden)applyBulkRetailStockUI()}).observe(app,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('load',()=>{applyBulkRetailStockUI();setTimeout(applyBulkRetailStockUI,400);setTimeout(applyBulkRetailStockUI,1000)});
})();
