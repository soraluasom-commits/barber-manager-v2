(function () {
  'use strict';

  function daysOffReport(staff, entries, month, today, selected = '') {
    const names = [...new Set([...staff.map(s => s.name), ...entries.filter(e => e.date?.startsWith(month + '-')).map(e => e.staff)].filter(Boolean))];
    const [year, monthNumber] = month.split('-').map(Number);
    const count = new Date(year, monthNumber, 0).getDate();
    const worked = new Map();
    for (const entry of entries) {
      if (!entry.date?.startsWith(month + '-')) continue;
      if (!worked.has(entry.date)) worked.set(entry.date, new Set());
      worked.get(entry.date).add(entry.staff);
    }
    const rows = [];
    for (let day = 1; day <= count; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      if (date > today) break;
      const absent = names.filter(name => (!selected || name === selected) && !worked.get(date)?.has(name));
      if (absent.length) rows.push({ date, absent });
    }
    return { names, rows };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { daysOffReport };
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    .staff-days-off { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--line, #ddd); }
    .staff-days-off h2 { font-size: 20px; margin: 0 0 16px; }
    .staff-days-off .toolbar { display: flex; flex-wrap: wrap; gap: 12px; }
    .staff-days-off .field { flex: 1 1 150px; min-width: 0; }
    .staff-days-off select { width: 100%; min-width: 0; }
    .staff-days-off .off-name { color: #b42318; font-weight: 700; overflow-wrap: anywhere; }
    body[data-theme="dark"] .staff-days-off .off-name { color: #ff8a80; }
    .staff-days-off table { width: 100%; min-width: 0; table-layout: fixed; }
    .staff-days-off th:first-child { width: 38%; }
    .staff-days-off td { white-space: normal; overflow-wrap: anywhere; vertical-align: top; }
    .staff-days-off .off-name + .off-name { margin-top: 5px; }
    .staff-days-off .off-summary { margin: 8px 0 16px; }
    .staff-days-off .today-note { display: block; font-size: 12px; }
  `;
  document.head.appendChild(style);

  function daysOffSection() {
    const today = isoToday();
    const year = filters.daysOffYear || today.slice(0, 4);
    const monthNumber = filters.daysOffMonth || today.slice(5, 7);
    const month = `${year}-${monthNumber}`;
    let selected = filters.daysOffStaff || '';
    let report = daysOffReport(state.staff, state.entries, month, today, selected);
    // A removed barber remains available in months containing their work history.
    if (selected && !report.names.includes(selected)) {
      selected = '';
      filters.daysOffStaff = '';
      report = daysOffReport(state.staff, state.entries, month, today);
    }
    const months = Array.from({ length: 12 }, (_, i) => {
      const value = String(i + 1).padStart(2, '0');
      const label = new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(2024, i, 1));
      return `<option value="${value}" ${value === monthNumber ? 'selected' : ''}>${label}</option>`;
    }).join('');
    const total = report.rows.reduce((sum, row) => sum + row.absent.length, 0);
    let body;
    if (!report.names.length) body = '<div class="empty">ยังไม่มีรายชื่อช่างสำหรับเดือนนี้</div>';
    else if (month > today.slice(0, 7)) body = '<div class="empty">ยังไม่ถึงเดือนที่เลือก</div>';
    else if (!report.rows.length) body = '<div class="empty">ไม่พบวันหยุดของช่างที่เลือกในเดือนนี้</div>';
    else body = `<div class="tablewrap"><table><thead><tr><th scope="col">วันที่</th><th scope="col">ช่างที่หยุด</th></tr></thead><tbody>${report.rows.map(row => `<tr data-off-date="${row.date}"><td>${thDate(row.date)}<br><span class="muted">${weekday(row.date)}</span>${row.date === today ? '<span class="muted today-note">วันนี้ · ข้อมูลระหว่างวัน</span>' : ''}</td><td>${row.absent.length ? row.absent.map(name => `<div class="off-name">${esc(name)} · หยุด</div>`).join('') : '<span class="muted">ไม่มีช่างหยุด</span>'}</td></tr>`).join('')}</tbody></table></div>`;
    return `<section class="staff-days-off" aria-labelledby="daysOffHeading"><h2 id="daysOffHeading">วันหยุดช่าง</h2><div class="toolbar"><div class="field"><label for="daysOffStaff">ช่าง</label><select id="daysOffStaff" onchange="filters.daysOffStaff=this.value;render()"><option value="">ช่างทั้งหมด</option>${report.names.map(name => `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div><div class="field"><label for="daysOffMonth">เดือน</label><select id="daysOffMonth" onchange="filters.daysOffMonth=this.value;render()">${months}</select></div><div class="field"><label for="daysOffYear">ปี พ.ศ.</label><select id="daysOffYear" onchange="filters.daysOffYear=this.value;render()">${yearOptions(year)}</select></div></div><div class="off-summary"><b>${monthLabel(month)}</b> · ${selected ? `หยุด ${num(total)} วัน` : `รวม ${num(total)} วัน-คน`}</div>${body}</section>`;
  }

  const originalStaffPage = staffPage;
  staffPage = function () { return originalStaffPage() + daysOffSection(); };
  if (page === 'staff') render();
})();
