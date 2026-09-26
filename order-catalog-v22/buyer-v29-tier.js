/* V2.9 wholesale tier pricing synced from seller settings */
function v29Tiers(){
  const arr=Array.isArray(shop?.wholesaleTiers)?shop.wholesaleTiers:[];
  if(!arr.length)return [];
  return arr.map(t=>({
    minQty:Math.max(1,Math.floor(Number(t.minQty??t.qty??1)||1)),
    price10:Math.max(0,Number(t.price10??t.price?.['10ml']??0)||0),
    price30:Math.max(0,Number(t.price30??t.price?.['30ml']??0)||0),
    freeQty:Math.max(0,Math.floor(Number(t.freeQty??t.free??0)||0))
  })).sort((a,b)=>a.minQty-b.minQty);
}
function v29CurrentTier(){const q=totalQty(),ts=v29Tiers();let hit=null;for(const t of ts){if(q>=t.minQty)hit=t;else break}return hit}
function v29NextTier(){const q=totalQty();return v29Tiers().find(t=>t.minQty>q)||null}
try{
  threshold=function(){const ts=v29Tiers();return ts.length?ts[0].minQty:Math.max(1,Math.floor(Number(shop.wholesaleMinTotal)||20))};
  wholesale=function(){return v29Tiers().length?!!v29CurrentTier():totalQty()>=threshold()};
  unitPrice=function(p,size){
    const pr=priceObject(p,size),tier=v29CurrentTier();
    if(!tier)return Number(pr.retail)||0;
    const override=size==='10ml'?tier.price10:size==='30ml'?tier.price30:0;
    return override>0?override:(Number(pr.wholesale)||0);
  };
}catch{}

function v29FreeRow(){
  const box=document.querySelector('.summary-box');if(!box)return;
  let row=box.querySelector('.v29-free-row');
  const tier=v29CurrentTier();
  if(!tier||tier.freeQty<=0){if(row)row.remove();return}
  if(!row){row=document.createElement('div');row.className='summary-row v29-free-row';const grand=box.querySelector('.grand');box.insertBefore(row,grand||null)}
  row.innerHTML=`<span>ของแถมตามสเตป</span><b>${tier.freeQty} ขวด</b>`;
}

try{
  updateTotalsUI=function(){
    const count=totalQty(),sum=cart.reduce((a,b)=>a+lineTotal(b),0),banner=$('#wholesaleNotice'),tier=v29CurrentTier(),next=v29NextTier(),ts=v29Tiers();
    $('#cartCount').textContent=count;$('#cartTotalMini').textContent=money(sum);$('#cartBottleCount').textContent=`${count} ขวด`;$('#cartPriceType').textContent=tier?'ราคาส่ง':'ราคาปลีก';$('#grandTotal').textContent=money(sum);
    if(ts.length){
      if(tier){
        const p10=tier.price10>0?money(tier.price10):'ราคาส่งเดิม',p30=tier.price30>0?money(tier.price30):'ราคาส่งเดิม';
        let txt=`สเตป ${tier.minQty}+ ขวด • 10ml ${p10} • 30ml ${p30}`;
        if(tier.freeQty>0)txt+=` • แถม ${tier.freeQty} ขวด`;
        if(next)txt+=` • อีก ${next.minQty-count} ขวดถึงสเตป ${next.minQty}`;
        banner.textContent=txt;banner.classList.add('wholesale-on');
      }else{
        const first=ts[0];banner.textContent=`อีก ${first.minQty-count} ขวด ถึงราคาส่งสเตปแรก ${first.minQty} ขวด`;banner.classList.remove('wholesale-on');
      }
    }else{
      const min=threshold();if(count>=min){banner.textContent=`ยอดรวม ${count} ขวด • ใช้ราคาส่งแล้ว`;banner.classList.add('wholesale-on')}else{banner.textContent=`ยอดรวม ${count} ขวด • อีก ${min-count} ขวด จะได้ราคาส่ง`;banner.classList.remove('wholesale-on')}
    }
    v29FreeRow();
  };
}catch{}

function v29Wire(){try{updateTotalsUI();render();renderCart()}catch{}}
window.addEventListener('load',()=>setTimeout(v29Wire,450));
