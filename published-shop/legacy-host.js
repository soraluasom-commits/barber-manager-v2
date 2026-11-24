(() => {
  const original='https://soraluasom-commits.github.io';
  const production=location.origin===original;
  const realReview=location.origin==='http://127.0.0.1:50523';
  const isolatedTest=location.origin==='http://127.0.0.1:50524';
  const copy=realReview||new URLSearchParams(location.search).has('review-copy');
  const acceptedCheck=realReview&&new URLSearchParams(location.search).get('check-copy')==='1';
  if(![production,realReview,isolatedTest].some(Boolean) ||
      !['/barber-manager-v2/','/barber-manager-v2/index.html'].includes(location.pathname))return;
  const owner=window.BARBER_CLOUD_OWNER;
  if(!owner)return;
  const accountId=owner,storeId=acceptedCheck?'barber-v2-auth-check':copy?'barber-v2-review':'barber-v2',scope=accountId+':'+storeId;
  const {equal,copy:clone,merge}=window.BarberCloudMerge;
  const key='barber-v2-session-data:'+scope;
  const tag='barber-manager-active';
  const required=['staff','entries','expenses','funds'];
  let connector,record,account,queue=Promise.resolve(),dirtyError='',started=false,authGeneration=0;
  let workspaceData,screen,notice,form,enter;
  let releaseTab;
  const ready=Promise.withResolvers();
  const serialized=operation=>{
    const next=queue.catch(()=>{}).then(operation);
    queue=next;
    return next;
  };
  const noticeText=()=>copy?'บันทึกในสำเนาของเบราว์เซอร์นี้':dirtyError||
    (record?.dirty?'บันทึกในเครื่องแล้ว · รอซิงก์':'เชื่อมข้อมูลร้านออนไลน์แล้ว');
  function decode(wire) {
    if(!wire || typeof wire.payload!=='string' || !Number.isSafeInteger(wire.revision)||wire.revision<1){
      throw Error('ไม่พบฐานข้อมูลร้านออนไลน์ที่พร้อมใช้งาน');
    }
    const data=JSON.parse(wire.payload);
    if(!required.every(name=>Array.isArray(data[name])))throw Error('โครงสร้างข้อมูลออนไลน์ไม่ตรงกับร้านเดิม');
    return {data,revision:wire.revision};
  }
  function writeLocal(next) {
    localStorage.setItem(key,JSON.stringify(next));
    record=next;
  }
  function requireAccount(){
    if(account?.uid!==owner)throw Error('กรุณาเข้าสู่ระบบด้วยบัญชีร้านเดิม');
  }
  function restoreJournal() {
    const text=localStorage.getItem(key);
    if(!text)return null;
    const loaded=JSON.parse(text);
    if(loaded.scope!==scope||!Number.isSafeInteger(loaded.version)||!required.every(name=>
      Array.isArray(loaded.data?.[name]) && Array.isArray(loaded.base?.[name]))) {
      throw Error('อ่านข้อมูลรอซิงก์ของเครื่องนี้ไม่ได้');
    }
    return loaded;
  }
  function previousClient(remote){
    if(copy || isolatedTest)return remote.data;
    const pending=JSON.parse(localStorage.getItem('barberCloudPendingV1')||'null');
    const linked=JSON.parse(localStorage.getItem('barberCloudBaseV1')||'null');
    const browser=JSON.parse(localStorage.getItem('barberManagerV1Data')||'null');
    if(pending && (pending.uid!==owner || ![pending.base,pending.data].every(d=>required.every(k=>Array.isArray(d?.[k]))))) {
      throw Error('รายการรอซิงก์ของเว็บเดิมต้องตรวจในรุ่นเดิมก่อน');
    }
    if(pending&&!equal(pending.data,remote.data)){
      throw Error('เว็บเดิมมีรายการรอซิงก์ กรุณาเปิดในรุ่นเดิมให้ซิงก์เสร็จก่อน');
    }
    if(linked?.uid===owner && browser && !equal(linked.data,browser) && !equal(browser,remote.data)){
      throw Error('พบข้อมูลในเครื่องที่ยังต่างจากออนไลน์ กรุณาตรวจในเว็บรุ่นเดิมก่อน');
    }
    return remote.data;
  }
  function refreshStatus() {
    if(notice)notice.textContent=noticeText();
    for(const n of document.querySelectorAll('[data-legacy-sync-status]'))n.textContent=noticeText();
  }
  function disconnected() {
    delete document.documentElement.dataset.legacyUnlocked;
    window.OwnerSubscriptionAccess && (window.OwnerSubscriptionAccess.allowed=false);
    if(started)location.replace(location.pathname+location.search);
  }
  async function openAccount(user) {
    const generation=++authGeneration;
    account=null;
    if(!user){disconnected();notice.textContent='เข้าสู่ระบบด้วยบัญชีของร้าน';return;}
    if(user.uid!==owner){
      notice.textContent='บัญชีนี้ไม่ได้รับสิทธิ์เข้าร้าน';
      await connector.logout();
      notice.textContent='บัญชีนี้ไม่ได้รับสิทธิ์เข้าร้าน';
      return;
    }
    account=user;
    try{
      const stored=restoreJournal();
      let online;
      if(!copy || !stored) {
        try {online=decode(await connector.read());}
        catch(error){if(!stored || navigator.onLine)throw error;}
      }
      if(generation!==authGeneration)return;
      requireAccount();
      if(!stored) {
        const source=previousClient(online);
        writeLocal({scope,version:1,base:clone(source),data:clone(source),dirty:false});
      } else if(!copy && online && !stored.dirty && !equal(stored.base,online.data)) {
        writeLocal({...stored,version:stored.version+1,base:clone(online.data),data:clone(online.data)});
      } else record=stored;
      started=true;
      document.documentElement.dataset.legacyUnlocked='';
      ready.resolve();
      scheduleSync();
    } catch (error) {
      account=null;
      notice.textContent=error.message||'เปิดข้อมูลร้านไม่ได้';
    }
  }
  async function flush() {
    requireAccount();
    if(copy || !connector.transact || !navigator.onLine || !record.dirty)return;
    const job=record;
    const result=decode(await connector.transact(wire=>{
      if(account?.uid!==owner || !wire)return undefined;
      const remote=decode(wire);
      const combined=merge(job.base,job.data,remote.data);
      if(equal(combined,remote.data))return wire;
      return { ...wire, payload:JSON.stringify(combined),revision:wire.revision+1 };
    }));
    requireAccount();
    const mergedOtherChanges=!equal(job.data,result.data);
    writeLocal({...job,version:job.version+Number(mergedOtherChanges),base:clone(result.data),data:clone(result.data),dirty:false});
    dirtyError='';
    if(mergedOtherChanges)window.dispatchEvent(new Event('legacy-shop-remote-change'));
  }
  function scheduleSync() {
    if(copy || !record?.dirty)return;
    serialized(flush).catch(error=>{
      dirtyError=error.code==='sync/conflict'
        ? 'พบรายการเดียวกันแก้จากอีกเครื่อง · เก็บรายการรอซิงก์ไว้'
        : 'เก็บรายการรอซิงก์ไว้ · กดซิงก์อีกครั้งเมื่อเชื่อมต่อได้';
    }).finally(refreshStatus);
  }
  async function checkOnline() {
    requireAccount();
    if(copy)return;
    if(record.dirty){scheduleSync();return;}
    const editing=document.getElementById('modal')?.classList.contains('open') ||
      document.querySelector('dialog[open]') || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
    if(editing || !navigator.onLine)return;
    const remote=decode(await connector.read());
    requireAccount();
    if(equal(remote.data,record.data))return;
    // Recheck after the network request so an open editor keeps its original revision.
    if(document.getElementById('modal')?.classList.contains('open') || document.querySelector('dialog[open]') ||
      ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    writeLocal({...record,version:record.version+1,base:clone(remote.data),data:clone(remote.data)});
    window.dispatchEvent(new Event('legacy-shop-remote-change'));
  }
  function showAccount(container) {
    const heading=document.createElement('h2');heading.textContent='บัญชีร้านและซิงก์';
    const email=document.createElement('p');email.textContent=account?.email||'บัญชีร้าน';
    const status=document.createElement('p');status.dataset.legacySyncStatus='';status.setAttribute('role','status');status.textContent=noticeText();
    const actions=document.createElement('div');actions.className='actions';
    const button=(text,handler)=>{
      const element=document.createElement('button');element.type='button';element.className='btn';element.textContent=text;
      element.addEventListener('click',()=>Promise.resolve().then(handler).catch(()=>{status.textContent='ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง';}));
      return element;
    };
    if(!copy)actions.append(button('ซิงก์อีกครั้ง',()=>serialized(checkOnline)));
    actions.append(button('เปลี่ยนรหัสผ่าน',async()=>{
      requireAccount();
      if(!confirm('ส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลบัญชีร้านหรือไม่?'))return;
      await connector.reset(account.email);status.textContent='ส่งลิงก์เปลี่ยนรหัสผ่านแล้ว';
    }),button('ออกจากระบบ',()=>connector.logout()));
    container.append(heading,email,status,actions);
  }
  window.BarberStoreHost=Object.freeze({
    scope,usesLegacyAccount:true,reviewCopy:copy,releaseMode:production&&!copy,
    async readContext(){
      await ready.promise;requireAccount();
      return {accountId,storeId,device:{approved:true},email:account.email};
    },
    async authorize(me){
      requireAccount();
      const matches=me.accountId===accountId && me.storeId===storeId;
      return {canRead:matches,canWrite:matches,expires:Date.now()+5*60*1000};
    },
    async openVault(){
      requireAccount();
      return {accountId,storeId,close(){},
        async snapshot(){requireAccount();return {state:clone(record.data),revision:record.version};},
        async replaceWorkspace(next,expected){
          const result=await serialized(()=>{
            requireAccount();
            if(expected!==record.version)throw Error('LOCAL_REVISION_CONFLICT — ข้อมูลร้านเปลี่ยน กรุณาเปิดรายการใหม่');
            const nextData={...record.data,...workspaceData(next,record.data)};
            if(equal(nextData,record.data))return {revision:record.version};
            writeLocal({...record,version:record.version+1,data:nextData,dirty:!copy});
            return {revision:record.version};
          });
          scheduleSync();refreshStatus();return result;
        }
      };
    },
    showAccount,
    async checkOnline(){return serialized(checkOnline);}
  });
  async function start() {
    screen=document.createElement('main');screen.id='legacy-auth';
    screen.innerHTML='<section class="legacy-sign-in"><img src="./review-logo-transparent.png" alt="Barber Manager"><h1>เข้าสู่ระบบร้าน</h1><form id="legacy-login-form"><label for="legacy-email">อีเมลบัญชีร้าน</label><input id="legacy-email" type="email" autocomplete="username" required><label for="legacy-password">รหัสผ่าน</label><input id="legacy-password" type="password" autocomplete="current-password" required><button class="btn primary" type="submit" disabled>เข้าสู่ระบบ</button></form><p id="legacy-login-status" role="status">กำลังเชื่อมต่อระบบบัญชีเดิม…</p></section>';
    document.body.prepend(screen);
    form=screen.querySelector('form');enter=form.querySelector('button');notice=screen.querySelector('[role="status"]');
    if(copy)screen.querySelector('h1').textContent='เข้าสู่ระบบเพื่อเปิดสำเนาร้าน';
    const lock=await new Promise(resolve=>{
      navigator.locks.request(tag,{ifAvailable:true},lease=>{
        resolve(!!lease);
        if(lease)return new Promise(done=>{releaseTab=done;});
      }).catch(()=>resolve(false));
    });
    if(!lock)throw Error('ร้านเปิดอยู่ในอีกแท็บ กรุณาปิดแท็บนั้นแล้วรีเฟรช');
    if(releaseTab)window.addEventListener('pagehide',releaseTab,{once:true});
    window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
    const adapter=await import(isolatedTest?'./qa-firebase.js':'./legacy-firebase.js');
    ({workspaceData}=await import('./store/workspace-data.js'));
    connector=await adapter.connect(owner,{writable:!copy});
    if(acceptedCheck)await import('./account-copy-check.js');
    form.addEventListener('submit',async event=>{
      event.preventDefault();enter.disabled=true;
      const secret=screen.querySelector('#legacy-password'),email=screen.querySelector('#legacy-email').value.trim();
      const password=secret.value;secret.value='';
      notice.textContent='กำลังเข้าสู่ระบบ…';
      try {await connector.login(email,password);}
      catch {notice.textContent='เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมล รหัสผ่าน และการเชื่อมต่อ';}
      finally {enter.disabled=false;}
    });
    connector.watch(user=>openAccount(user).catch(()=>{notice.textContent='เปิดบัญชีร้านไม่ได้';}));
    enter.disabled=false;
    window.addEventListener('online',scheduleSync);
    setInterval(()=>{if(started&&account)serialized(checkOnline).catch(()=>{});},12000);
  }
  document.addEventListener('DOMContentLoaded',()=>start().catch(error=>{
    if(notice)notice.textContent=error.message||'โหลดระบบบัญชีไม่ได้';
  }),{once:true});
})();
