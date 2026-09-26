/* V2.7 buyer visual + JPG polish */
function v27DrawZoomCover(ctx,img,x,y,w,h,zoom=1.16){
  if(!img?.width||!img?.height)return;
  const boxRatio=w/h,imgRatio=img.width/img.height;
  let sw,sh;
  if(imgRatio>boxRatio){sh=img.height/zoom;sw=sh*boxRatio}else{sw=img.width/zoom;sh=sw/boxRatio}
  sw=Math.min(sw,img.width);sh=Math.min(sh,img.height);
  const sx=(img.width-sw)/2,sy=(img.height-sh)/2;
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}

function v27FitText(ctx,text,maxWidth,maxSize=38,minSize=22){
  let size=maxSize;
  while(size>minSize){ctx.font=`800 ${size}px sans-serif`;if(ctx.measureText(String(text)).width<=maxWidth)break;size-=2}
  return size;
}

async function buildSummaryV27(){
  if(!cart.length)return alert('ยังไม่มีสินค้าในตะกร้า');
  const canvas=$('#summaryCanvas'),ctx=canvas.getContext('2d');
  const W=1400,rowH=300,headerH=270,footerH=220,H=headerH+cart.length*rowH+footerH;
  canvas.width=W;canvas.height=H;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#111827';ctx.fillRect(0,0,W,20);
  ctx.fillStyle='#111827';ctx.font='900 58px sans-serif';ctx.fillText(shop.brand||'ORDER CATALOG',70,92);
  ctx.fillStyle='#64748b';ctx.font='30px sans-serif';ctx.fillText('สรุปรายการสั่งซื้อ',70,140);
  ctx.font='23px sans-serif';ctx.fillText(new Date().toLocaleString('th-TH'),70,180);
  ctx.textAlign='right';ctx.fillStyle=wholesale()?'#047857':'#334155';ctx.font='800 28px sans-serif';ctx.fillText(wholesale()?'ราคาส่ง':'ราคาปลีก',W-70,100);ctx.textAlign='left';

  let y=headerH,grand=0;
  for(const i of cart){
    const p=products.find(x=>x.id===i.productId),unit=unitPrice(p,i.size),total=unit*i.qty;grand+=total;
    ctx.fillStyle='#f8fafc';ctx.fillRect(55,y-18,W-110,rowH-24);
    const ix=78,iy=y+8,is=230;
    ctx.fillStyle='#ffffff';ctx.fillRect(ix,iy,is,is);
    try{const img=await loadImg(i.image);v27DrawZoomCover(ctx,img,ix,iy,is,is,1.18)}catch{}

    const textX=345;
    ctx.fillStyle='#111827';const fs=v27FitText(ctx,i.name,560,40,24);ctx.font=`800 ${fs}px sans-serif`;ctx.fillText(i.name,textX,y+64);
    ctx.fillStyle='#64748b';ctx.font='27px sans-serif';ctx.fillText(`ขนาด ${i.size}`,textX,y+116);ctx.fillText(`จำนวน ${i.qty} ชิ้น`,textX,y+160);
    ctx.fillStyle='#475569';ctx.font='25px sans-serif';ctx.fillText(`ราคา/ชิ้น ${money(unit)}`,textX,y+204);

    ctx.textAlign='right';ctx.fillStyle='#111827';ctx.font='900 42px sans-serif';ctx.fillText(money(total),W-82,y+145);ctx.fillStyle='#64748b';ctx.font='23px sans-serif';ctx.fillText('รวมรายการนี้',W-82,y+188);ctx.textAlign='left';
    y+=rowH;
  }

  ctx.fillStyle='#111827';ctx.font='900 38px sans-serif';ctx.fillText(`จำนวนรวม ${totalQty()} ขวด`,70,H-105);
  ctx.textAlign='right';ctx.font='900 58px sans-serif';ctx.fillText(money(grand),W-70,H-100);ctx.fillStyle='#64748b';ctx.font='25px sans-serif';ctx.fillText('ยอดรวมทั้งหมด',W-70,H-145);ctx.textAlign='left';
  lastOrderBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.97));
  show('summaryModal');
  downloadJpg();
}

try{buildSummary=buildSummaryV27}catch{}

function v27PolishControls(){
  document.querySelectorAll('.close').forEach(b=>{b.setAttribute('aria-label','ปิดหน้าต่าง');b.title='ปิด'});
  document.querySelectorAll('.buyer-cart-item .remove').forEach(b=>{b.setAttribute('aria-label','ลบสินค้า');b.title='ลบสินค้า'});
  const confirmBtn=$('#checkoutBtn');if(confirmBtn)confirmBtn.onclick=buildSummaryV27;
}

const v27Observer=new MutationObserver(v27PolishControls);
if(document.body)v27Observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',()=>{v27PolishControls();setTimeout(v27PolishControls,600);setTimeout(v27PolishControls,1600)});

document.addEventListener('error',e=>{
  const img=e.target;
  if(!(img instanceof HTMLImageElement)||img.dataset.v27Fallback)return;
  img.dataset.v27Fallback='1';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="48%" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#64748b">ไม่มีรูปสินค้า</text><text x="50%" y="56%" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#94a3b8">กรุณาอัปโหลดรูปจากหน้า Admin</text></svg>`;
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
},true);
