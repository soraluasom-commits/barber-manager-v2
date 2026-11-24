// Portable business records only. Membership, devices and secrets never import.
export const workspaceFields=['staffDirectory','staff','entries','expenses','funds','monthlySettings','expenseCategories','shopName','attendance','entryAudit','learningNotes','attendanceBackfillBackup'];
export function workspaceData(input,previous={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Array.isArray(input.staff)||!Array.isArray(input.entries))throw Error('ไม่พบโครงสร้างข้อมูลร้าน');
 function safe(v,depth=0){if(depth>24)throw Error('ข้อมูลซ้อนลึกเกินไป');if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k)||/private.?key|secret|license|access.?token|refresh.?token/i.test(k))throw Error('ไฟล์มีข้อมูลสิทธิ์หรือฟิลด์ที่ไม่ปลอดภัย');safe(x,depth+1);}}
 const d={};for(const k of workspaceFields)if(input[k]!==undefined)d[k]=structuredClone(input[k]);safe(d);if(JSON.stringify(d).length>4*1024*1024)throw Error('ข้อมูลร้านเกิน 4 MB');
 for(const k of ['staff','entries','expenses','funds','attendance','entryAudit','expenseCategories','staffDirectory'])if(d[k]!==undefined&&!Array.isArray(d[k]))throw Error('ชนิดข้อมูลไม่ถูกต้อง: '+k);
 for(const k of ['monthlySettings','learningNotes','attendanceBackfillBackup'])if(d[k]!==undefined&&(!d[k]||typeof d[k]!=='object'||Array.isArray(d[k])))throw Error('ชนิดข้อมูลไม่ถูกต้อง: '+k);
 for(const k of ['entries','expenses','funds'])for(const r of d[k]||[]){if(!r||typeof r!=='object'||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(+new Date(r.date+'T00:00:00Z'))||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date||r.amount===null||r.amount===''||!Number.isFinite(Number(r.amount)))throw Error('รายการเงินหรือวันที่ไม่ถูกต้อง');if(k==='entries'&&(typeof r.staff!=='string'||!Number.isSafeInteger(Number(r.heads))||Number(r.heads)<0))throw Error('จำนวนลูกค้าหรือชื่อช่างไม่ถูกต้อง');}
 d.expenses||=[];d.funds||=[];d.attendance||=[];d.monthlySettings||={};d.staffDirectory||=[];
 for(const p of d.staff){if(!p||typeof p.name!=='string'||!p.name.trim())throw Error('ข้อมูลช่างไม่ถูกต้อง');p.status||='active';if(!['active','inactive'].includes(p.status))throw Error('สถานะช่างไม่ถูกต้อง');}
 if(d.staffDirectory.some(r=>!r||typeof r.id!=='string'||!r.id||typeof r.name!=='string'||!Array.isArray(r.aliases)||r.aliases.some(a=>typeof a!=='string'))||new Set(d.staffDirectory.map(r=>r.id)).size!==d.staffDirectory.length)throw Error('ทะเบียนช่างไม่ถูกต้อง');
 const registry=d.staffDirectory,unique=name=>registry.filter(r=>r.name===name||r.aliases.includes(name));
 for(const p of d.staff){if(!p.id){const prior=(previous.staffDirectory||[]).filter(x=>x.name===p.name);p.id=prior.length===1?prior[0].id:crypto.randomUUID();}if(!registry.some(x=>x.id===p.id))registry.push({id:p.id,name:p.name,aliases:[],active:p.status!=='inactive'});}
 if(new Set(d.staff.map(x=>x.id)).size!==d.staff.length)throw Error('รหัสช่างซ้ำ');
 for(const r of registry){r.active=d.staff.some(p=>p.id===r.id&&p.status!=='inactive');r.aliases||=[];}
 const rows=[...d.entries,...d.attendance,...(d.entryAudit||[]).flatMap(e=>[e.before,e.after].filter(Boolean))];
 for(const row of rows){if(!row.staff&&row.staffId)row.staff=registry.find(r=>r.id===row.staffId)?.name;if(row.staffId&&!registry.some(r=>r.id===row.staffId))throw Error('รายการอ้างอิงช่างที่ไม่มีในทะเบียน');if(!row.staffId&&row.staff){let matches=unique(row.staff);if(!matches.length){const old=(previous.staffDirectory||[]).filter(x=>x.name===row.staff);const r={id:old.length===1?old[0].id:crypto.randomUUID(),name:row.staff,aliases:[],active:false};registry.push(r);matches=[r];}if(matches.length===1)row.staffId=matches[0].id;}}
 for(const a of d.attendance)if(!a||typeof a.staff!=='string'||!['work','off','leave','unknown'].includes(a.status)||!/^\d{4}-\d{2}-\d{2}$/.test(a.date||''))throw Error('สถานะวันทำงานไม่ถูกต้อง');
 return d;
}
