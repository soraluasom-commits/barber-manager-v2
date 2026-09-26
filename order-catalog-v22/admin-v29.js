/* V2.9 wholesale step editor */
(function(){
  const DEFAULT_TIERS=[
    {minQty:10,price10:0,price30:0,freeQty:0},
    {minQty:15,price10:0,price30:0,freeQty:0},
    {minQty:45,price10:0,price30:0,freeQty:0}
  ];
  let tierDraft=[];

  const css=`
    .tier-editor{margin-top:10px;border:1px solid #dbeafe;background:linear-gradient(180deg,#eff6ff,#fff);border-radius:16px;padding:14px}
    .tier-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
    .tier-head h3{margin:0;font-size:17px}.tier-hint{font-size:12px;color:#64748b;line-height:1.5}
    .tier-list{display:grid;gap:9px}.tier-row{display:grid;grid-template-columns:110px 1fr 1fr 110px auto;gap:8px;align-items:end;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:10px}
    .tier-row .field{min-width:0}.tier-row input{width:100%;box-sizing:border-box}.tier-del{background:#fff1f2;color:#be123c;border:1px solid #fecdd3;min-height:42px}
    .tier-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.tier-add{background:#eef2ff;color:#4338ca;border-color:#c7d2fe}.tier-save{background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border:0;box-shadow:0 8px 18px rgba(37,99,235,.18)}
    .tier-example{display:inline-flex;gap:5px;align-items:center;background:#f8fafc;border-radius:999px;padding:5px 9px;margin:3px 4px 3px 0;font-size:12px;color:#334155}
    @media(max-width:760px){.tier-row{grid-template-columns:1fr 1fr}.tier-row .tier-del{grid-column:1/-1}.tier-row .field:first-child{grid-column:1/-1}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function normalize(raw){
    const src=Array.isArray(raw)&&raw.length?raw:DEFAULT_TIERS;
    const out=src.map(t=>({
      minQty:Math.max(1,Math.floor(Number(t.minQty??t.qty??1)||1)),
      price10:Math.max(0,Number(t.price10??t.price?.['10ml']??0)||0),
      price30:Math.max(0,Number(t.price30??t.price?.['30ml']??0)||0),
      freeQty:Math.max(0,Math.floor(Number(t.freeQty??t.free??0)||0))
    })).sort((a,b)=>a.minQty-b.minQty);
    const seen=new Set();return out.filter(t=>!seen.has(t.minQty)&&(seen.add(t.minQty),true));
  }

  function ensureUI(){
    const oldInput=document.querySelector('#wholesaleMinTotal');
    if(!oldInput)return;
    const card=oldInput.closest('.card');if(!card)return;
    card.querySelector('h2').textContent='ตั้งค่าราคาส่งแบบสเตป';
    const oldRow=oldInput.closest('.row');if(oldRow)oldRow.style.display='none';
    const oldP=oldRow?.nextElementSibling;if(oldP&&oldP.classList.contains('muted'))oldP.style.display='none';
    let box=card.querySelector('#tierEditor');
    if(!box){
      box=document.createElement('div');box.id='tierEditor';box.className='tier-editor';
      const bulk=card.querySelector('.bulkbox');card.insertBefore(box,bulk||null);
    }
    renderEditor();
  }

  function rowsFromDOM(){
    return [...document.querySelectorAll('#tierList .tier-row')].map(r=>({
      minQty:Math.max(1,Math.floor(Number(r.querySelector('.tqty').value)||1)),
      price10:Math.max(0,Number(r.querySelector('.tp10').value)||0),
      price30:Math.max(0,Number(r.querySelector('.tp30').value)||0),
      freeQty:Math.max(0,Math.floor(Number(r.querySelector('.tfree').value)||0))
    }));
  }

  function renderEditor(){
    const box=document.querySelector('#tierEditor');if(!box)return;
    if(!tierDraft.length){
      try{tierDraft=normalize(shop?.wholesaleTiers)}catch{tierDraft=normalize(null)}
    }
    box.innerHTML=`<div class="tier-head"><div><h3>ขั้นราคาส่ง</h3><div class="tier-hint">กำหนดจำนวนขั้นต่ำ ราคา/ขวด และจำนวนแถมได้เอง • ราคา 0 = ใช้ราคาส่งเดิมของสินค้านั้น</div></div></div><div id="tierList" class="tier-list"></div><div class="tier-actions"><button id="tierAdd" class="tier-add">+ เพิ่มสเตป</button><button id="tierSave" class="tier-save">บันทึกสเตปราคาส่ง</button></div>`;
    const list=box.querySelector('#tierList');
    tierDraft.forEach((t,i)=>{
      const row=document.createElement('div');row.className='tier-row';
      row.innerHTML=`<label class="field"><span>จำนวนขั้นต่ำ (ขวด)</span><input class="tqty" type="number" min="1" value="${t.minQty}"></label><label class="field"><span>ราคา 10ml / ขวด</span><input class="tp10" type="number" min="0" value="${t.price10}"></label><label class="field"><span>ราคา 30ml / ขวด</span><input class="tp30" type="number" min="0" value="${t.price30}"></label><label class="field"><span>แถม (ขวด)</span><input class="tfree" type="number" min="0" value="${t.freeQty}"></label><button class="tier-del" type="button">ลบ</button>`;
      row.querySelector('.tier-del').onclick=()=>{tierDraft=rowsFromDOM();tierDraft.splice(i,1);renderEditor()};
      list.appendChild(row);
    });
    box.querySelector('#tierAdd').onclick=()=>{tierDraft=rowsFromDOM();const last=tierDraft[tierDraft.length-1]?.minQty||0;tierDraft.push({minQty:last?last+5:10,price10:0,price30:0,freeQty:0});renderEditor()};
    box.querySelector('#tierSave').onclick=saveTiers;
  }

  async function saveTiers(){
    let tiers=normalize(rowsFromDOM());
    if(!tiers.length)return alert('กรุณามีอย่างน้อย 1 สเตปราคาส่ง');
    const dup=rowsFromDOM().map(x=>x.minQty);if(new Set(dup).size!==dup.length)return alert('จำนวนขั้นต่ำของแต่ละสเตปต้องไม่ซ้ำกัน');
    try{
      const min=Math.min(...tiers.map(t=>t.minQty));
      shop=await req('/api/admin/shop',{method:'PUT',body:JSON.stringify({wholesaleTiers:tiers,wholesaleMinTotal:min})});
      tierDraft=normalize(shop.wholesaleTiers);renderEditor();
      alert('บันทึกสเตปราคาส่งแล้ว');
    }catch(e){alert(e.message)}
  }

  function syncAfterLogin(){
    try{if(shop&&Object.keys(shop).length)tierDraft=normalize(shop.wholesaleTiers)}catch{}
    ensureUI();
  }

  document.title='Admin ร้านค้า V2.9';
  const h1=document.querySelector('.wrap>h1');if(h1)h1.textContent='จัดการร้าน V2.9';
  ensureUI();
  const app=document.querySelector('#app');if(app)new MutationObserver(()=>{if(!app.hidden)syncAfterLogin()}).observe(app,{attributes:true,attributeFilter:['hidden']});
  const loginBtn=document.querySelector('#login');if(loginBtn)loginBtn.addEventListener('click',()=>setTimeout(syncAfterLogin,500));
  setTimeout(syncAfterLogin,800);
})();
