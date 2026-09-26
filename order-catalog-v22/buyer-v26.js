const API='https://order-catalog-api-v22.onrender.com';
const $=s=>document.querySelector(s);
const money=n=>'฿'+Number(n||0).toLocaleString('th-TH');
const PER_PAGE=20;
const K={cart:'buyer_cart_v26',sel:'buyer_sel_v26'};
let products=[],shop={wholesaleMinTotal:20},filterConfig={groups:[]},cart=[],selections={},page=1,lastOrderBlob=null;

function load(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}}
function store(k,v){localStorage.setItem(k,JSON.stringify(v))}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function show(id){$('#'+id).classList.remove('hidden')}
function hide(id){$('#'+id).classList.add('hidden')}
function clampQty(v,min=0){return Math.max(min,Math.min(20,Math.floor(Number(v)||0)))}
function totalQty(){return cart.reduce((a,b)=>a+Number(b.qty||0),0)}
function threshold(){return Math.max(1,Math.floor(Number(shop.wholesaleMinTotal)||20))}
function wholesale(){return totalQty()>=threshold()}
function priceObject(p,size){return p?.prices?.[size]||{retail:0,wholesale:0}}
function unitPrice(p,size){const pr=priceObject(p,size);return Number(wholesale()?pr.wholesale:pr.retail)||0}
function stockFor(p,size){return p?.stockTracked?Math.max(0,Number(p.stock?.[size]||0)):Infinity}
function stockState(p,size){const n=stockFor(p,size),low=Number(p.lowStockThreshold||5);if(!p.stockTracked)return{text:'พร้อมสั่ง',cls:'stock-ok',out:false};if(n<=0)return{text:'สินค้าหมด',cls:'stock-out',out:true};if(n<=low)return{text:'สินค้าใกล้หมด',cls:'stock-low',out:false};return{text:`คงเหลือ ${n}`,cls:'stock-ok',out:false}}
function normalizeProduct(p){return{...p,id:String(p.id||''),name:String(p.name||p.id||'สินค้า'),sizes:Array.isArray(p.sizes)&&p.sizes.length?p.sizes:['10ml','30ml'],caps:Array.isArray(p.caps)?p.caps:[],prices:p.prices||{},tags:p.tags&&typeof p.tags==='object'?p.tags:{},active:p.active!==false,stockTracked:!!p.stockTracked,stock:{'10ml':Number(p.stock?.['10ml']||0),'30ml':Number(p.stock?.['30ml']||0)},lowStockThreshold:Number(p.lowStockThreshold??5)}}
function selectionFor(p){const s=selections[p.id]||(selections[p.id]={});if(!s.size||!p.sizes.includes(s.size))s.size=p.sizes[0]||'10ml';if(p.caps.length&&!p.caps.includes(s.cap))s.cap=p.caps[0];if(!p.caps.length)s.cap='';s.qty=clampQty(s.qty,0);return s}
function itemKey(p,size,cap){return`${p.id}|${size}|${cap||''}`}
function saveCart(){store(K.cart,cart)}
function saveSelections(){store(K.sel,selections)}

async function getJson(path){const r=await fetch(API+path,{cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j}

async function init(){
  cart=load(K.cart,[]);selections=load(K.sel,{});
  try{
    const [ps,s,cfg]=await Promise.all([getJson('/api/products'),getJson('/api/shop'),getJson('/api/filter-config')]);
    products=(Array.isArray(ps)?ps:[]).map(normalizeProduct);shop={...shop,...s};filterConfig=cfg||{groups:[]};
  }catch(e){
    console.error(e);alert('โหลดข้อมูลร้านไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');return;
  }
  cart=cart.filter(i=>products.some(p=>p.id===i.productId));saveCart();
  applyShop();buildDynamicFilters();bind();render();renderCart();
}

function applyShop(){$('#brandName').textContent=shop.brand||'ORDER CATALOG';$('#brandSub').textContent=shop.sub||'เลือกสินค้า • ขนาด • จำนวน';$('#shopContact').textContent=shop.contact||''}
function buildDynamicFilters(){const box=$('#dynamicFilters');box.innerHTML='';for(const g of filterConfig.groups||[]){const label=document.createElement('label');label.className='filter-field';const sel=document.createElement('select');sel.dataset.group=g.id;sel.innerHTML=`<option value="">ทั้งหมด • ${esc(g.label)}</option>`+(g.options||[]).map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');sel.onchange=()=>{page=1;render()};label.appendChild(sel);box.appendChild(label)}}
function tagMatches(p,groupId,value){if(!value)return true;const raw=p.tags?.[groupId];return Array.isArray(raw)?raw.includes(value):String(raw||'')===value}
function activeProducts(){const q=$('#searchInput').value.trim().toLowerCase(),sf=$('#sizeFilter').value,filters=[...document.querySelectorAll('#dynamicFilters select')].map(s=>[s.dataset.group,s.value]);return products.filter(p=>p.active!==false&&(!q||p.name.toLowerCase().includes(q)||p.id.toLowerCase().includes(q))&&(!sf||p.sizes.includes(sf))&&filters.every(([g,v])=>tagMatches(p,g,v)))}

function render(){
  const list=activeProducts(),totalPages=Math.max(1,Math.ceil(list.length/PER_PAGE));if(page>totalPages)page=totalPages;const start=(page-1)*PER_PAGE,items=list.slice(start,start+PER_PAGE),grid=$('#productGrid');grid.innerHTML='';
  for(const p of items){
    const s=selectionFor(p),st=stockState(p,s.size),pr=priceObject(p,s.size),currentUnit=unitPrice(p,s.size),existing=cart.filter(i=>i.productId===p.id).reduce((a,b)=>a+b.qty,0),d=document.createElement('article');d.className='buyer-card'+(st.out?' sold-out':'');
    d.innerHTML=`<img class="product-photo" loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}"><div class="buyer-card-body"><div class="product-id">${esc(p.id)}</div><h3>${esc(p.name)}</h3><span class="stock-state ${st.cls}">${esc(st.text)}</span><div class="card-fields"><label><span>ขนาด</span><select class="card-size">${p.sizes.map(x=>`<option value="${esc(x)}" ${x===s.size?'selected':''}>${esc(x)}</option>`).join('')}</select>${p.caps.length?`<label><span>ฝา</span><select class="card-cap">${p.caps.map(x=>`<option value="${esc(x)}" ${x===s.cap?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`:''}<label><span>จำนวน</span><input class="card-qty" type="number" min="0" max="20" list="qtyOptions" value="${s.qty}" inputmode="numeric"></label></div><div class="price-stack"><div><small>ปลีก</small><b>${money(pr.retail)}</b></div><div><small>ส่ง</small><b>${money(pr.wholesale)}</b></div></div><div class="active-price">${wholesale()?'ราคาส่ง':'ราคาปลีก'}ปัจจุบัน <b>${money(currentUnit)}</b>/ชิ้น</div>${existing?`<div class="in-cart">ในตะกร้า ${existing} ชิ้น</div>`:''}<button class="add-cart primary" ${st.out?'disabled':''}>${st.out?'สินค้าหมด':'เพิ่มลงตะกร้า'}</button></div>`;
    const size=d.querySelector('.card-size'),cap=d.querySelector('.card-cap'),qty=d.querySelector('.card-qty');
    size.onchange=()=>{s.size=size.value;s.qty=0;saveSelections();render()};if(cap)cap.onchange=()=>{s.cap=cap.value;saveSelections()};
    const syncQty=()=>{s.qty=clampQty(qty.value,0);qty.value=s.qty;saveSelections()};qty.onchange=syncQty;qty.onblur=syncQty;d.querySelector('.add-cart').onclick=()=>addToCart(p.id);
    grid.appendChild(d);
  }
  $('#productCount').textContent=list.length.toLocaleString('th-TH');const end=Math.min(start+items.length,list.length);$('#resultsText').textContent=list.length?`แสดง ${start+1}–${end} จาก ${list.length} รายการ`:'ไม่พบสินค้า';renderPagination(totalPages);updateTotalsUI();
}
function renderPagination(totalPages){const box=$('#pagination');if(totalPages<=1){box.innerHTML='';return}let a=Math.max(1,page-2),b=Math.min(totalPages,page+2);if(a===1)b=Math.min(totalPages,5);if(b===totalPages)a=Math.max(1,totalPages-4);let nums=[];for(let i=a;i<=b;i++)nums.push(i);box.innerHTML=`<button class="page-btn" data-p="${page-1}" ${page===1?'disabled':''}>‹</button>${a>1?`<button class="page-btn" data-p="1">1</button>${a>2?'<span class="page-gap">…</span>':''}`:''}${nums.map(n=>`<button class="page-btn ${n===page?'active':''}" data-p="${n}">${n}</button>`).join('')}${b<totalPages?`${b<totalPages-1?'<span class="page-gap">…</span>':''}<button class="page-btn" data-p="${totalPages}">${totalPages}</button>`:''}<button class="page-btn" data-p="${page+1}" ${page===totalPages?'disabled':''}>›</button>`;box.querySelectorAll('[data-p]').forEach(x=>x.onclick=()=>{page=Number(x.dataset.p);render();window.scrollTo({top:0,behavior:'smooth'})})}

function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;const s=selectionFor(p),qty=clampQty(s.qty,0);if(qty<1)return alert('กรุณาเลือกจำนวน 1–20');const available=stockFor(p,s.size),other=cart.filter(i=>i.productId===p.id&&i.size===s.size).reduce((a,b)=>a+b.qty,0);if(Number.isFinite(available)&&qty+other>available)return alert(`${p.name} ${s.size} คงเหลือ ${available} ชิ้น`);const key=itemKey(p,s.size,s.cap),found=cart.find(i=>i.key===key);if(found)found.qty=clampQty(found.qty+qty,1);else cart.push({key,productId:p.id,name:p.name,image:p.image,size:s.size,cap:s.cap,qty});s.qty=0;saveSelections();saveCart();renderCart();render()}
function lineTotal(i){const p=products.find(x=>x.id===i.productId);return unitPrice(p,i.size)*i.qty}
function renderCart(){const box=$('#cartItems');box.innerHTML='';if(!cart.length)box.innerHTML='<p class="muted-line">ยังไม่มีสินค้าในตะกร้า</p>';for(const i of cart){const p=products.find(x=>x.id===i.productId);if(!p)continue;const unit=unitPrice(p,i.size),available=stockFor(p,i.size),row=document.createElement('div');row.className='cart-item buyer-cart-item';row.innerHTML=`<img src="${esc(i.image)}" alt="${esc(i.name)}"><div><h4>${esc(i.name)}</h4><p>ขนาด ${esc(i.size)}</p><p>${wholesale()?'ราคาส่ง':'ราคาปลีก'} ${money(unit)} / ชิ้น</p><div class="qty-row"><label>จำนวน</label><input type="number" min="1" max="20" list="qtyOptions" value="${i.qty}"></div><p class="cart-line-total"><b>${money(unit*i.qty)}</b></p></div><button class="remove">×</button>`;row.querySelector('.remove').onclick=()=>{cart=cart.filter(x=>x.key!==i.key);saveCart();renderCart();render()};row.querySelector('input').onchange=e=>{let q=clampQty(e.target.value,1);if(Number.isFinite(available)&&q>available){q=available;alert(`${i.name} ${i.size} คงเหลือ ${available} ชิ้น`)}i.qty=Math.max(1,q);saveCart();renderCart();render()};box.appendChild(row)}updateTotalsUI()}
function updateTotalsUI(){const count=totalQty(),sum=cart.reduce((a,b)=>a+lineTotal(b),0),min=threshold(),banner=$('#wholesaleNotice');$('#cartCount').textContent=count;$('#cartTotalMini').textContent=money(sum);$('#cartBottleCount').textContent=`${count} ขวด`;$('#cartPriceType').textContent=wholesale()?'ราคาส่ง':'ราคาปลีก';$('#grandTotal').textContent=money(sum);if(count>=min){banner.textContent=`ยอดรวม ${count} ขวด • ใช้ราคาส่งแล้ว`;banner.classList.add('wholesale-on')}else{banner.textContent=`ยอดรวม ${count} ขวด • อีก ${min-count} ขวด จะได้ราคาส่ง`;banner.classList.remove('wholesale-on')}}

function loadImg(src){return new Promise((ok,no)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>ok(im);im.onerror=no;im.src=src})}
function fitText(ctx,text,maxWidth,maxSize=34,minSize=20){let size=maxSize;while(size>minSize){ctx.font=`700 ${size}px sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;size-=2}return size}
async function buildSummary(){if(!cart.length)return alert('ยังไม่มีสินค้าในตะกร้า');const canvas=$('#summaryCanvas'),ctx=canvas.getContext('2d'),W=1200,rowH=176,H=260+cart.length*rowH+190;canvas.width=W;canvas.height=H;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#111';ctx.fillRect(0,0,W,16);ctx.font='800 52px sans-serif';ctx.fillText(shop.brand||'ORDER CATALOG',60,82);ctx.font='28px sans-serif';ctx.fillStyle='#64748b';ctx.fillText('สรุปรายการสั่งซื้อ',60,128);ctx.font='22px sans-serif';ctx.fillText(new Date().toLocaleString('th-TH'),60,166);ctx.textAlign='right';ctx.fillStyle=wholesale()?'#166534':'#334155';ctx.font='700 24px sans-serif';ctx.fillText(wholesale()?'ราคาส่ง':'ราคาปลีก',W-60,98);ctx.textAlign='left';let y=235,grand=0;for(const i of cart){const p=products.find(x=>x.id===i.productId),unit=unitPrice(p,i.size),total=unit*i.qty;grand+=total;ctx.fillStyle='#f8fafc';ctx.fillRect(45,y-10,W-90,rowH-18);try{const img=await loadImg(i.image);const s=128;ctx.fillStyle='#fff';ctx.fillRect(62,y+8,s,s);ctx.drawImage(img,62,y+8,s,s)}catch{}ctx.fillStyle='#111';let fs=fitText(ctx,i.name,520,34,22);ctx.font=`700 ${fs}px sans-serif`;ctx.fillText(i.name,220,y+42);ctx.fillStyle='#64748b';ctx.font='24px sans-serif';ctx.fillText(`ขนาด ${i.size}`,220,y+80);ctx.fillText(`จำนวน ${i.qty} ชิ้น`,220,y+116);ctx.fillStyle='#475569';ctx.font='22px sans-serif';ctx.fillText(`${money(unit)} / ชิ้น`,780,y+78);ctx.fillStyle='#111';ctx.font='800 34px sans-serif';ctx.textAlign='right';ctx.fillText(money(total),W-72,y+116);ctx.textAlign='left';y+=rowH}ctx.strokeStyle='#e2e8f0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(60,H-148);ctx.lineTo(W-60,H-148);ctx.stroke();ctx.fillStyle='#475569';ctx.font='700 28px sans-serif';ctx.fillText(`จำนวนรวม ${totalQty()} ชิ้น`,60,H-88);ctx.fillStyle='#111';ctx.font='900 48px sans-serif';ctx.textAlign='right';ctx.fillText(`ยอดรวม ${money(grand)}`,W-60,H-80);ctx.textAlign='left';lastOrderBlob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.96));show('summaryModal');downloadJpg()}
function downloadJpg(){if(!lastOrderBlob)return;const url=URL.createObjectURL(lastOrderBlob),a=document.createElement('a');a.href=url;a.download=`order-summary-${new Date().toISOString().slice(0,10)}-${Date.now()}.jpg`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

function bind(){$('#searchInput').oninput=()=>{page=1;render()};$('#sizeFilter').onchange=()=>{page=1;render()};$('#cartBtn').onclick=()=>{renderCart();show('cartModal')};$('#clearCart').onclick=()=>{if(!cart.length)return;if(confirm('ล้างรายการทั้งหมด?')){cart=[];saveCart();renderCart();render()}};$('#checkoutBtn').onclick=buildSummary;$('#downloadJpg').onclick=downloadJpg;$('#newOrderBtn').onclick=()=>hide('summaryModal');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>hide(b.dataset.close))}

init();
