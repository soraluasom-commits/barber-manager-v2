// Extra structural preflight for the existing Unified Backup engine. No writes,
// no entitlement import, and no financial calculation or ID rewriting.
(()=>{'use strict';
 const labels={staff:'ช่าง',staffDirectory:'ทะเบียนช่าง',entries:'บันทึกงาน',expenses:'รายจ่าย',funds:'รายรับ',attendance:'วันทำงานและวันหยุด',entryAudit:'ประวัติแก้ไข'};
 function validate(shop){
  if(!shop||typeof shop!=='object'||Array.isArray(shop))return;
  for(const kind of ['staff','staffDirectory','entries','expenses','funds','attendance','entryAudit']){
   if(!Array.isArray(shop[kind]))continue;const ids=new Set();for(const row of shop[kind]){
    if(!row||typeof row!=='object')continue;
    if(row.id!==undefined&&row.id!==null){
     if(!(typeof row.id==='string'&&row.id.length>0&&row.id.length<=500||Number.isSafeInteger(row.id)&&row.id>=0))throw Error('รหัสรายการในไฟล์สำรองไม่ถูกต้อง: '+labels[kind]);
     const id=String(row.id);if(ids.has(id))throw Error('พบรหัสรายการซ้ำในไฟล์สำรอง: '+labels[kind]);ids.add(id);
    }
   }
  }
  for(const kind of ['entries','expenses','funds','attendance'])for(const row of Array.isArray(shop[kind])?shop[kind]:[]){
   if(!row||typeof row!=='object')continue;
   const date=row.date;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+new Date(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('วันที่ในไฟล์สำรองไม่ถูกต้อง: '+labels[kind]);
   if(kind!=='attendance'&&(typeof row.amount!=='number'&&typeof row.amount!=='string'||typeof row.amount==='string'&&!row.amount.trim()||!Number.isFinite(Number(row.amount))))throw Error('ไม่พบยอดเงินที่ถูกต้องในไฟล์สำรอง: '+labels[kind]);
  }
 }
 window.SubscriptionBackupValidation=Object.freeze({validate});
})();
