/* Presentation-only navigation: original page renderers and calculations remain intact. */
(() => {
  document.body.classList.add('ui-refresh');
  const shopLabels = {staff:'ข้อมูลร้านและช่าง',backup:'สำรองและกู้คืน'};
  for (const item of PAGES) {
    if (shopLabels[item[0]]) item[2] = shopLabels[item[0]];
  }
  const groups = [
    ['overview', 'ภาพรวม', ['dashboard']],
    ['service', 'งานบริการ', ['entry', 'history']],
    ['finance', 'การเงิน', ['income', 'expenses']],
    ['reports', 'รายงาน', ['daily', 'monthly', 'summary', 'annual', 'analytics', 'personal', 'goals']],
    ['shop', 'จัดการร้าน', ['staff', 'sync', 'backup']],
    ['learning', 'ศูนย์เรียนรู้', ['learnHair', 'learnTools', 'learnBrands', 'learnForms']]
  ];
  const remembered = {};
  const originalGo = go;
  go = function(destination) { originalGo(destination); window.scrollTo({top:0,behavior:'instant'}); };
  const groupForPage = () => groups.find(g => g[2].includes(page)) || groups[0];
  window.openMenuGroup = id => {
    const g = groups.find(g => g[0] === id);
    if (g) go(remembered[id] || g[2][0]);
  };
  renderNav = function () {
    const current = groupForPage();
    document.getElementById('bottomnav').classList.remove('hidden');
    remembered[current[0]] = page;
    document.getElementById('nav').innerHTML = groups.map(g => `<button class="nav-main ${g === current ? 'active' : ''}" ${g === current ? 'aria-current="page"' : ''} data-csp-click="menu-group" data-csp-arg="${esc(g[0])}">${g[1]}</button>`).join('');
    document.getElementById('bottomnav').innerHTML = groups.map(g => `<button class="${g === current ? 'active' : ''}" ${g === current ? 'aria-current="page"' : ''} data-csp-click="menu-group" data-csp-arg="${esc(g[0])}">${g[1]}</button>`).join('');
  };
  const originalRender = render;
  render = function () {
    originalRender();
    document.querySelectorAll('#content .kpi').forEach(card => {
      const label = card.querySelector('.label')?.textContent || '';
      card.dataset.tone = /รายจ่าย/.test(label) ? 'expense' : /กองกลาง|คงเหลือ|กำไร/.test(label) ? 'balance' : /รายรับ|รายได้/.test(label) ? 'income' : 'info';
    });
    if (groupForPage()[0] === 'learning') document.getElementById('pageTitle').textContent = 'ศูนย์เรียนรู้';
    renderTabs();
  };
  function renderTabs() {
    document.querySelectorAll('#content > .page-tabs').forEach(el => el.remove());
    const g = groupForPage();
    const available = g[2].filter(p => PAGES.some(item => item[0] === p));
    if (available.length < 2) return;
    const tabs = document.createElement('div');
    tabs.className = 'page-tabs';
    tabs.setAttribute('role', 'navigation');
    tabs.setAttribute('aria-label', g[1]);
    tabs.innerHTML = available.map(p => `<button class="${page === p ? 'active' : ''}" ${page === p ? 'aria-current="page"' : ''} data-destination="${p}">${PAGES.find(item => item[0] === p)[2]}</button>`).join('');
    tabs.addEventListener('click', e => {
      const button = e.target.closest('button');
      if (!button) return;
      const destination = button.dataset.destination;
      go(destination);
      document.querySelector(`.page-tabs [data-destination="${destination}"]`)?.focus();
    });
    document.getElementById('content').prepend(tabs);
  }
  window.ShopNavigation = Object.freeze({renderTabs});
  window.addEventListener('barber-content-rendered', renderTabs);
  const brand = document.querySelector('.brand');
  if (brand) brand.innerHTML = `<span class="barber-emblem" aria-hidden="true"><img src="./brand-logo.png" width="48" height="48" alt="" decoding="async"></span><span class="brand-text">Barber Manager<small>System By SORA</small></span>`;
  brand?.setAttribute('aria-label','Barber Manager System By SORA');
  render();
})();
