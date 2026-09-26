import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import pg from 'pg';

const PORT = Number(process.env.PORT || 10000);
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const CATALOG_URL = process.env.CATALOG_URL || 'https://order-catalog-v21-preview.onrender.com/catalog.json';
const DATABASE_URL = process.env.DATABASE_URL || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const SHOP = {
  brand: process.env.SHOP_BRAND || 'ORDER CATALOG',
  sub: process.env.SHOP_SUB || 'เลือกสินค้า • ขนาด • ฝา • จำนวน',
  contact: process.env.SHOP_CONTACT || '',
  shippingFee: Number(process.env.SHIPPING_FEE || 50),
  freeShippingMin: Number(process.env.FREE_SHIPPING_MIN || 0)
};

const mem = { products: [], orders: new Map(), loaded: false };
let pool = null;
if (DATABASE_URL) {
  pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

function json(res, code, body, extra={}) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-headers':'content-type,x-admin-key',
    'access-control-allow-methods':'GET,POST,PATCH,OPTIONS',
    ...extra
  });
  res.end(data);
}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',d=>{s+=d;if(s.length>2_000_000)reject(new Error('payload too large'))});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function cleanProduct(p){return {...p,stockTracked:!!p.stockTracked,stock:{'10ml':Number(p.stock?.['10ml']||0),'30ml':Number(p.stock?.['30ml']||0)},lowStockThreshold:Number(p.lowStockThreshold??5)}}
function priceFor(p,size,qty){const pr=p.prices?.[size]||{retail:0,wholesale:0};const wholesale=qty>=Number(p.wholesaleMin||0);return Number(wholesale?pr.wholesale:pr.retail)||0}
function shippingFor(subtotal,method){if(method==='pickup')return 0;return SHOP.freeShippingMin>0&&subtotal>=SHOP.freeShippingMin?0:Math.max(0,SHOP.shippingFee)}
function orderId(){const d=new Date();const y=String(d.getFullYear()).slice(-2),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `OD${y}${m}${day}-${crypto.randomBytes(5).toString('hex').slice(0,8).toUpperCase()}`}

async function loadCatalog(){
  if(mem.loaded) return;
  try{
    const r=await fetch(CATALOG_URL,{cache:'no-store'});
    const ct=r.headers.get('content-type')||'';
    if(!r.ok||!ct.includes('json')) throw new Error(`catalog ${r.status}`);
    mem.products=(await r.json()).map(cleanProduct);
  }catch(e){
    console.warn('Catalog URL unavailable, using built-in catalog:',e.message);
    mem.products=Array.from({length:295},(_,idx)=>{
      const n=idx+1,id=`p${String(n).padStart(3,'0')}`;
      return cleanProduct({id,name:`สินค้า ${String(n).padStart(3,'0')}`,image:`https://order-catalog-v21-preview.onrender.com/products/${id}.jpg`,active:true,sizes:['10ml','30ml'],caps:['ฝาแดง','ฝาดำ'],prices:{'10ml':{retail:490,wholesale:450},'30ml':{retail:850,wholesale:790}},wholesaleMin:6,stockTracked:false,stock:{'10ml':0,'30ml':0},lowStockThreshold:5});
    });
  }
  mem.loaded=true;
}
async function initDb(){
  if(!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS products(id text primary key, data jsonb not null, updated_at timestamptz default now());
  CREATE TABLE IF NOT EXISTS orders(id text primary key, data jsonb not null, created_at timestamptz default now(), updated_at timestamptz default now());`);
  const n=Number((await pool.query('select count(*)::int n from products')).rows[0].n||0);
  if(!n){await loadCatalog();const c=await pool.connect();try{await c.query('begin');for(const p of mem.products)await c.query('insert into products(id,data) values($1,$2) on conflict(id) do nothing',[String(p.id),p]);await c.query('commit')}catch(e){await c.query('rollback');throw e}finally{c.release()}}
}
async function products(){
  if(pool){const r=await pool.query('select data from products order by id');return r.rows.map(x=>cleanProduct(x.data))}
  await loadCatalog(); return mem.products.map(cleanProduct);
}
async function createOrder(input){
  const ps=await products(); const byId=new Map(ps.map(p=>[String(p.id),p])); const grouped=new Map();
  for(const raw of input.items||[]){const id=String(raw.productId||'');const size=String(raw.size||'');const qty=Math.max(1,Math.floor(Number(raw.qty)||1));const cap=String(raw.cap||'');const k=id+'|'+size;const g=grouped.get(k)||{id,size,qty:0,lines:[]};g.qty+=qty;g.lines.push({raw,qty,cap});grouped.set(k,g)}
  if(!grouped.size) throw Object.assign(new Error('ไม่มีสินค้าในออเดอร์'),{status:400});
  const finalItems=[];let subtotal=0;
  for(const g of grouped.values()){
    const p=byId.get(g.id);if(!p||p.active===false)throw Object.assign(new Error(`ไม่พบสินค้า ${g.id}`),{status:400});if(!(p.sizes||[]).includes(g.size))throw Object.assign(new Error(`ขนาดไม่ถูกต้อง: ${p.name}`),{status:400});
    const stock=Number(p.stock?.[g.size]||0);if(p.stockTracked&&g.qty>stock)throw Object.assign(new Error(`${p.name} ${g.size} คงเหลือ ${stock} ชิ้น`),{status:409});
    const unit=priceFor(p,g.size,g.qty);for(const line of g.lines){const total=unit*line.qty;subtotal+=total;finalItems.push({id:crypto.randomUUID(),productId:p.id,name:p.name,image:p.image,size:g.size,cap:line.cap,qty:line.qty,unit,total,priceType:g.qty>=Number(p.wholesaleMin||0)?'ส่ง':'ปลีก'})}
  }
  const method=input.customer?.deliveryMethod==='pickup'?'pickup':'delivery'; const fee=shippingFor(subtotal,method); const id=String(input.id||orderId()); const now=new Date().toISOString();
  const order={id,createdAt:now,customer:{name:String(input.customer?.name||''),contact:String(input.customer?.contact||''),address:method==='delivery'?String(input.customer?.address||''):'',deliveryMethod:method,note:String(input.customer?.note||'')},seller:SHOP.brand,items:finalItems,itemCount:finalItems.reduce((a,b)=>a+b.qty,0),subtotal,shipping:{method,address:method==='delivery'?String(input.customer?.address||''):'',fee,carrier:'',trackingNo:''},total:subtotal+fee,status:'pending',paymentStatus:'unpaid',inventoryReserved:true,inventoryDeducted:true};
  if(pool){const c=await pool.connect();try{await c.query('begin');for(const g of grouped.values()){const rr=await c.query('select data from products where id=$1 for update',[g.id]);if(!rr.rowCount)throw Object.assign(new Error('สินค้าไม่พบ'),{status:400});const p=cleanProduct(rr.rows[0].data);const stock=Number(p.stock?.[g.size]||0);if(p.stockTracked&&g.qty>stock)throw Object.assign(new Error(`${p.name} ${g.size} คงเหลือ ${stock} ชิ้น`),{status:409});if(p.stockTracked){p.stock[g.size]=stock-g.qty;await c.query('update products set data=$2,updated_at=now() where id=$1',[g.id,p])}}await c.query('insert into orders(id,data) values($1,$2)',[id,order]);await c.query('commit')}catch(e){await c.query('rollback');throw e}finally{c.release()}}
  else {for(const g of grouped.values()){const p=mem.products.find(x=>String(x.id)===g.id);if(p?.stockTracked)p.stock[g.size]=Math.max(0,Number(p.stock?.[g.size]||0)-g.qty)}mem.orders.set(id,order)}
  return order;
}
async function getOrder(id){if(pool){const r=await pool.query('select data from orders where id=$1',[id]);return r.rowCount?r.rows[0].data:null}return mem.orders.get(id)||null}
async function setStatus(id,status){const allowed=['pending','packing','shipped','done','cancelled'];if(!allowed.includes(status))throw Object.assign(new Error('สถานะไม่ถูกต้อง'),{status:400});const o=await getOrder(id);if(!o)throw Object.assign(new Error('ไม่พบออเดอร์'),{status:404});o.status=status;o.updatedAt=new Date().toISOString();if(pool)await pool.query('update orders set data=$2,updated_at=now() where id=$1',[id,o]);else mem.orders.set(id,o);return o}
async function listOrders(){if(pool){const r=await pool.query("select data from orders order by created_at desc limit 200");return r.rows.map(x=>x.data)}return [...mem.orders.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,200)}

await loadCatalog();
try{await initDb()}catch(e){console.error('DB init failed; continuing in memory mode',e.message);pool=null}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return json(res,204,{});
  try{
    const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/health')return json(res,200,{ok:true,version:'2.2.0',storage:pool?'postgres':'memory',products:(await products()).length});
    if(u.pathname==='/api/shop'&&req.method==='GET')return json(res,200,SHOP);
    if(u.pathname==='/api/products'&&req.method==='GET')return json(res,200,await products());
    if(u.pathname==='/api/orders'&&req.method==='POST'){const input=await body(req);if(!input.customer?.name||!input.customer?.contact)return json(res,400,{error:'กรุณากรอกชื่อและข้อมูลติดต่อ'});const o=await createOrder(input);return json(res,201,{...o,inventoryReserved:true})}
    const m=u.pathname.match(/^\/api\/orders\/([^/]+)$/);if(m&&req.method==='GET'){const o=await getOrder(decodeURIComponent(m[1]));if(!o)return json(res,404,{error:'ไม่พบออเดอร์'});const {customer,items,...pub}=o;return json(res,200,pub)}
    if(u.pathname==='/api/admin/orders'&&req.method==='GET'){if(!ADMIN_KEY||req.headers['x-admin-key']!==ADMIN_KEY)return json(res,401,{error:'unauthorized'});return json(res,200,await listOrders())}
    const sm=u.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);if(sm&&req.method==='PATCH'){if(!ADMIN_KEY||req.headers['x-admin-key']!==ADMIN_KEY)return json(res,401,{error:'unauthorized'});const b=await body(req);return json(res,200,await setStatus(decodeURIComponent(sm[1]),String(b.status||'')))}
    return json(res,404,{error:'not found'});
  }catch(e){console.error(e);return json(res,e.status||500,{error:e.message||'server error'})}
});
server.listen(PORT,()=>console.log(`Order Catalog API v2.2 on ${PORT}; storage=${pool?'postgres':'memory'}`));
