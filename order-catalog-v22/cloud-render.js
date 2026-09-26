(function(){
  const API='https://order-catalog-api-v22.onrender.com';
  let connected=false;
  async function request(path,opts={}){
    const r=await fetch(API+path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||`HTTP ${r.status}`);
    return data;
  }
  async function init(){
    try{await request('/health');connected=true;return{configured:true,connected:true,error:''}}
    catch(e){connected=false;return{configured:true,connected:false,error:e.message}}
  }
  async function getProducts(){return request('/api/products')}
  async function getShop(){return request('/api/shop')}
  async function reserveOrder(order){return request('/api/orders',{method:'POST',body:JSON.stringify(order)})}
  async function getPublicOrderStatus(id){return request('/api/orders/'+encodeURIComponent(id))}
  async function uploadPaymentSlip(){throw new Error('ระบบอัปโหลดสลิปกำลังเชื่อมต่อในขั้นถัดไป')}
  async function savePaymentSubmission(){throw new Error('ระบบอัปโหลดสลิปกำลังเชื่อมต่อในขั้นถัดไป')}
  async function getPublicPaymentStatus(){return null}
  async function getStorageDownloadURL(){throw new Error('ยังไม่รองรับ')}
  window.cloudCatalog={init,getProducts,getShop,reserveOrder,getPublicOrderStatus,uploadPaymentSlip,savePaymentSubmission,getPublicPaymentStatus,getStorageDownloadURL};
})();
