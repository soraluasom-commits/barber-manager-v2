/* Buyer V2.15 - delivery method + address/pickup details in saved JPG */
(function(){
  const DELIVERY_KEY='buyer_delivery_v215';

  function giftInfo(){
    const q=typeof totalQty==='function'?totalQty():0;
    const tiers=Array.isArray(shop?.wholesaleTiers)?shop.wholesaleTiers:[];
    let hit=null;
    for(const raw of tiers){
      const t={
        minQty:Math.max(1,Math.floor(Number(raw?.minQty??raw?.qty??1)||1)),
        freeQty:Math.max(0,Math.floor(Number(raw?.freeQty??raw?.free??0)||0))
      };
      if(q>=t.minQty && (!hit || t.minQty>=hit.minQty)) hit=t;
    }
    return hit||{minQty:0,freeQty:0};
  }

  function rr(ctx,x,y,w,h,r){
    const R=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+R,y);ctx.lineTo(x+w-R,y);ctx.quadraticCurveTo(x+w,y,x+w,y+R);ctx.lineTo(x+w,y+h-R);ctx.quadraticCurveTo(x+w,y+h,x+w-R,y+h);ctx.lineTo(x+R,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-R);ctx.lineTo(x,y+R);ctx.quadraticCurveTo(x,y,x+R,y);ctx.fill();
  }

  function escHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function savedDelivery(){try{return JSON.parse(localStorage.getItem(DELIVERY_KEY)||'{}')}catch{return{}}}
  function saveDelivery(){
    const d=readDelivery(false);
    try{localStorage.setItem(DELIVERY_KEY,JSON.stringify(d))}catch{}
  }

  function ensureDeliveryUI(){
    const sheet=document.querySelector('#cartModal .buyer-cart-sheet')||document.querySelector('#cartModal .cart-sheet');
    if(!sheet)return;
    // Remove any old bottom "ปิด" button if a previous version/theme added one.
    sheet.querySelectorAll('.actions button,button').forEach(b=>{if((b.textContent||'').trim()==='ปิด'&&!b.classList.contains('close'))b.remove()});
    if(document.querySelector('#deliveryBox'))return;
    const actions=sheet.querySelector('.actions');
    if(!actions)return;
    const old=savedDelivery(),method=old.method==='pickup'?'pickup':'ems';
    const box=document.createElement('div');
    box.id='deliveryBox';
    box.innerHTML=`
      <h3 class="delivery-title">ที่อยู่ในการจัดส่ง</h3>
      <div class="delivery-choice">
        <label><input type="radio" name="deliveryMethodV215" value="ems" ${method==='ems'?'checked':''}> ส่ง EMS</label>
        <label><input type="radio" name="deliveryMethodV215" value="pickup" ${method==='pickup'?'checked':''}> นัดรับ</label>
      </div>
      <div id="deliveryEmsFields">
        <label class="delivery-field"><span>ชื่อและที่อยู่จัดส่ง</span><textarea id="deliveryNameAddress" rows="3" placeholder="ชื่อผู้รับ + ที่อยู่จัดส่ง (กรอกในช่องเดียว)">${escHtml(old.nameAddress||'')}</textarea></label>
        <label class="delivery-field"><span>เบอร์โทร</span><input id="deliveryPhone" type="tel" inputmode="tel" placeholder="เบอร์โทรผู้รับ" value="${escHtml(old.phone||'')}"></label>
      </div>
      <div id="deliveryPickupFields">
        <label class="delivery-field"><span>สถานที่นัดรับ</span><input id="deliveryPickupPlace" type="text" placeholder="ระบุสถานที่นัดรับ" value="${escHtml(old.pickupPlace||'')}"></label>
      </div>`;
    actions.parentNode.insertBefore(box,actions);
    const style=document.createElement('style');
    style.textContent=`
      #deliveryBox{margin:18px 0 4px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}
      .delivery-title{margin:0 0 10px;font-size:18px}.delivery-choice{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
      .delivery-choice label{display:flex;align-items:center;gap:7px;padding:9px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:999px;font-weight:700;cursor:pointer}
      .delivery-field{display:flex;flex-direction:column;gap:6px;margin-top:10px}.delivery-field span{font-size:13px;font-weight:700;color:#475569}
      .delivery-field input,.delivery-field textarea{box-sizing:border-box;width:100%;font:inherit;padding:11px 12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;resize:vertical}
    `;
    document.head.appendChild(style);
    const sync=()=>{
      const m=document.querySelector('input[name="deliveryMethodV215"]:checked')?.value||'ems';
      document.querySelector('#deliveryEmsFields').style.display=m==='ems'?'block':'none';
      document.querySelector('#deliveryPickupFields').style.display=m==='pickup'?'block':'none';
      saveDelivery();
    };
    box.querySelectorAll('input[name="deliveryMethodV215"]').forEach(r=>r.onchange=sync);
    box.querySelectorAll('input:not([type=radio]),textarea').forEach(el=>{el.addEventListener('input',saveDelivery);el.addEventListener('change',saveDelivery)});
    sync();
  }

  function readDelivery(validate=true){
    const method=document.querySelector('input[name="deliveryMethodV215"]:checked')?.value||'ems';
    const d={
      method,
      nameAddress:(document.querySelector('#deliveryNameAddress')?.value||'').trim(),
      phone:(document.querySelector('#deliveryPhone')?.value||'').trim(),
      pickupPlace:(document.querySelector('#deliveryPickupPlace')?.value||'').trim()
    };
    if(validate){
      if(method==='ems'&&!d.nameAddress)throw new Error('กรุณากรอกชื่อและที่อยู่สำหรับส่ง EMS');
      if(method==='ems'&&!d.phone)throw new Error('กรุณากรอกเบอร์โทรสำหรับส่ง EMS');
      if(method==='pickup'&&!d.pickupPlace)throw new Error('กรุณาระบุสถานที่นัดรับ');
    }
    return d;
  }

  function wrapLines(ctx,text,maxWidth){
    const src=String(text||'').replace(/\s+/g,' ').trim();
    if(!src)return[];
    const words=src.split(' '),lines=[];let line='';
    for(const word of words){
      const test=line?line+' '+word:word;
      if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;
    }
    if(line)lines.push(line);return lines;
  }

  async function forceSummary(){
    if(!cart?.length) return alert('ยังไม่มีสินค้าในตะกร้า');
    ensureDeliveryUI();
    let delivery;try{delivery=readDelivery(true)}catch(e){return alert(e.message)}
    saveDelivery();
    const canvas=$('#summaryCanvas'),ctx=canvas.getContext('2d');
    const W=1400,rowH=330,headerH=270,deliveryH=delivery.method==='ems'?300:235,footerH=235+deliveryH,H=headerH+cart.length*rowH+footerH;
    canvas.width=W;canvas.height=H;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#111827';ctx.fillRect(0,0,W,20);
    ctx.fillStyle='#111827';ctx.font='900 58px sans-serif';ctx.fillText(shop.brand||'ORDER CATALOG',70,92);
    ctx.fillStyle='#64748b';ctx.font='30px sans-serif';ctx.fillText('สรุปรายการสั่งซื้อ',70,140);
    ctx.font='23px sans-serif';ctx.fillText(new Date().toLocaleString('th-TH'),70,180);
    ctx.textAlign='right';ctx.fillStyle=wholesale()?'#047857':'#334155';ctx.font='800 28px sans-serif';ctx.fillText(wholesale()?'ราคาส่ง':'ราคาปลีก',W-70,100);ctx.textAlign='left';

    const gift=giftInfo();
    if(gift.freeQty>0){
      const bx=875,by=125,bw=455,bh=105;
      ctx.fillStyle='#7c3aed';rr(ctx,bx,by,bw,bh,22);
      ctx.fillStyle='#fff';ctx.font='800 24px sans-serif';ctx.fillText('ของแถมตามสเตป',bx+28,by+38);
      ctx.font='900 38px sans-serif';ctx.fillText(`${gift.freeQty} ขวด`,bx+28,by+82);
      ctx.textAlign='right';ctx.fillStyle='#ede9fe';ctx.font='700 20px sans-serif';ctx.fillText(`สเตป ${gift.minQty}+ ขวด`,bx+bw-25,by+80);ctx.textAlign='left';
    }

    let y=headerH,grand=0;
    for(const i of cart){
      const p=products.find(x=>x.id===i.productId),unit=unitPrice(p,i.size),total=unit*i.qty;grand+=total;
      ctx.fillStyle='#f8fafc';ctx.fillRect(55,y-18,W-110,rowH-24);
      const ix=78,iy=y+10,iw=280,ih=270;ctx.fillStyle='#fff';ctx.fillRect(ix,iy,iw,ih);
      try{
        const img=await loadImg(i.image);
        if(typeof v28DrawProductLarge==='function')v28DrawProductLarge(ctx,img,ix+8,iy+8,iw-16,ih-16);
        else {const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height,s=Math.min((iw-16)/sw,(ih-16)/sh),dw=sw*s,dh=sh*s;ctx.drawImage(img,ix+8+(iw-16-dw)/2,iy+8+(ih-16-dh)/2,dw,dh)}
      }catch{}
      const textX=400;ctx.fillStyle='#111827';ctx.font='800 40px sans-serif';ctx.fillText(i.name,textX,y+68);
      ctx.fillStyle='#64748b';ctx.font='27px sans-serif';ctx.fillText(`ขนาด ${i.size}`,textX,y+122);ctx.fillText(`จำนวน ${i.qty} ชิ้น`,textX,y+168);
      ctx.fillStyle='#475569';ctx.font='25px sans-serif';ctx.fillText(`ราคา/ชิ้น ${money(unit)}`,textX,y+216);
      ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='900 42px sans-serif';ctx.fillText(money(total),W-82,y+150);ctx.fillStyle='#64748b';ctx.font='23px sans-serif';ctx.fillText('รวมรายการนี้',W-82,y+193);ctx.textAlign='left';
      y+=rowH;
    }

    const deliveryTop=y+12;
    ctx.fillStyle='#f1f5f9';ctx.fillRect(55,deliveryTop,W-110,deliveryH-30);
    ctx.fillStyle='#0f172a';ctx.font='900 32px sans-serif';ctx.fillText('ข้อมูลการจัดส่ง',78,deliveryTop+52);
    ctx.fillStyle='#0369a1';ctx.font='900 30px sans-serif';ctx.fillText(delivery.method==='ems'?'ส่ง EMS':'นัดรับ',78,deliveryTop+98);
    ctx.fillStyle='#334155';ctx.font='26px sans-serif';
    if(delivery.method==='ems'){
      ctx.fillText(`เบอร์โทร: ${delivery.phone}`,78,deliveryTop+145);
      ctx.fillStyle='#64748b';ctx.font='23px sans-serif';ctx.fillText('ชื่อและที่อยู่:',78,deliveryTop+190);
      ctx.fillStyle='#334155';ctx.font='25px sans-serif';
      const lines=wrapLines(ctx,delivery.nameAddress,W-185).slice(0,3);
      lines.forEach((line,idx)=>ctx.fillText(line,78,deliveryTop+228+idx*32));
    }else{
      ctx.fillStyle='#64748b';ctx.font='23px sans-serif';ctx.fillText('สถานที่นัดรับ:',78,deliveryTop+150);
      ctx.fillStyle='#334155';ctx.font='26px sans-serif';
      const lines=wrapLines(ctx,delivery.pickupPlace,W-185).slice(0,2);
      lines.forEach((line,idx)=>ctx.fillText(line,78,deliveryTop+190+idx*34));
    }

    ctx.fillStyle='#111827';ctx.font='900 38px sans-serif';ctx.fillText(`จำนวนรวม ${totalQty()} ขวด`,70,H-105);
    if(gift.freeQty>0){ctx.fillStyle='#7c3aed';ctx.font='900 30px sans-serif';ctx.fillText(`ของแถม ${gift.freeQty} ขวด • สเตป ${gift.minQty}+`,70,H-55)}
    ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='900 58px sans-serif';ctx.fillText(money(grand),W-70,H-100);ctx.fillStyle='#64748b';ctx.font='25px sans-serif';ctx.fillText('ยอดรวมทั้งหมด',W-70,H-145);ctx.textAlign='left';
    lastOrderBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.98));
    show('summaryModal');
    downloadJpg();
  }

  // Capture phase prevents all older checkout handlers from running.
  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('#checkoutBtn');
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    forceSummary();
  },true);

  ensureDeliveryUI();
  const appObserver=new MutationObserver(()=>ensureDeliveryUI());
  appObserver.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',()=>{ensureDeliveryUI();setTimeout(ensureDeliveryUI,500)});
  window.forceSummaryV215=forceSummary;
})();
