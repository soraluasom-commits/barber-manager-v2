/* V2.13 stock=0 + enlarged JPG product image + gift quantity */

// Stock quantity is authoritative. A selected size with stock 0 is sold out.
try{
  stockFor = function(p,size){
    return Math.max(0, Number(p?.stock?.[size] ?? 0));
  };
  stockState = function(p,size){
    const n=stockFor(p,size), low=Number(p?.lowStockThreshold ?? 5);
    if(n<=0) return {text:'สินค้าหมด',cls:'stock-out',out:true};
    if(n<=low) return {text:`สินค้าใกล้หมด • เหลือ ${n}`,cls:'stock-low',out:false};
    return {text:`คงเหลือ ${n}`,cls:'stock-ok',out:false};
  };
}catch{}

function v28DetectVisibleBounds(img){
  try{
    const maxSide=700;
    const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
    const h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let yy=0;yy<h;yy++){
      for(let xx=0;xx<w;xx++){
        const i=(yy*w+xx)*4,r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
        if(a<16) continue;
        const nearWhite=r>246&&g>246&&b>246;
        if(nearWhite) continue;
        if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
      }
    }
    if(maxX<minX||maxY<minY) return null;
    let bw=maxX-minX+1,bh=maxY-minY+1;
    const padX=Math.max(4,Math.round(bw*.07)),padY=Math.max(4,Math.round(bh*.07));
    minX=Math.max(0,minX-padX);minY=Math.max(0,minY-padY);maxX=Math.min(w-1,maxX+padX);maxY=Math.min(h-1,maxY+padY);
    bw=maxX-minX+1;bh=maxY-minY+1;
    return {sx:minX/scale,sy:minY/scale,sw:bw/scale,sh:bh/scale};
  }catch(e){
    return null;
  }
}

function v28DrawProductLarge(ctx,img,x,y,w,h){
  const b=v28DetectVisibleBounds(img);
  const sx=b?.sx ?? 0, sy=b?.sy ?? 0, sw=b?.sw ?? (img.naturalWidth||img.width), sh=b?.sh ?? (img.naturalHeight||img.height);
  const scale=Math.min(w/sw,h/sh);
  const dw=sw*scale,dh=sh*scale;
  const dx=x+(w-dw)/2,dy=y+(h-dh)/2;
  ctx.fillStyle='#fff';ctx.fillRect(x,y,w,h);
  ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
}

function v213GiftInfo(){
  try{
    if(typeof v29CurrentTier==='function'){
      const t=v29CurrentTier();
      if(t) return {freeQty:Math.max(0,Math.floor(Number(t.freeQty||0))),minQty:Math.max(0,Math.floor(Number(t.minQty||0)))};
    }
    const tiers=Array.isArray(shop?.wholesaleTiers)?shop.wholesaleTiers:[];
    const qty=totalQty();
    let hit=null;
    for(const raw of tiers){
      const minQty=Math.max(1,Math.floor(Number(raw.minQty??raw.qty??1)||1));
      if(qty>=minQty) hit={freeQty:Math.max(0,Math.floor(Number(raw.freeQty??raw.free??0)||0)),minQty};
    }
    if(hit)return hit;
  }catch{}
  return {freeQty:0,minQty:0};
}

function v213RoundRect(ctx,x,y,w,h,r){
  if(typeof ctx.roundRect==='function'){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();return}
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.fill();
}

async function buildSummaryV28(){
  if(!cart.length)return alert('ยังไม่มีสินค้าในตะกร้า');
  const canvas=$('#summaryCanvas'),ctx=canvas.getContext('2d');
  const W=1400,rowH=330,headerH=300,footerH=245,H=headerH+cart.length*rowH+footerH;
  canvas.width=W;canvas.height=H;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#111827';ctx.fillRect(0,0,W,20);
  ctx.fillStyle='#111827';ctx.font='900 58px sans-serif';ctx.fillText(shop.brand||'ORDER CATALOG',70,92);
  ctx.fillStyle='#64748b';ctx.font='30px sans-serif';ctx.fillText('สรุปรายการสั่งซื้อ',70,140);
  ctx.font='23px sans-serif';ctx.fillText(new Date().toLocaleString('th-TH'),70,180);
  ctx.textAlign='right';ctx.fillStyle=wholesale()?'#047857':'#334155';ctx.font='800 28px sans-serif';ctx.fillText(wholesale()?'ราคาส่ง':'ราคาปลีก',W-70,100);ctx.textAlign='left';

  const gift=v213GiftInfo();
  if(wholesale() || gift.minQty>0){
    const bx=W-500,by=135,bw=430,bh=112;
    ctx.fillStyle='#7c3aed';v213RoundRect(ctx,bx,by,bw,bh,22);
    ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='800 24px sans-serif';ctx.fillText('ของแถมตามสเตป',bx+26,by+38);
    ctx.font='900 40px sans-serif';ctx.fillText(`${gift.freeQty} ขวด`,bx+26,by+84);
    if(gift.minQty>0){ctx.textAlign='right';ctx.fillStyle='#ede9fe';ctx.font='700 20px sans-serif';ctx.fillText(`สเตป ${gift.minQty}+`,bx+bw-24,by+82)}
    ctx.textAlign='left';
  }

  let y=headerH,grand=0;
  for(const i of cart){
    const p=products.find(x=>x.id===i.productId),unit=unitPrice(p,i.size),total=unit*i.qty;grand+=total;
    ctx.fillStyle='#f8fafc';ctx.fillRect(55,y-18,W-110,rowH-24);

    const ix=78,iy=y+10,iw=280,ih=270;
    ctx.fillStyle='#fff';ctx.fillRect(ix,iy,iw,ih);
    try{const img=await loadImg(i.image);v28DrawProductLarge(ctx,img,ix+8,iy+8,iw-16,ih-16)}catch{}

    const textX=400;
    ctx.fillStyle='#111827';const fs=typeof v27FitText==='function'?v27FitText(ctx,i.name,500,40,24):34;ctx.font=`800 ${fs}px sans-serif`;ctx.fillText(i.name,textX,y+68);
    ctx.fillStyle='#64748b';ctx.font='27px sans-serif';ctx.fillText(`ขนาด ${i.size}`,textX,y+122);ctx.fillText(`จำนวน ${i.qty} ชิ้น`,textX,y+168);
    ctx.fillStyle='#475569';ctx.font='25px sans-serif';ctx.fillText(`ราคา/ชิ้น ${money(unit)}`,textX,y+216);

    ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='900 42px sans-serif';ctx.fillText(money(total),W-82,y+150);ctx.fillStyle='#64748b';ctx.font='23px sans-serif';ctx.fillText('รวมรายการนี้',W-82,y+193);ctx.textAlign='left';
    y+=rowH;
  }

  ctx.fillStyle='#111827';ctx.font='900 38px sans-serif';ctx.fillText(`จำนวนรวม ${totalQty()} ขวด`,70,H-105);
  ctx.fillStyle=gift.freeQty>0?'#7c3aed':'#64748b';ctx.font='800 29px sans-serif';ctx.fillText(`ของแถม ${gift.freeQty} ขวด`,70,H-58);
  ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='900 58px sans-serif';ctx.fillText(money(grand),W-70,H-100);ctx.fillStyle='#64748b';ctx.font='25px sans-serif';ctx.fillText('ยอดรวมทั้งหมด',W-70,H-145);ctx.textAlign='left';
  lastOrderBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.98));
  show('summaryModal');
  downloadJpg();
}

try{buildSummary=buildSummaryV28}catch{}

function v28Wire(){
  const b=$('#checkoutBtn');if(b)b.onclick=buildSummaryV28;
}
const v28Observer=new MutationObserver(()=>{v28Wire()});
if(document.body)v28Observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',()=>{v28Wire();setTimeout(()=>{render();renderCart();v28Wire()},250)});
