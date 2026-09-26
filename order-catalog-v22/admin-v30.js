/* V2.10 bulk retail-only pricing */
(function(){
  function applyRetailOnlyUI(){
    const box=document.querySelector('.bulkbox');
    if(!box)return;
    const title=box.querySelector('.sectiontitle');
    if(title)title.textContent='ตั้งราคาปลีกเหมือนกันหลายสินค้าในครั้งเดียว';

    ['#bulkW10','#bulkW30'].forEach(sel=>{
      const input=document.querySelector(sel);
      if(input){
        const label=input.closest('label');
        if(label)label.remove();
        else input.remove();
      }
    });

    const grid=box.querySelector('.pricegrid');
    if(grid)grid.style.gridTemplateColumns='repeat(2,minmax(140px,1fr))';

    const note=[...box.querySelectorAll('.muted')].find(el=>el.textContent.includes('ใช้สำหรับตั้งราคาสินค้าจำนวนมาก'));
    if(note)note.textContent='ใช้สำหรับตั้งราคาปลีกของสินค้าจำนวนมากพร้อมกัน โดยไม่กระทบราคาส่งแบบสเตป';

    const btn=document.querySelector('#bulkApply');
    if(btn){
      btn.textContent='ใช้ราคาปลีกนี้กับสินค้าที่เลือก';
      btn.onclick=async()=>{
        const prices={};
        if(document.querySelector('#bulkSize10')?.checked)prices['10ml']={retail:num('#bulkR10')};
        if(document.querySelector('#bulkSize30')?.checked)prices['30ml']={retail:num('#bulkR30')};
        if(!Object.keys(prices).length)return alert('กรุณาเลือกอย่างน้อย 1 ขนาด');
        const activeOnly=document.querySelector('#bulkActiveOnly')?.checked;
        const scope=activeOnly?'เฉพาะสินค้าที่เปิดแสดง':'สินค้าทั้งหมด';
        if(!confirm(`ยืนยันตั้งราคาปลีกใหม่กับ${scope}?\nราคาส่งแบบสเตปจะไม่ถูกเปลี่ยน`))return;
        try{
          const r=await req('/api/admin/products/bulk-prices',{method:'PUT',body:JSON.stringify({prices,activeOnly})});
          products=await req('/api/admin/products');
          drawProducts();
          alert(`อัปเดตราคาปลีกแล้ว ${r.updated} รายการ`);
        }catch(e){alert(e.message)}
      };
    }
  }

  document.title='Admin ร้านค้า V2.10';
  const h1=document.querySelector('.wrap>h1');
  if(h1)h1.textContent='จัดการร้าน V2.10';

  applyRetailOnlyUI();
  const app=document.querySelector('#app');
  if(app)new MutationObserver(()=>{if(!app.hidden)applyRetailOnlyUI()}).observe(app,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('load',()=>{applyRetailOnlyUI();setTimeout(applyRetailOnlyUI,600);setTimeout(applyRetailOnlyUI,1400)});
})();
