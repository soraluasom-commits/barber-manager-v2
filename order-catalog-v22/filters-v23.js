(function(){
  const DEFAULT_GROUPS=[
    {id:'style',label:'สไตล์',options:['เน้นรุก','เน้นรับ','รุกและรับ']},
    {id:'strength',label:'ความฉุน',options:['ฉุนมาก','ฉุนน้อย']}
  ];
  let groups=DEFAULT_GROUPS,selected={},visible=24,baseActive=null;
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  function dedupe(list){
    const seen=new Set(),out=[];
    for(const p of list){
      const key=[norm(p.id),norm(p.name),norm(p.image)].join('|');
      if(seen.has(key)) continue;
      seen.add(key);out.push(p);
    }
    return out;
  }
  async function loadGroups(){
    try{const r=await fetch('https://order-catalog-api-v22.onrender.com/api/filter-config',{cache:'no-store'});if(r.ok){const j=await r.json();if(Array.isArray(j.groups)&&j.groups.length)groups=j.groups}}catch(e){console.warn('filter config',e)}
  }
  function matches(p){
    const tags=p.tags||{};
    return groups.every(g=>!selected[g.id]||selected[g.id]==='__all__'||(Array.isArray(tags[g.id])?tags[g.id].includes(selected[g.id]):tags[g.id]===selected[g.id]));
  }
  function filterList(){return dedupe((baseActive?baseActive():[]).filter(matches))}
  function chip(text,value,groupId){
    const b=document.createElement('button');b.type='button';b.className='v23-chip'+((selected[groupId]||'__all__')===value?' active':'');b.textContent=text;b.onclick=()=>{selected[groupId]=value;visible=24;drawFilters();renderV23()};return b;
  }
  function drawFilters(){
    const host=document.querySelector('#v23Filters');if(!host)return;host.innerHTML='';
    for(const g of groups){const block=document.createElement('div');block.className='v23-filter-group';const title=document.createElement('div');title.className='v23-filter-title';title.textContent=g.label;const row=document.createElement('div');row.className='v23-chip-row';row.appendChild(chip('ทั้งหมด','__all__',g.id));for(const o of (g.options||[]))row.appendChild(chip(o,o,g.id));block.append(title,row);host.appendChild(block)}
  }
  function esc2(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function money2(n){return '฿'+Number(n||0).toLocaleString('th-TH')}
  function renderV23(){
    const g=document.querySelector('#productGrid');if(!g)return;const all=filterList(),list=all.slice(0,visible);g.innerHTML='';
    for(const p of list){const sizes=p.sizes||[],min=Math.min(...sizes.map(s=>p.prices?.[s]?.retail||999999)),tracked=!!p.stockTracked,vals=sizes.map(s=>Math.max(0,Number(p.stock?.[s]||0))),sold=tracked&&vals.every(v=>v<=0),low=tracked&&!sold&&vals.some(v=>v<=Number(p.lowStockThreshold??5));const d=document.createElement('article');d.className='card'+(sold?' sold-out':'');const tagText=groups.map(gr=>{const v=p.tags?.[gr.id];const a=Array.isArray(v)?v:(v?[v]:[]);return a.map(x=>`<span class="v23-tag">${esc2(x)}</span>`).join('')}).join('');d.innerHTML=`<img loading="lazy" src="${esc2(p.image)}" alt="${esc2(p.name)}"><div class="card-body"><h3>${esc2(p.name)}</h3><div class="meta">${sizes.map(s=>`<span class="badge">${esc2(s)}</span>`).join('')}</div>${tagText?`<div class="v23-tags">${tagText}</div>`:''}<span class="stock-state ${sold?'stock-out':low?'stock-low':tracked?'stock-ok':'stock-untracked'}">${sold?'สินค้าหมด':low?'สินค้าใกล้หมด':tracked?'มีสินค้า':'พร้อมสั่ง'}</span>${sold?'<div class="soldout-message">สินค้าหมด</div>':''}<div class="from">ราคาเริ่มต้น</div><div class="price">${money2(min)}</div><button ${sold?'disabled':''}>${sold?'สินค้าหมด':'เลือกสินค้า'}</button></div>`;if(!sold)d.querySelector('button').onclick=()=>window.openProduct&&window.openProduct(p);g.appendChild(d)}
    const count=document.querySelector('#productCount');if(count)count.textContent=all.length.toLocaleString('th-TH');
    const info=document.querySelector('#v23Count');if(info)info.textContent=`แสดง ${Math.min(visible,all.length).toLocaleString('th-TH')} จาก ${all.length.toLocaleString('th-TH')} รายการ`;
    const more=document.querySelector('#v23More');if(more){more.hidden=visible>=all.length;more.onclick=()=>{visible+=24;renderV23()}}
  }
  function install(){
    if(typeof window.active!=='function'||typeof window.render!=='function')return setTimeout(install,50);
    baseActive=window.active;
    const toolbar=document.querySelector('.toolbar');if(toolbar&&!document.querySelector('#v23Filters')){const wrap=document.createElement('section');wrap.className='v23-filter-panel';wrap.innerHTML='<div id="v23Filters"></div><div class="v23-resultbar"><span id="v23Count"></span><button id="v23More" type="button">ดูเพิ่ม</button></div>';toolbar.insertAdjacentElement('afterend',wrap)}
    const origSearch=document.querySelector('#searchInput'),origSize=document.querySelector('#sizeFilter');if(origSearch)origSearch.addEventListener('input',()=>{visible=24;renderV23()});if(origSize)origSize.addEventListener('change',()=>{visible=24;renderV23()});
    window.render=renderV23;drawFilters();renderV23();
  }
  const style=document.createElement('style');style.textContent=`.v23-filter-panel{background:#fff;border:1px solid #eee;border-radius:18px;padding:14px;margin:12px 0 18px}.v23-filter-group+.v23-filter-group{margin-top:12px}.v23-filter-title{font-weight:800;margin-bottom:7px}.v23-chip-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}.v23-chip{white-space:nowrap;border:1px solid #ddd;background:#fff;border-radius:999px;padding:8px 12px;font-weight:700}.v23-chip.active{background:#111;color:#fff;border-color:#111}.v23-resultbar{display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:#666;font-size:14px}.v23-resultbar button{border:0;background:#111;color:#fff;border-radius:10px;padding:8px 14px}.v23-tags{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}.v23-tag{font-size:11px;background:#f3f4f6;border-radius:999px;padding:3px 7px}.customer-footer a[href="admin.html"]{display:none}`;document.head.appendChild(style);
  loadGroups().finally(install);
})();
