/* V2.12 - show wholesale free-gift quantity in saved JPG summary */
(function(){
  if(typeof buildSummary!=='function') return;
  const originalBuildSummary=buildSummary;

  function currentGiftInfo(){
    try{
      const tier=typeof v29CurrentTier==='function'?v29CurrentTier():null;
      if(tier) return {freeQty:Math.max(0,Number(tier.freeQty||0)),minQty:Number(tier.minQty||0)};
    }catch{}
    return {freeQty:0,minQty:0};
  }

  function roundedRect(ctx,x,y,w,h,r){
    if(typeof ctx.roundRect==='function'){
      ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();return;
    }
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
    ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
    ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
    ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.fill();
  }

  async function buildSummaryV32(){
    if(!cart?.length) return alert('ยังไม่มีสินค้าในตะกร้า');
    const realDownload=downloadJpg;
    let built=false;
    try{
      // Prevent the older summary builder from downloading before we add the gift information.
      downloadJpg=()=>{};
      await originalBuildSummary();
      built=true;
    }finally{
      downloadJpg=realDownload;
    }
    if(!built) return;

    const canvas=$('#summaryCanvas');
    if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const gift=currentGiftInfo();
    const W=canvas.width;

    // Clearly visible gift badge in the otherwise-unused upper-right header space.
    const bw=430,bh=105,bx=W-bw-70,by=125;
    ctx.save();
    ctx.fillStyle='#7c3aed';
    roundedRect(ctx,bx,by,bw,bh,22);
    ctx.textAlign='left';
    ctx.fillStyle='#ffffff';
    ctx.font='800 25px sans-serif';
    ctx.fillText('ของแถมตามสเตป',bx+28,by+39);
    ctx.font='900 37px sans-serif';
    ctx.fillText(`${gift.freeQty} ขวด`,bx+28,by+82);
    if(gift.minQty>0){
      ctx.textAlign='right';
      ctx.font='700 20px sans-serif';
      ctx.fillStyle='#ede9fe';
      ctx.fillText(`สเตป ${gift.minQty}+`,bx+bw-25,by+78);
    }
    ctx.restore();

    // Rebuild JPG blob after drawing the gift quantity, then download once.
    lastOrderBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.98));
    realDownload();
  }

  try{buildSummary=buildSummaryV32}catch{}

  function wire(){
    const b=$('#checkoutBtn');
    if(b)b.onclick=buildSummaryV32;
  }
  wire();
  window.addEventListener('load',()=>{wire();setTimeout(wire,300);setTimeout(wire,900)});
  const ob=new MutationObserver(wire);
  if(document.body)ob.observe(document.body,{childList:true,subtree:true});
})();
