/* V2.8 stock=0 + JPG image enlargement */

// In V2.8, stock quantity is authoritative. A selected size with stock 0 is sold out,
// even for older products that previously had stockTracked=false.
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
        // Ignore near-white studio/background pixels while keeping real product details.
        const nearWhite=r>246&&g>246&&b>246;
        if(nearWhite) continue;
        if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
      }
    }
    if(maxX<minX||maxY<minY) return null;
    let bw=maxX-minX+1,bh=maxY-minY+1;
    // Add a small safe border so labels/bottle edges are not clipped.
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

async function buildSummaryV28(){
  if(!cart.length)return alert('ยังไม่มีสินค้าในตะกร้า');
  const canvas=$('#summaryCanvas'),ctx=canvas.getContext('2d');
  const W=1400,rowH=330,headerH=270,footerH=220,H=headerH+cart.length*rowH+footerH;
  canvas.width=W;canvas.height=H;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#111827';ctx.fillRect(0,0,W,20);
  ctx.fillStyle='#111827';ctx.font='900 58px sans-serif';ctx.fillText(shop.brand||'ORDER CATALOG',70,92);
  ctx.fillStyle='#64748b';ctx.font='30px sans-serif';ctx.fillText('สรุปรายการสั่งซื้อ',70,140);
  ctx.font='23px sans-serif';ctx.fillText(new Date().toLocaleString('th-TH'),70,180);
  ctx.textAlign='right';ctx.fillStyle=wholesale()?'#047857':'#334155';ctx.font='800 28px sans-serif';ctx.fillText(wholesale()?'ราคาส่ง':'ราคาปลีก',W-70,100);ctx.textAlign='left';

  let y=headerH,grand=0;
  for(const i of cart){
    const p=products.find(x=>x.id===i.productId),unit=unitPrice(p,i.size),total=unit*i.qty;grand+=total;
    ctx.fillStyle='#f8fafc';ctx.fillRect(55,y-18,W-110,rowH-24);

    // Larger image area + automatic removal of the white margins inside source photos.
    const ix=78,iy=y+10,iw=280,ih=270;
    ctx.fillStyle='#fff';ctx.fillRect(ix,iy,iw,ih);
    try{const img=await loadImg(i.image);v28DrawProductLarge(ctx,img,ix+8,iy+8,iw-16,ih-16)}catch{}

    const textX=400;
    ctx.fillStyle='#111827';const fs=v27FitText? v27FitText(ctx,i.name,500,40,24) : 34;ctx.font=`800 ${fs}px sans-serif`;ctx.fillText(i.name,textX,y+68);
    ctx.fillStyle='#64748b';ctx.font='27px sans-serif';ctx.fillText(`ขนาด ${i.size}`,textX,y+122);ctx.fillText(`จำนวน ${i.qty} ชิ้น`,textX,y+168);
    ctx.fillStyle='#475569';ctx.font='25px sans-serif';ctx.fillText(`ราคา/ชิ้น ${money(unit)}`,textX,y+216);

    ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='900 42px sans-serif';ctx.fillText(money(total),W-82,y+150);ctx.fillStyle='#64748b';ctx.font='23px sans-serif';ctx.fillText('รวมรายการนี้',W-82,y+193);ctx.textAlign='left';
    y+=rowH;
  }

  ctx.fillStyle='#111827';ctx.font='900 38px sans-serif';ctx.fillText(`จำนวนรวม ${totalQty()} ขวด`,70,H-105);
  ctx.textAlign='right';ctx.font='900 58px sans-serif';ctx.fillText(money(grand),W-70,H-100);ctx.fillStyle='#64748b';ctx.font='25px sans-serif';ctx.fillText('ยอดรวมทั้งหมด',W-70,H-145);ctx.textAlign='left';
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
