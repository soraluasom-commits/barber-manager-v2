// Customer navigation layered on the accepted grouped navigation and base renderers.
(() => {
  const element = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  if(window.BarberStoreHost?.reviewCopy){
    const banner=element('div','สำเนาตรวจร้าน · บันทึกในเครื่องนี้');
    banner.id='review-banner';
    document.body.prepend(banner);
    new ResizeObserver(()=>{
      document.documentElement.style.setProperty('--review-offset',Math.ceil(banner.getBoundingClientRect().height)+'px');
    }).observe(banner);
  }

  const brand = document.querySelector('.brand');
  if (brand) {
    const logo = element('img', undefined, 'review-brand-logo');
    logo.src = './review-logo-transparent.png';
    logo.alt = 'Barber Manager System By SORA';
    brand.replaceChildren(logo,element('span','บริหารร้านตัดผม','review-brand-caption'));
    brand.classList.add('review-brand');
  }
  const side = document.getElementById('side');
  const close = element('button','ปิดเมนู ×','review-drawer-close');
  close.type = 'button';
  close.setAttribute('aria-label','ปิดเมนู');
  close.addEventListener('click',()=>side.classList.remove('open'));
  side.prepend(close);

  const paths = {
    overview:'M3 10 12 3l9 7v10H7V10m3 10v-6h4v6',
    service:'M4 4l16 16M4 20 20 4M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    finance:'M3 6h18v14H3zM3 6l14-3v3m-1 6h5v4h-5z',
    reports:'M4 3v18h17M8 16v-4m5 4V8m5 8V5',
    shop:'M3 10h18L19 4H5zM5 10v10h14V10m-10 10v-6h6v6',
    learning:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15'
  };
  const accountRoutes = {sync:'บัญชีร้านและซิงก์'};
  for (const [id,title] of Object.entries(accountRoutes)) {
    if (!PAGES.some(p=>p[0]===id)) PAGES.push([id,'',title]);
  }
  const originalNav=renderNav, originalRender=render, originalGo=go;
  renderNav=function() {
    originalNav();
    const nav=document.getElementById('nav');
    nav.prepend(element('div','หน้าร้านของฉัน','review-nav-heading'));
    for (const button of nav.querySelectorAll('button[data-csp-arg]')) {
      const d=paths[button.dataset.cspArg];
      if (!d) continue;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'), path=document.createElementNS(svg.namespaceURI,'path');
      svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');svg.classList.add('review-menu-icon');
      path.setAttribute('d',d);svg.append(path);
      button.replaceChildren(svg,element('span',button.textContent,'review-menu-label'));
    }
  };
  render=function() {
    if (accountRoutes[page]) {
      renderNav();updateThemeUI();
      document.getElementById('pageTitle').textContent=accountRoutes[page];
      document.getElementById('shopNameTop').textContent=state.shopName||'ยังไม่ได้ตั้งชื่อร้าน';
      document.getElementById('content').replaceChildren();
    } else originalRender();
    const title={staff:'ข้อมูลร้านและช่าง',subscription:'บัญชีและสมาชิก',sync:'ซิงก์ข้อมูล',backup:'สำรองและกู้คืน'};
    for(const button of document.querySelectorAll('.page-tabs [data-destination]')) {
      if(button.dataset.destination==='subscription')button.remove();
      else if(title[button.dataset.destination])button.textContent=title[button.dataset.destination];
    }
    for(const notice of document.querySelectorAll('.top > .notice'))notice.remove();
  };
  go=function(destination) {
    const target=['subscription','devices','license'].includes(destination)?'sync':destination;
    if (!PAGES.some(p=>p[0]===target)) return;
    history.replaceState(null,'','#'+target);
    return originalGo(target);
  };
  window.addEventListener('hashchange',()=>{
    const target=location.hash.slice(1);
    go(PAGES.some(p=>p[0]===target)?target:'dashboard');
  });
  render();
})();
