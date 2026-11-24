import { workspaceData } from './store/workspace-data.js';
import { recoveryMatches } from './store/recovery-compare.js';
import { recoveryDiagnostics } from './recovery-diagnostics.js';
import { categoryStyles, categoryOptions, manageExpenseCategories } from './store/expense-categories.js';
import { manualFormsPage } from './store/manual-forms/ui.js';
import { mountLegacyImport } from './legacy-json.js?v=20261125.2';

const host=window.BarberStoreHost;
let me,vault,revision,lastVaultState,recoveryWarning='',recoveryWrite=false,recoveryCommit=null,recoveryTarget=null;
const repo=window.LearningRepo, access=window.OwnerSubscriptionAccess;
window.OwnerRestoreMatches=recoveryMatches;
function message(text, cls='notice warning') {
  const p=document.createElement('p');p.className=cls;p.setAttribute('role','alert');p.textContent=text;return p;
}
function showError(error) {
  document.getElementById('content')?.append(message(error.message));
}
async function authorize() {
  if(!host || typeof host.readContext!=='function' || typeof host.authorize!=='function' || typeof host.openVault!=='function')throw Error('ยังไม่ได้เชื่อมบัญชีจากระบบต้นทาง');
  try {
    const context=await host.readContext();
    if(!context?.accountId || !context.storeId || COMMERCIAL_PROFILE!==context.accountId+':'+context.storeId ||
      (me&&(context.accountId!==me.accountId||context.storeId!==me.storeId)))throw Error('STORE_CONTEXT_MISMATCH');
    const claim=await host.authorize(context);
    if(!claim || claim.canRead===false)throw Error('BUSINESS_READ_DENIED');
    access.expires=claim.expires??claim.exp??0;
    access.allowed=claim.canWrite===true && [true,1].includes(context.device?.approved);
    if(!Number.isFinite(access.expires))access.allowed=false;
    me=context;
    return context;
  } catch(error) {
    access.allowed=false;access.expires=0;
    throw error;
  }
}
async function loadData() {
  await authorize();
  vault ||= await host.openVault(me);
  if(vault.accountId!==me.accountId || vault.storeId!==me.storeId)throw Error('VAULT_STORE_MISMATCH');
  const snap=await vault.snapshot();
  revision=snap.revision;lastVaultState=snap.state;
  state=upgrade(workspaceData(snap.state,snap.state));
  let mirror=JSON.stringify(state);
  try {
    const raw=snap.state.workspaceSourceJSON;
    if(raw&&recoveryMatches(JSON.stringify(upgrade(workspaceData(JSON.parse(raw),snap.state))),mirror))mirror=raw;
  } catch { /* Old stores may have only normalized business fields. */ }
  WorkspaceStorage.seed(mirror);
  return mirror;
}
async function refresh() {await loadData();render();}
async function writeBusiness(text) {
  await authorize();
  if(!access.hasWriteLease())throw Error('BUSINESS_WRITE_DENIED');
  if((await repo.read()).journal&&!recoveryWrite)throw Error('RESTORE_PENDING — กรุณาจัดการกู้คืนที่ค้างก่อนบันทึก');
  const result=await vault.replaceWorkspace(JSON.parse(text),revision);
  revision=result.revision;
}
async function recoverShop(target) {
  if(recoveryCommit) {
    if(recoveryTarget!==target)throw Error('RESTORE_IN_PROGRESS');
    return recoveryCommit;
  }
  recoveryTarget=target;
  recoveryCommit=(async()=>{
    await authorize();
    if(!access.hasWriteLease())throw Error('BUSINESS_WRITE_DENIED');
    const value=target===null?JSON.stringify(upgrade(clone(SEED))):target;
    const snap=await vault.snapshot();
    if(snap.state.workspaceSourceJSON&&recoveryMatches(snap.state.workspaceSourceJSON,value)&&
      recoveryMatches(JSON.stringify(upgrade(workspaceData(snap.state,snap.state))),JSON.stringify(upgrade(workspaceData(JSON.parse(value),snap.state))))) {
      WorkspaceStorage.seed(value);
      if(!WorkspaceStorage.busy)WorkspaceStorage.clearFailure();
      return;
    }
    recoveryWrite=true;
    try{WorkspaceStorage.setItem(STORAGE,value);await WorkspaceStorage.flush();}
    finally{recoveryWrite=false;}
  })();
  try{return await recoveryCommit;}
  finally{recoveryCommit=null;recoveryTarget=null;}
}
function bindSaving() {
  save=function(text='บันทึกแล้ว') {
    if(!access.canWrite()) {
      state=upgrade(workspaceData(lastVaultState,lastVaultState));render();
      toast(access.recoveryPending?'กรุณาจัดการกู้คืนที่ค้างก่อนบันทึก':'สิทธิ์ปัจจุบันไม่อนุญาตให้บันทึก');
      return false;
    }
    window.StaffIdentity?.sync(state);
    for(const row of state.staffDirectory||[])row.active=state.staff.some(s=>s.id===row.id&&s.status!=='inactive');
    WorkspaceStorage.setItem(STORAGE,JSON.stringify(state));
    return WorkspaceStorage.flush().then(async()=>{await loadData();toast(text);render();return true;}).catch(async e=>{
      try{await loadData();}catch{state=upgrade(workspaceData(lastVaultState,lastVaultState));WorkspaceStorage.seed(JSON.stringify(state));}
      render();showError(e);return false;
    });
  };
  for(const name of ['save','restore','removeImage','rollback']) {
    const original=repo[name];
    repo[name]=async function(...args){
      await authorize();
      if(!(name==='rollback'?access.hasWriteLease():access.canWrite()))throw Error(access.recoveryPending?'RESTORE_PENDING — กรุณาจัดการกู้คืนที่ค้างก่อน':'BUSINESS_WRITE_DENIED');
      if(name==='restore'&&(await vault.snapshot()).revision!==revision){await loadData();throw Error('LOCAL_REVISION_CONFLICT — ข้อมูลเปลี่ยนจากอีกหน้าต่าง กรุณาเปิดไฟล์ใหม่');}
      try{return await original.apply(this,args);}
      catch(e){
        if(name==='restore'&&e.message.startsWith('LOCAL_REVISION_CONFLICT')){await repo.discardFailedRestore();await loadData();WorkspaceStorage.clearFailure();}
        throw e;
      }
    };
  }
  window.addEventListener('barber-restore-complete',()=>{
    access.recoveryPending=false;recoveryWarning='';WorkspaceStorage.flush().then(refresh).catch(showError);
  });
}
function bindExpenseCategories(){
  categoryStyles();
  const original=window.openExpenseModal;
  window.openExpenseModal=function(id=''){
    original(id);
    const select=document.querySelector('#modalbox select[name=category]');
    if(!select)return;
    categoryOptions(select,state,state.expenses.find(r=>r.id===id)?.category||select.value);
    const manage=document.createElement('button');
    manage.type='button';manage.className='btn expense-category-control';manage.textContent='จัดการหมวดรายจ่าย';
    manage.addEventListener('click',()=>manageExpenseCategories({
      read:async()=>{await WorkspaceStorage.flush();return {state};},
      save:async categories=>{
        await WorkspaceStorage.flush();
        await writeBusiness(JSON.stringify({...state,expenseCategories:categories}));
        await loadData();
      },
      changed:result=>categoryOptions(select,state,result.name)
    }).catch(showError));
    select.parentElement.append(manage);
  };
}
function bindPages(){
  const base=render;
  render=function(){
    base();
    const content=document.getElementById('content');
    if(recoveryWarning)content.prepend(message('มีการกู้คืนค้างอยู่ ข้อมูลเดิมยังอยู่ กรุณาตรวจที่ “สำรองและกู้คืน”'));
    if(page==='backup')mountLegacyImport(content,host,refresh);
    if(page==='learnForms')manualFormsPage(content,{readShop:()=>({shopName:state.shopName,staff:state.staff})}).catch(showError);
    if(page==='sync'){
      const mount=document.createElement('div');
      content.append(mount);
      host.showAccount(mount);
    }
  };
  document.addEventListener('click',event=>{
    const link=event.target.closest('.owner-connected a[href^="#"]');
    if(!link)return;
    const target=({shop:'staff',service:'entry',finance:'income'})[link.hash.slice(1)]||link.hash.slice(1);
    if(PAGES.some(p=>p[0]===target)){event.preventDefault();go(target);}
  });
}
try {
  if(typeof window.UnifiedBackup?.restore!=='function' || typeof window.SubscriptionBackupValidation?.validate!=='function' || typeof repo?.recover!=='function'){
    throw Error('ไฟล์ระบบสำรองและกู้คืนโหลดไม่ครบ กรุณาตรวจไฟล์ที่แตกจาก ZIP');
  }
  const mirror=await loadData();
  WorkspaceStorage.configure(STORAGE,mirror,writeBusiness);
  window.OwnerApplyRecoveredShop=recoverShop;
  const storefront=Object.freeze({flush:()=>WorkspaceStorage.flush(),refresh});
  window.BarberStorefront=storefront;
  // Legacy restore actions use this name for the same shop-only refresh operation.
  window.OwnerWorkspace=storefront;
  bindSaving();
  window.ownerStorageReady();
  try{await repo.recover();}catch(e){recoveryWarning=e.message;}
  access.recoveryPending=!!(await repo.read()).journal;
  if(!access.recoveryPending)recoveryWarning='';
  bindExpenseCategories();bindPages();
  await loadData();
  window.addEventListener('legacy-shop-remote-change',()=>refresh().catch(showError));
  const route=location.hash.slice(1);
  go(PAGES.some(p=>p[0]===route)?route:'dashboard');
  window.storefrontReady=true;
  document.documentElement.inert=false;
  window.dispatchEvent(new Event('barber-storefront-ready'));
}catch(e){
  access.allowed=false;vault?.close();
  document.documentElement.inert=false;
  document.body.replaceChildren(message('เปิดหน้าร้านไม่ได้ · '+e.message));
}
