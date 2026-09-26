/* V2.11 bulk ZIP product-image replacement + auto-create extra products */
(function(){
  let selectedZip=null;
  const style=document.createElement('style');
  style.textContent=`
  .bulkimg-card{border:1px solid #c7d2fe;background:linear-gradient(180deg,#eef2ff,#fff);border-radius:16px;padding:16px;margin-bottom:14px}
  .bulkimg-card h2{margin-top:0}.bulkimg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.bulkimg-row .field{flex:1;min-width:220px}
  .bulkimg-go{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:0;box-shadow:0 8px 18px rgba(37,99,235,.2)}
  .bulkimg-meta{margin-top:10px;padding:10px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;font-size:13px;color:#475569}
  .bulkimg-progress{height:12px;border-radius:999px;background:#e5e7eb;overflow:hidden;margin-top:10px}.bulkimg-progress>div{height:100%;width:0;background:linear-gradient(90deg,#7c3aed,#2563eb,#06b6d4);transition:width .2s ease}
  .bulkimg-log{margin-top:8px;font-size:12px;color:#475569;white-space:pre-wrap;max-height:130px;overflow:auto}.bulkimg-warn{color:#b45309;font-weight:700}
  `;
  document.head.appendChild(style);

  function loadJSZip(){
    if(window.JSZip)return Promise.resolve();
    return new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=ok;s.onerror=()=>no(new Error('โหลดระบบอ่าน ZIP ไม่สำเร็จ'));document.head.appendChild(s)});
  }
  function naturalName(a,b){return a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})}
  function idFor(n){return 'p'+String(n).padStart(3,'0')}
  function dataUrlToPayload(data){const [head,b64]=data.split(',');return{mime:(head.match(/data:(.*?);/)||[])[1]||'image/jpeg',data:b64}}
  function blobToImg(blob){return new Promise((ok,no)=>{const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=e=>{URL.revokeObjectURL(u);no(e)};im.src=u})}
  function detectBounds(ctx,w,h){
    try{const d=ctx.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;for(let y=0;y<h;y+=2){for(let x=0;x<w;x+=2){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];if(a<20)continue;if(r>246&&g>246&&b>246)continue;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}if(maxX<minX)return null;const bw=maxX-minX+1,bh=maxY-minY+1,px=Math.max(4,Math.round(bw*.06)),py=Math.max(4,Math.round(bh*.06));return{x:Math.max(0,minX-px),y:Math.max(0,minY-py),w:Math.min(w,maxX+px)-Math.max(0,minX-px)+1,h:Math.min(h,maxY+py)-Math.max(0,minY-py)+1}}catch{return null}
  }
  async function compressImported(blob){
    const img=await blobToImg(blob),scanMax=900,ratio=Math.min(1,scanMax/Math.max(img.width,img.height));
    const sw=Math.max(1,Math.round(img.width*ratio)),sh=Math.max(1,Math.round(img.height*ratio));
    const scan=document.createElement('canvas');scan.width=sw;scan.height=sh;const sx=scan.getContext('2d',{willReadFrequently:true});sx.fillStyle='#fff';sx.fillRect(0,0,sw,sh);sx.drawImage(img,0,0,sw,sh);
    const b=detectBounds(sx,sw,sh);let cx=0,cy=0,cw=img.width,ch=img.height;if(b){cx=b.x/ratio;cy=b.y/ratio;cw=b.w/ratio;ch=b.h/ratio}
    async function make(size,q){const c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,size,size);const pad=Math.round(size*.035),scale=Math.min((size-pad*2)/cw,(size-pad*2)/ch),dw=cw*scale,dh=ch*scale,dx=(size-dw)/2,dy=(size-dh)/2;x.drawImage(img,cx,cy,cw,ch,dx,dy,dw,dh);return c.toDataURL('image/jpeg',q)}
    let data=await make(900,.92);if(data.length>1_900_000)data=await make(820,.88);if(data.length>1_900_000)data=await make(720,.84);return dataUrlToPayload(data)
  }
  async function ensureProduct(n){
    const id=idFor(n);let p=products.find(x=>String(x.id)===id);if(p)return p;
    const sample=products.find(x=>x?.prices?.['10ml']||x?.prices?.['30ml'])||{};
    const r10=Number(document.querySelector('#bulkR10')?.value||sample.prices?.['10ml']?.retail||490),r30=Number(document.querySelector('#bulkR30')?.value||sample.prices?.['30ml']?.retail||850);
    const w10=Number(sample.prices?.['10ml']?.wholesale||450),w30=Number(sample.prices?.['30ml']?.wholesale||790);
    p=await req('/api/admin/products',{method:'POST',body:JSON.stringify({id,name:`สินค้า ${String(n).padStart(3,'0')}`,active:true,sizes:['10ml','30ml'],caps:['ฝาแดง','ฝาดำ'],prices:{'10ml':{retail:r10,wholesale:w10},'30ml':{retail:r30,wholesale:w30}},stockTracked:true,stock:{'10ml':0,'30ml':0},lowStockThreshold:5,tags:{}})});
    products.push(p);return p
  }
  function insertUI(){
    if(document.querySelector('#bulkImageCard'))return;
    const app=document.querySelector('#app');if(!app)return;
    const anchor=[...app.querySelectorAll('.card')].find(c=>c.querySelector('.toolbar'))||app.lastElementChild;
    const box=document.createElement('div');box.id='bulkImageCard';box.className='bulkimg-card';box.innerHTML=`<h2>แทนรูปสินค้าทั้งชุดจาก ZIP</h2><p class="muted">เลือกรูปที่เรียงลำดับ IMG_0001, IMG_0002… ระบบจะจับคู่เป็นสินค้า 001, 002… โดยอัตโนมัติ และถ้ามีรูปเกินจำนวนสินค้าเดิม ระบบจะสร้างสินค้าใหม่ต่อท้ายให้</p><div class="bulkimg-row"><label class="field"><span>ไฟล์ ZIP รูปสินค้า</span><input id="bulkImageZip" type="file" accept=".zip,application/zip"></label><button id="bulkImageAnalyze">ตรวจไฟล์</button><button id="bulkImageGo" class="bulkimg-go">แทนรูปเดิมทั้งหมดตามลำดับ</button></div><div id="bulkImageMeta" class="bulkimg-meta">ยังไม่ได้เลือกไฟล์</div><div class="bulkimg-progress"><div id="bulkImageBar"></div></div><div id="bulkImageLog" class="bulkimg-log"></div>`;
    app.insertBefore(box,anchor);
    box.querySelector('#bulkImageZip').onchange=e=>{selectedZip=e.target.files?.[0]||null;box.querySelector('#bulkImageMeta').textContent=selectedZip?`${selectedZip.name} • ${(selectedZip.size/1024/1024).toFixed(1)} MB`:'ยังไม่ได้เลือกไฟล์'};
    box.querySelector('#bulkImageAnalyze').onclick=analyze;
    box.querySelector('#bulkImageGo').onclick=runImport;
  }
  async function zipImages(){
    if(!selectedZip)throw new Error('กรุณาเลือกไฟล์ ZIP ก่อน');await loadJSZip();const zip=await JSZip.loadAsync(selectedZip);return Object.values(zip.files).filter(f=>!f.dir&&/\.(jpe?g|png|webp)$/i.test(f.name)).sort((a,b)=>naturalName(a.name,b.name))
  }
  async function analyze(){try{const imgs=await zipImages();const extra=Math.max(0,imgs.length-products.filter(p=>/^p\d+$/i.test(String(p.id))).length);document.querySelector('#bulkImageMeta').innerHTML=`พบรูป <b>${imgs.length}</b> รูป • สินค้าปัจจุบัน ${products.length} รายการ${extra?` • <span class="bulkimg-warn">จะสร้างสินค้าใหม่ต่อท้ายประมาณ ${extra} รายการ</span>`:''}`;}catch(e){alert(e.message)}}
  async function runImport(){
    if(document.querySelector('#app')?.hidden)return alert('กรุณาเชื่อมต่อ Admin ก่อน');
    let imgs;try{imgs=await zipImages()}catch(e){return alert(e.message)}
    if(!imgs.length)return alert('ไม่พบรูปภาพใน ZIP');
    if(!confirm(`ยืนยันแทนรูปสินค้าเดิมตามลำดับด้วยรูป ${imgs.length} รูป?\nรูปเดิมของสินค้า 001 เป็นต้นไปจะถูกแทนที่ และถ้ามีรูปเกินจะสร้างสินค้าใหม่ต่อท้าย`))return;
    const go=document.querySelector('#bulkImageGo'),bar=document.querySelector('#bulkImageBar'),log=document.querySelector('#bulkImageLog');go.disabled=true;let ok=0,fail=0,created=0;log.textContent='เริ่มนำเข้ารูป...';
    const tasks=imgs.map((f,idx)=>({f,n:idx+1}));let cursor=0;
    async function worker(){while(true){const pos=cursor++;if(pos>=tasks.length)return;const {f,n}=tasks[pos];try{const id=idFor(n),was=products.some(p=>String(p.id)===id);const p=await ensureProduct(n);if(!was)created++;const blob=await f.async('blob'),payload=await compressImported(blob);const saved=await req('/api/admin/products/'+encodeURIComponent(p.id)+'/image',{method:'POST',body:JSON.stringify(payload)});Object.assign(p,saved);ok++;}catch(e){fail++;log.textContent+=`\n${idFor(n)} ไม่สำเร็จ: ${e.message}`;}const done=ok+fail;bar.style.width=`${Math.round(done/tasks.length*100)}%`;document.querySelector('#bulkImageMeta').innerHTML=`กำลังทำ ${done}/${tasks.length} • สำเร็จ ${ok} • ผิดพลาด ${fail} • สร้างสินค้าใหม่ ${created}`;}}
    try{await Promise.all(Array.from({length:4},worker));products=await req('/api/admin/products');drawProducts();document.querySelector('#bulkImageMeta').innerHTML=`เสร็จแล้ว • แทนรูปสำเร็จ <b>${ok}</b> • ผิดพลาด <b>${fail}</b> • สร้างสินค้าใหม่ <b>${created}</b>`;log.textContent+=(fail?'\nตรวจรายการที่ผิดพลาดด้านบน':'\nนำเข้ารูปครบเรียบร้อย');}finally{go.disabled=false}
  }
  document.title='Admin ร้านค้า V2.11';const h1=document.querySelector('.wrap>h1');if(h1)h1.textContent='จัดการร้าน V2.11';insertUI();const app=document.querySelector('#app');if(app)new MutationObserver(()=>{insertUI()}).observe(app,{attributes:true,attributeFilter:['hidden']});window.addEventListener('load',()=>{insertUI();setTimeout(insertUI,500)});
})();
