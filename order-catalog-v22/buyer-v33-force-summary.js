/* V2.14 - force the saved JPG builder to include free-gift quantity */
(function(){
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

  async function forceSummary(){
    if(!cart?.length) return alert('ยังไม่มีสินค้าในตะกร้า');
    const canvas=$('#summaryCanvas'),ctx=canvas.getContext('2d');
    const W=1400,rowH=330,headerH=270,footerH=235,H=headerH+cart.length*rowH+footerH;
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
  window.forceSummaryV214=forceSummary;
})();
