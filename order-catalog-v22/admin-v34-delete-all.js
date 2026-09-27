/* V2.17 - safe bulk product removal */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const style=document.createElement('style');
  style.textContent=`.danger-zone{border:1px solid #fecaca;background:#fff7f7;border-radius:16px;padding:16px;margin-bottom:14px}.danger-zone h2{margin:0 0 8px;color:#b42318}.danger-zone p{margin:0 0 12px;color:#7f1d1d;font-size:13px}.delete-all-btn{background:#b42318;color:#fff;border-color:#b42318}.delete-all-status{margin-top:9px;font-size:13px;color:#475569}`;
  document.head.appendChild(style);

  function render(){
    if(document.querySelector('#deleteAllProductsCard'))return;
    const app=document.querySelector('#app');if(!app)return;
    const anchor=[...app.querySelectorAll('.card')].find(c=>c.querySelector('.toolbar'))||app.lastElementChild;
    const box=document.createElement('div');box.id='deleteAllProductsCard';box.className='danger-zone';
    box.innerHTML=`<h2>ลบสินค้าทั้งหมดออกจากระบบ</h2><p>ลบรายการสินค้าและรูปสินค้าที่อัปโหลดทั้งหมดในครั้งเดียว โดยไม่ลบการตั้งค่าร้าน ตัวกรอง หรือประวัติออเดอร์</p><button id="deleteAllProductsBtn" class="delete-all-btn">ลบสินค้าทั้งหมด</button> <span id="deleteAllProductsCount" class="muted"></span><div id="deleteAllProductsStatus" class="delete-all-status"></div>`;
    app.insertBefore(box,anchor);
    box.querySelector('#deleteAllProductsBtn').onclick=run;
    count();
  }
  function count(){const e=document.querySelector('#deleteAllProductsCount');if(e)e.textContent=`ปัจจุบัน ${Array.isArray(products)?products.length:0} รายการ`;}
  async function removeOne(p){let last;for(let i=0;i<3;i++){try{return await req('/api/admin/products/'+encodeURIComponent(p.id),{method:'DELETE'});}catch(e){last=e;await sleep(250*(i+1));}}throw last;}
  async function run(){
    const list=[...(products||[])];if(!list.length)return alert('ขณะนี้ไม่มีสินค้าให้ลบ');
    if(!confirm(`ยืนยันลบสินค้าทั้งหมด ${list.length} รายการ?\nรูปสินค้าที่อัปโหลดไว้จะถูกลบด้วย`))return;
    const typed=prompt('กรุณาพิมพ์ “ลบทั้งหมด” เพื่อยืนยัน');if(typed!=='ลบทั้งหมด')return;
    const btn=document.querySelector('#deleteAllProductsBtn'),st=document.querySelector('#deleteAllProductsStatus');btn.disabled=true;let cursor=0,done=0,fail=[];
    async function worker(){while(true){const i=cursor++;if(i>=list.length)return;const p=list[i];try{await removeOne(p)}catch(e){fail.push({p,e})}done++;st.textContent=`กำลังลบ ${done}/${list.length} รายการ...`;}}
    try{await Promise.all(Array.from({length:2},worker));products=await req('/api/admin/products');drawProducts();count();if(products.length||fail.length){st.textContent=`ลบแล้ว ${list.length-products.length}/${list.length} รายการ • ยังเหลือ ${products.length}`;alert(`ลบเสร็จบางส่วน\nยังเหลือ ${products.length} รายการ กรุณากดลบทั้งหมดอีกครั้ง`);}else{st.textContent=`สำเร็จ • ลบครบ ${list.length}/${list.length} รายการ`;alert(`ลบสินค้าทั้งหมด ${list.length} รายการเรียบร้อยแล้ว`);}}finally{btn.disabled=false;}
  }
  function wire(){render();count();document.title='Admin ร้านค้า V2.17';const h1=document.querySelector('.wrap>h1');if(h1)h1.textContent='จัดการร้าน V2.17';}
  wire();const app=document.querySelector('#app');if(app)new MutationObserver(()=>{if(!app.hidden)setTimeout(wire,0)}).observe(app,{attributes:true,attributeFilter:['hidden']});window.addEventListener('load',()=>{wire();setTimeout(wire,700)});
})();
