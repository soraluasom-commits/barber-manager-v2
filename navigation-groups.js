/* Presentation-only navigation: original page renderers and calculations remain intact. */
(() => {
  document.body.classList.add('ui-refresh');
  function installNavigation() {
  const cloudMenu = PAGES.find(item => item[0] === 'cloud');
  if (cloudMenu) cloudMenu[2] = 'บัญชีและซิงก์ออนไลน์';
  const groups = [
    ['overview', 'ภาพรวม', ['dashboard']],
    ['service', 'งานบริการ', ['entry', 'history']],
    ['finance', 'การเงิน', ['income', 'expenses']],
    ['reports', 'รายงาน', ['daily', 'monthly', 'summary', 'annual', 'analytics', 'goals']],
    ['shop', 'จัดการร้าน', ['staff', 'backup', 'cloud']],
    ['learning', 'ศูนย์เรียนรู้', ['learnHair', 'learnTools', 'learnBrands']]
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
    document.getElementById('nav').innerHTML = groups.map(g => `<button class="nav-main ${g === current ? 'active' : ''}" ${g === current ? 'aria-current="page"' : ''} onclick="openMenuGroup('${g[0]}')">${g[1]}</button>`).join('');
    document.getElementById('bottomnav').innerHTML = groups.map(g => `<button class="${g === current ? 'active' : ''}" ${g === current ? 'aria-current="page"' : ''} onclick="openMenuGroup('${g[0]}')">${g[1]}</button>`).join('');
  };
  const originalRender = render;
  render = function () {
    originalRender();
    document.querySelectorAll('#content .kpi').forEach(card => {
      const label = card.querySelector('.label')?.textContent || '';
      card.dataset.tone = /รายจ่าย/.test(label) ? 'expense' : /กองกลาง|คงเหลือ|กำไร/.test(label) ? 'balance' : /รายรับ|รายได้/.test(label) ? 'income' : 'info';
    });
    if (page === 'cloud') document.getElementById('pageTitle').textContent = 'บัญชีและซิงก์ออนไลน์';
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
  };
  const brand = document.querySelector('.brand');
  if (brand) brand.innerHTML = `<span class="barber-emblem" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="24" fill="#0052FF"/><rect x="17" y="12" width="14" height="24" rx="5" fill="white"/><path d="M17 23L31 16V22L17 29V23Z" fill="#0052FF"/><path d="M17 31L31 24V30L20 35C18 35 17 33 17 31Z" fill="#FF6B00"/><path d="M19 9H29M19 39H29" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg></span><span class="brand-text">Barber Manager<small>System By SORA</small></span>`;
  brand?.setAttribute('aria-label','Barber Manager System By SORA');
  render();
  }
  if (window.BARBER_FIREBASE_CONFIG && !window.BarberCloudNavigationReady) {
    window.addEventListener('barber-cloud-navigation-ready', installNavigation, {once:true});
  } else installNavigation();
})();
