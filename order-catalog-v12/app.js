const money = n => '฿' + Number(n || 0).toLocaleString('th-TH');
const $ = s => document.querySelector(s);

const STORAGE_KEYS = {
  catalog: 'catalogEdits_v11',
  cart: 'cart_v11',
  customer: 'customer_v11',
  shop: 'shop_v11'
};

let baseProducts = [];
let products = [];
let cart = [];
let current = null;
let customer = { name: '', contact: '', seller: '', note: '' };
let shop = { brand: 'ORDER CATALOG', sub: 'เลือกสินค้า • ขนาด • ฝา • จำนวน', contact: '' };

async function init() {
  if (window.CATALOG_PARTS && window.SPRITE_PARTS) {
    baseProducts = window.CATALOG_PARTS.flat();
    const sprite = await loadImg('data:image/webp;base64,' + window.SPRITE_PARTS.join(''));
    const tile = 160, cols = 20;
    baseProducts = baseProducts.map(p => {
      const c = document.createElement('canvas'); c.width = tile; c.height = tile;
      const x = (p.spriteIndex % cols) * tile, y = Math.floor(p.spriteIndex / cols) * tile;
      c.getContext('2d').drawImage(sprite, x, y, tile, tile, 0, 0, tile, tile);
      return {...p, image: c.toDataURL('image/webp', .92)};
    });
  } else {
    baseProducts = window.EMBEDDED_CATALOG || await (await fetch('catalog.json')).json();
  }
  products = load(STORAGE_KEYS.catalog, baseProducts);
  cart = load(STORAGE_KEYS.cart, []);
  customer = load(STORAGE_KEYS.customer, customer);
  shop = load(STORAGE_KEYS.shop, shop);
  applyShop();
  fillCustomerForm();
  render();
  updateCart();
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveProducts() {
  store(STORAGE_KEYS.catalog, products);
  render();
  renderAdmin();
}

function saveCart() {
  store(STORAGE_KEYS.cart, cart);
  updateCart();
}

function saveCustomer() {
  customer = {
    name: $('#cName').value.trim(),
    contact: $('#cContact').value.trim(),
    seller: $('#cSeller').value.trim(),
    note: $('#cNote').value.trim()
  };
  store(STORAGE_KEYS.customer, customer);
}

function saveShop() {
  shop = {
    brand: $('#sBrand').value.trim() || 'ORDER CATALOG',
    sub: $('#sSub').value.trim() || 'เลือกสินค้า • ขนาด • ฝา • จำนวน',
    contact: $('#sContact').value.trim()
  };
  store(STORAGE_KEYS.shop, shop);
  applyShop();
  alert('บันทึกข้อมูลร้านแล้ว');
}

function applyShop() {
  $('#brandName').textContent = shop.brand || 'ORDER CATALOG';
  $('#brandSub').textContent = shop.sub || 'เลือกสินค้า • ขนาด • ฝา • จำนวน';
  $('#sBrand').value = shop.brand || '';
  $('#sSub').value = shop.sub || '';
  $('#sContact').value = shop.contact || '';
}

function fillCustomerForm() {
  $('#cName').value = customer.name || '';
  $('#cContact').value = customer.contact || '';
  $('#cSeller').value = customer.seller || shop.brand || '';
  $('#cNote').value = customer.note || '';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function activeProducts() {
  const q = $('#searchInput').value.trim().toLowerCase();
  const sf = $('#sizeFilter').value;
  return products.filter(p => p.active !== false && (!q || p.name.toLowerCase().includes(q)) && (!sf || p.sizes.includes(sf)));
}

function getProductById(id) {
  return products.find(p => p.id === id);
}

function getLinePricing(product, size, qty) {
  const pr = product.prices[size] || { retail: 0, wholesale: 0 };
  const isWholesale = qty >= product.wholesaleMin;
  const unit = isWholesale ? pr.wholesale : pr.retail;
  return {
    retail: pr.retail,
    wholesale: pr.wholesale,
    unit,
    total: unit * qty,
    priceType: isWholesale ? 'ส่ง' : 'ปลีก'
  };
}

function render() {
  const g = $('#productGrid');
  const list = activeProducts();
  g.innerHTML = '';
  list.forEach(p => {
    const d = document.createElement('article');
    d.className = 'card';
    const availableRetail = p.sizes.map(size => p.prices[size]?.retail || 999999);
    const min = Math.min(...availableRetail);
    d.innerHTML = `
      <img loading="lazy" src="${p.image}" alt="${esc(p.name)}">
      <div class="card-body">
        <h3>${esc(p.name)}</h3>
        <div class="meta">
          ${p.sizes.map(s => `<span class="badge">${esc(s)}</span>`).join('')}
          ${p.caps.map(c => `<span class="badge">${esc(c)}</span>`).join('')}
        </div>
        <div class="from">ราคาเริ่มต้น</div>
        <div class="price">${money(min)}</div>
        <button>เลือกสินค้า</button>
      </div>`;
    d.querySelector('button').onclick = () => openProduct(p);
    g.appendChild(d);
  });
  $('#productCount').textContent = list.length.toLocaleString('th-TH');
}

function openProduct(p) {
  current = p;
  $('#pmImg').src = p.image;
  $('#pmName').textContent = p.name;
  $('#pmSize').innerHTML = p.sizes.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#pmCap').innerHTML = p.caps.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#pmQty').value = 1;
  calcProduct();
  show('productModal');
}

function calcProduct() {
  if (!current) return;
  const s = $('#pmSize').value;
  const q = Math.max(1, +$('#pmQty').value || 1);
  const pr = getLinePricing(current, s, q);
  $('#pmRetail').textContent = money(pr.retail);
  $('#pmWholesale').textContent = money(pr.wholesale);
  $('#pmRule').textContent = `ราคาส่งเมื่อสั่งตั้งแต่ ${current.wholesaleMin} ชิ้น/รายการ`;
  $('#pmTotal').textContent = money(pr.total);
}

function addCurrentToCart() {
  const size = $('#pmSize').value;
  const cap = $('#pmCap').value;
  const qty = Math.max(1, +$('#pmQty').value || 1);
  const pricing = getLinePricing(current, size, qty);
  cart.push({
    id: crypto.randomUUID(),
    productId: current.id,
    name: current.name,
    image: current.image,
    size,
    cap,
    qty,
    unit: pricing.unit,
    total: pricing.total,
    priceType: pricing.priceType
  });
  saveCart();
  hide('productModal');
  renderCart();
  show('cartModal');
}

function recalculateItem(item) {
  const product = getProductById(item.productId);
  if (!product) return item;
  const pricing = getLinePricing(product, item.size, item.qty);
  item.unit = pricing.unit;
  item.total = pricing.total;
  item.priceType = pricing.priceType;
  return item;
}

function updateCart() {
  cart = cart.map(recalculateItem);
  const count = cart.reduce((a, b) => a + b.qty, 0);
  const total = cart.reduce((a, b) => a + b.total, 0);
  $('#cartCount').textContent = count;
  $('#cartTotalMini').textContent = money(total);
  store(STORAGE_KEYS.cart, cart);
}

function renderCart() {
  const w = $('#cartItems');
  w.innerHTML = '';
  let total = 0;
  if (!cart.length) {
    w.innerHTML = '<p class="muted-line">ยังไม่มีสินค้าในตะกร้า</p>';
  }
  cart.forEach(i => {
    total += i.total;
    const d = document.createElement('div');
    d.className = 'cart-item';
    d.innerHTML = `
      <img src="${i.image}" alt="${esc(i.name)}">
      <div>
        <h4>${esc(i.name)}</h4>
        <p>${i.size} • ${i.cap} • ราคาขาย${i.priceType}</p>
        <p>${money(i.unit)} / ชิ้น</p>
        <div class="qty-row">
          <label>จำนวน</label>
          <input class="qty-input" type="number" min="1" value="${i.qty}" inputmode="numeric">
        </div>
        <p><b>${money(i.total)}</b></p>
      </div>
      <button class="remove">×</button>`;
    d.querySelector('.remove').onclick = () => {
      cart = cart.filter(x => x.id !== i.id);
      saveCart();
      renderCart();
    };
    d.querySelector('.qty-input').oninput = e => {
      i.qty = Math.max(1, +e.target.value || 1);
      recalculateItem(i);
      saveCart();
      renderCart();
    };
    w.appendChild(d);
  });
  $('#grandTotal').textContent = money(total);
}

async function drawSummary() {
  const c = $('#summaryCanvas');
  const ctx = c.getContext('2d');
  const sellerName = customer.seller || shop.brand || 'ORDER CATALOG';
  const topLines = [
    `ร้าน/ผู้ขาย: ${sellerName}`,
    `ลูกค้า: ${customer.name || '-'}`,
    `ติดต่อ: ${customer.contact || '-'}`,
    `หมายเหตุ: ${customer.note || '-'}${shop.contact ? `  |  ติดต่อร้าน: ${shop.contact}` : ''}`
  ];

  const W = 1200;
  const header = 280;
  const rowH = 210;
  const footer = 170;
  const H = header + rowH * cart.length + footer;
  c.width = W;
  c.height = H;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#111111';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('สรุปคำสั่งซื้อ', 60, 78);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText(new Date().toLocaleString('th-TH'), 60, 122);

  ctx.fillStyle = '#111111';
  ctx.font = '26px sans-serif';
  topLines.forEach((line, idx) => wrapText(ctx, line, 60, 170 + idx * 32, W - 120, 32));

  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, header - 20);
  ctx.lineTo(W - 60, header - 20);
  ctx.stroke();

  let y = header;
  let total = 0;
  for (const i of cart) {
    total += i.total;
    const img = await loadImg(i.image);
    ctx.drawImage(img, 60, y - 30, 160, 160);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 30px sans-serif';
    wrapText(ctx, i.name, 250, y + 5, 570, 34);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(`${i.size} • ${i.cap} • ${i.priceType}`, 250, y + 86);
    ctx.fillText(`จำนวน ${i.qty} ชิ้น • ราคา/ชิ้น ${money(i.unit)}`, 250, y + 122);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(money(i.total), W - 60, y + 78);
    ctx.textAlign = 'left';

    ctx.strokeStyle = '#eeeeee';
    ctx.beginPath();
    ctx.moveTo(60, y + 145);
    ctx.lineTo(W - 60, y + 145);
    ctx.stroke();
    y += rowH;
  }

  ctx.fillStyle = '#111111';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('ยอดรวมทั้งสิ้น', 60, H - 85);
  ctx.textAlign = 'right';
  ctx.fillText(money(total), W - 60, H - 85);
  ctx.textAlign = 'left';
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText('ตรวจสอบรายการก่อนชำระเงินทุกครั้ง', 60, H - 42);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  let currentY = y;
  for (const char of String(text)) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, currentY);
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function show(id) { $('#' + id).classList.remove('hidden'); }
function hide(id) { $('#' + id).classList.add('hidden'); }

function exportCatalog() {
  const data = {
    products,
    shop,
    exportedAt: new Date().toISOString(),
    version: '1.2'
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `catalog-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCatalogFile() {
  const file = $('#importCatalogInput').files[0];
  if (!file) return alert('กรุณาเลือกไฟล์ JSON ก่อน');
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)) {
        products = data;
      } else if (Array.isArray(data.products)) {
        products = data.products;
        if (data.shop) {
          shop = { ...shop, ...data.shop };
          store(STORAGE_KEYS.shop, shop);
          applyShop();
        }
      } else {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      }
      saveProducts();
      alert('นำเข้าข้อมูลสำเร็จ');
    } catch (err) {
      alert('นำเข้าไม่สำเร็จ: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function addProduct() {
  const f = $('#aImage').files[0];
  if (!f) return alert('กรุณาเลือกรูปสินค้า');
  const reader = new FileReader();
  reader.onload = () => {
    products.unshift({
      id: 'u' + Date.now(),
      name: $('#aName').value.trim() || 'สินค้าใหม่',
      image: reader.result,
      active: true,
      sizes: ['10ml', '30ml'],
      caps: ['ฝาแดง', 'ฝาดำ'],
      prices: {
        '10ml': { retail: +$('#aR10').value || 0, wholesale: +$('#aW10').value || 0 },
        '30ml': { retail: +$('#aR30').value || 0, wholesale: +$('#aW30').value || 0 }
      },
      wholesaleMin: +$('#aMin').value || 1
    });
    saveProducts();
    $('#aName').value = '';
    $('#aImage').value = '';
    alert('เพิ่มสินค้าใหม่แล้ว');
  };
  reader.readAsDataURL(f);
}

function renderAdmin() {
  const q = ($('#adminSearch').value || '').toLowerCase();
  const box = $('#adminList');
  box.innerHTML = '';
  const list = products.filter(p => !q || p.name.toLowerCase().includes(q));
  list.slice(0, 120).forEach(p => {
    const d = document.createElement('div');
    d.className = 'admin-row';
    d.innerHTML = `
      <img src="${p.image}" alt="${esc(p.name)}">
      <div>
        <input class="nm" value="${esc(p.name)}">
        <div class="mini">
          <input class="r10" type="number" value="${p.prices['10ml'].retail}">
          <input class="w10" type="number" value="${p.prices['10ml'].wholesale}">
          <input class="min" type="number" value="${p.wholesaleMin}">
        </div>
        <div class="mini">
          <input class="r30" type="number" value="${p.prices['30ml'].retail}">
          <input class="w30" type="number" value="${p.prices['30ml'].wholesale}">
          <input class="caps" value="${esc((p.caps || []).join(','))}">
        </div>
        <div class="muted-line">สถานะ: ${p.active === false ? 'ซ่อนอยู่' : 'แสดงอยู่'} • ขนาด: ${(p.sizes || []).join(', ')}</div>
        <div class="admin-actions">
          <button class="save">บันทึก</button>
          <button class="toggle">${p.active === false ? 'เปิดแสดง' : 'ซ่อนสินค้า'}</button>
          <button class="del">ลบถาวร</button>
        </div>
      </div>`;

    d.querySelector('.save').onclick = () => {
      p.name = d.querySelector('.nm').value.trim() || p.name;
      p.prices['10ml'].retail = +d.querySelector('.r10').value || 0;
      p.prices['10ml'].wholesale = +d.querySelector('.w10').value || 0;
      p.prices['30ml'].retail = +d.querySelector('.r30').value || 0;
      p.prices['30ml'].wholesale = +d.querySelector('.w30').value || 0;
      p.wholesaleMin = +d.querySelector('.min').value || 1;
      p.caps = d.querySelector('.caps').value.split(',').map(x => x.trim()).filter(Boolean);
      if (!p.caps.length) p.caps = ['ฝาแดง', 'ฝาดำ'];
      saveProducts();
    };

    d.querySelector('.toggle').onclick = () => {
      p.active = p.active === false ? true : false;
      saveProducts();
    };

    d.querySelector('.del').onclick = () => {
      if (!confirm('ลบสินค้านี้ถาวร?')) return;
      products = products.filter(x => x.id !== p.id);
      saveProducts();
    };

    box.appendChild(d);
  });
}

function buildTextSummary() {
  const total = cart.reduce((sum, item) => sum + item.total, 0);
  const lines = [];
  lines.push(`ร้าน/ผู้ขาย: ${customer.seller || shop.brand || '-'}`);
  lines.push(`ลูกค้า: ${customer.name || '-'}`);
  lines.push(`ติดต่อ: ${customer.contact || '-'}`);
  lines.push('------------------------------');
  cart.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   ${item.size} / ${item.cap} / ${item.qty} ชิ้น / ${item.priceType}`);
    lines.push(`   ${money(item.total)}`);
  });
  lines.push('------------------------------');
  lines.push(`ยอดรวม: ${money(total)}`);
  if (customer.note) lines.push(`หมายเหตุ: ${customer.note}`);
  return lines.join('\n');
}

$('#addCartBtn').onclick = addCurrentToCart;
$('#cartBtn').onclick = () => { renderCart(); show('cartModal'); };
$('#clearCart').onclick = () => {
  if (!confirm('ล้างรายการทั้งหมด?')) return;
  cart = [];
  saveCart();
  renderCart();
};
$('#checkoutBtn').onclick = () => {
  if (!cart.length) return alert('ยังไม่มีสินค้าในตะกร้า');
  hide('cartModal');
  fillCustomerForm();
  show('checkoutModal');
};
$('#summaryBtn').onclick = async () => {
  if (!cart.length) return alert('ยังไม่มีสินค้าในตะกร้า');
  saveCustomer();
  await drawSummary();
  hide('checkoutModal');
  show('summaryModal');
};
$('#downloadJpg').onclick = () => {
  const a = document.createElement('a');
  a.download = `order-${Date.now()}.jpg`;
  a.href = $('#summaryCanvas').toDataURL('image/jpeg', 0.96);
  a.click();
};
$('#copyTextBtn').onclick = async () => {
  try {
    await navigator.clipboard.writeText(buildTextSummary());
    alert('คัดลอกข้อความออเดอร์แล้ว');
  } catch {
    alert('คัดลอกไม่สำเร็จ');
  }
};
$('#searchInput').oninput = render;
$('#sizeFilter').onchange = render;
$('#pmSize').onchange = calcProduct;
$('#pmQty').oninput = calcProduct;
$('#pmCap').onchange = calcProduct;
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => hide(b.dataset.close));
$('#adminBtn').onclick = () => { renderAdmin(); show('adminModal'); };
$('#addProduct').onclick = addProduct;
$('#saveShop').onclick = saveShop;
$('#adminSearch').oninput = renderAdmin;
$('#exportCatalogBtn').onclick = exportCatalog;
$('#importCatalogBtn').onclick = importCatalogFile;

init();
