(async function () {
  'use strict';
  // One active tab per browser prevents competing local journals.
  if (navigator.locks) {
    const acquired = await new Promise(resolve => {
      navigator.locks.request('barber-manager-active', { ifAvailable: true }, lock => {
        resolve(!!lock);
        return lock ? new Promise(() => {}) : undefined;
      });
    });
    if (!acquired) {
      document.body.innerHTML = '<main style="padding:32px"><h2>เปิดร้านอยู่ในแท็บอื่นแล้ว</h2><p>ปิดแท็บอื่นของเว็บร้านก่อน แล้วรีเฟรชหน้านี้</p></main>';
      return;
    }
  }
  const { copy, equal, merge } = window.BarberCloudMerge;
  const OWNER = window.BARBER_CLOUD_OWNER;
  const KEY = 'barberCloudPendingV1';
  const LINK = 'barberCloudBaseV1';
  let auth, db, api, user, unsubscribe, reference;
  let base = null, remote = null, pending = null, ready = false, busy = false, remoteLoaded = false;
  let status = 'กำลังเชื่อมต่อบริการ', problem = '';
  try { pending = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { problem = 'อ่านรายการรอซิงก์ไม่ได้ กรุณาสำรองข้อมูลก่อน'; }
  if (pending && pending.uid !== OWNER) { pending = null; problem = 'บัญชีของรายการรอซิงก์ไม่ตรงกับร้าน'; }
  try {
    const linked = JSON.parse(localStorage.getItem(LINK) || 'null');
    if (linked?.uid === OWNER) { base = linked.data; ready = true; }
    if (pending) { base = pending.base; state = upgrade(copy(pending.data)); ready = true; }
  } catch (_) { problem = 'อ่านสถานะซิงก์ไม่ได้ กรุณาสำรองข้อมูลก่อน'; }
  if (ready && !pending && !equal(base, state)) {
    persistPending({ uid: OWNER, base: copy(base), data: copy(state) });
  }
  function rememberBase(data) { localStorage.setItem(LINK, JSON.stringify({ uid: OWNER, data })); base = copy(data); }
  function persistPending(value) {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
    pending = value;
  }
  function valid(data) {
    if (!data || !Array.isArray(data.staff) || !Array.isArray(data.entries) || !Array.isArray(data.expenses) || !Array.isArray(data.funds)) throw Error('รูปแบบข้อมูลออนไลน์ไม่ถูกต้อง');
    return data;
  }
  function decode(value) { return value ? valid(JSON.parse(value.payload)) : null; }
  function note(message) { status = message; if (page === 'cloud') render(); }
  function backupLocal() { localStorage.setItem('barberBeforeCloudV1', JSON.stringify(state)); }
  function apply(data) { state = upgrade(copy(data)); localStorage.setItem(STORAGE, JSON.stringify(state)); rememberBase(state); }
  function editing() { return document.getElementById('modal')?.classList.contains('open') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName); }
  function receiveLatest() {
    if (!ready || !user || !remote || pending || busy || problem || editing()) return;
    const next = decode(remote);
    if (!equal(next, base)) { apply(next); render(); }
  }
  const originalRender = render;
  PAGES.push(['cloud', '☁', 'ซิงก์ออนไลน์']);
  render = function () {
    if (page !== 'cloud') return originalRender();
    renderNav(); updateThemeUI();
    document.getElementById('pageTitle').textContent = 'ซิงก์ออนไลน์';
    document.getElementById('content').innerHTML = cloudPage();
  };
  function cloudPage() {
    const login = `<form id="cloudLogin"><div class="field"><label for="cloudEmail">อีเมลบัญชีร้าน</label><input id="cloudEmail" type="email" autocomplete="username" required></div><div class="field"><label for="cloudPassword">รหัสผ่าน</label><input id="cloudPassword" type="password" autocomplete="current-password" required></div><br><button class="btn primary" ${!auth || busy ? 'disabled' : ''}>เข้าสู่ระบบ</button></form>`;
    const actions = !remoteLoaded ? '<span>กำลังตรวจข้อมูลออนไลน์</span>' : !ready && remote ? '<button class="btn primary" onclick="BarberCloud.useRemote()">ใช้ข้อมูลออนไลน์บนเครื่องนี้</button>' : !ready && remote === null ? '<button class="btn primary" onclick="BarberCloud.uploadFirst()">นำข้อมูลเครื่องนี้ขึ้นออนไลน์ครั้งแรก</button>' : '<button class="btn" onclick="BarberCloud.retry()">ซิงก์อีกครั้ง</button>';
    return `<section style="max-width:640px"><h2>บัญชีร้าน</h2><p role="status">${esc(status)}</p>${problem ? `<p class="bad" role="alert">${esc(problem)}</p>` : ''}${user ? `<p>${esc(user.email)}</p><div class="actions">${busy ? '<span>กำลังบันทึกออนไลน์…</span>' : actions}<button class="btn" onclick="BarberCloud.logout()" ${busy || pending ? 'disabled' : ''}>ออกจากระบบ</button></div>${pending ? '<p>มีข้อมูลรอซิงก์ในเครื่องนี้</p><button class="btn" onclick="saveBackupAs()">สำรองข้อมูลเครื่องนี้</button><button class="btn" onclick="BarberCloud.useRemote()">ใช้ข้อมูลออนไลน์แทนรายการที่รอ</button>' : ''}` : login}</section>`;
  }
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'cloudLogin') return;
    event.preventDefault();
    const email = event.target.querySelector('#cloudEmail').value.trim();
    const password = event.target.querySelector('#cloudPassword').value;
    event.target.querySelector('#cloudPassword').value = '';
    busy = true; problem = ''; note('กำลังเข้าสู่ระบบ');
    try { await api.signInWithEmailAndPassword(auth, email, password); }
    catch (_) { problem = 'เข้าสู่ระบบไม่สำเร็จ ตรวจอีเมล รหัสผ่าน และอินเทอร์เน็ต'; }
    finally { busy = false; note(user ? 'เข้าสู่ระบบแล้ว' : 'ยังไม่ได้เข้าสู่ระบบ'); flush(); receiveLatest(); }
  });
  const originalSave = save;
  save = function (message) {
    if (ready) {
      try { persistPending({ uid: OWNER, base: pending ? pending.base : copy(base), data: copy(state) }); }
      catch (_) { alert('บันทึกรายการรอซิงก์ไม่ได้ กรุณาสำรองข้อมูลและเพิ่มพื้นที่ว่าง'); return; }
    }
    originalSave(ready ? 'บันทึกในเครื่องแล้ว กำลังซิงก์' : message);
    if (ready) flush();
  };
  // Snapshot restoration bypasses save in the original app.
  const originalRestore = restoreLatestIDBSnapshot;
  restoreLatestIDBSnapshot = async function () {
    const before = copy(state);
    await originalRestore();
    if (ready && !equal(before, state)) save('กู้คืนข้อมูลแล้ว');
  };
  async function flush() {
    if (!ready || !user || !remoteLoaded || !pending || busy || problem) return;
    busy = true;
    const job = copy(pending);
    note('กำลังซิงก์');
    try {
      const result = await api.runTransaction(reference, current => {
        if (!current) return;
        const combined = merge(job.base, job.data, decode(current));
        return { payload: JSON.stringify(combined), revision: current.revision + 1 };
      }, { applyLocally: false });
      if (!result.committed) throw Error('ข้อมูลออนไลน์ยังไม่พร้อม');
      const saved = decode(result.snapshot.val());
      const latest = merge(job.data, state, saved);
      apply(latest);
      persistPending(equal(latest, saved) ? null : { uid: OWNER, base: saved, data: latest });
      rememberBase(saved);
      note(pending ? 'มีรายการรอซิงก์' : 'ซิงก์เรียบร้อย');
    } catch (error) {
      problem = error.code === 'sync/conflict' ? 'มีการแก้ข้อมูลเดียวกันจากอีกเครื่อง รายการในเครื่องนี้ยังอยู่ กรุณาสำรองก่อนเลือกใช้ข้อมูลออนไลน์' : 'ซิงก์ไม่สำเร็จ ข้อมูลยังอยู่ในเครื่อง กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
      note('ยังไม่ซิงก์');
    } finally { busy = false; if (!editing()) render(); }
    if (pending && !problem) flush();
  }
  window.BarberCloud = {
    async retry() { problem = ''; await flush(); },
    async useRemote() {
      if (busy || !user || !remote) return;
      if (!confirm('สำรองข้อมูลเครื่องนี้ไว้ แล้วใช้ข้อมูลออนไลน์แทนข้อมูลที่แสดงบนเครื่องนี้หรือไม่?')) return;
      backupLocal(); apply(decode(remote)); persistPending(null); ready = true; problem = ''; note('ซิงก์เรียบร้อย');
    },
    async uploadFirst() {
      if (busy || !user || !remoteLoaded || remote) return;
      if (!confirm('นำรายการงาน ช่าง รายรับ รายจ่าย และการตั้งค่าของเครื่องนี้ไปเก็บใน Firebase ของร้าน เพื่อใช้ร่วมกันทุกเครื่องหรือไม่?')) return;
      backupLocal(); busy = true;
      try {
        const data = valid(copy(state));
        const result = await api.runTransaction(reference, current => current === null ? { payload: JSON.stringify(data), revision: 1 } : undefined, { applyLocally: false });
        if (!result.committed) throw Error('ข้อมูลออนไลน์ถูกสร้างจากเครื่องอื่นแล้ว');
        const latest = copy(state);
        apply(latest); rememberBase(data); ready = true;
        if (!equal(latest, data)) persistPending({ uid: OWNER, base: data, data: latest });
        problem = ''; note('นำข้อมูลขึ้นออนไลน์แล้ว');
      } catch (_) { problem = 'นำข้อมูลขึ้นออนไลน์ไม่สำเร็จ กรุณาตรวจสถานะแล้วลองใหม่'; }
      finally { busy = false; render(); flush(); }
    },
    async logout() { if (busy || pending) return; await api.signOut(auth); ready = false; localStorage.removeItem(LINK); render(); },
  };
  try {
    const [appApi, authApi, databaseApi] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js')
    ]);
    api = { ...authApi, ...databaseApi };
    const app = appApi.initializeApp(window.BARBER_FIREBASE_CONFIG);
    auth = api.getAuth(app); db = api.getDatabase(app);
    api.onAuthStateChanged(auth, async account => {
      unsubscribe?.(); user = null; remote = null; remoteLoaded = false;
      if (!account) { note('ยังไม่ได้เข้าสู่ระบบ'); return; }
      if (account.uid !== OWNER) { await api.signOut(auth); problem = 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลร้าน'; note('เข้าใช้งานไม่ได้'); return; }
      user = account; reference = api.ref(db, `shops/${OWNER}`);
      unsubscribe = api.onValue(reference, snapshot => {
        remote = snapshot.val(); remoteLoaded = true;
        if (pending) flush();
        else receiveLatest();
        if (problem) { note('ยังไม่ซิงก์'); return; }
        note(ready ? pending ? 'มีรายการรอซิงก์' : 'ซิงก์เรียบร้อย' : remote ? 'พบข้อมูลออนไลน์ เลือกใช้ข้อมูลออนไลน์บนเครื่องนี้' : 'ยังไม่มีข้อมูลออนไลน์ เลือกเครื่องที่มีข้อมูลครบเพื่อนำขึ้นครั้งแรก');
      }, () => { problem = 'เข้าถึงฐานข้อมูลไม่ได้ กรุณาตรวจสิทธิ์และอินเทอร์เน็ต'; note('เชื่อมต่อไม่สำเร็จ'); });
    });
    setInterval(receiveLatest, 2000);
    window.addEventListener('online', () => { problem = ''; flush(); });
    note('พร้อมเข้าสู่ระบบ');
  } catch (_) { problem = 'โหลดบริการซิงก์ไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วรีเฟรช'; note('ข้อมูลในเครื่องยังใช้งานได้'); }
  render();
})();
