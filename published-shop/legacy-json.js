export function mountLegacyImport(content, host) {
  const picker = content.querySelector('input[data-csp-change="import-json"]');
  const label = picker?.closest('label');
  if (!label) return;

  const explanation = label.closest('.card').querySelector('p.muted');
  if (host.reviewCopy) {
    explanation.textContent = 'เลือกไฟล์ JSON รุ่นเดิมหรือไฟล์สำรองข้อมูลร้านทั้งหมดเพื่อตรวจรายการก่อนกู้คืนในสำเนานี้';
    const chooseFile = document.createElement('button');
    chooseFile.className = 'btn';
    chooseFile.type = 'button';
    chooseFile.textContent = '↑ นำเข้า JSON';
    chooseFile.addEventListener('click', () => {
      picker.value = '';
      picker.click();
    });
    label.replaceWith(chooseFile, picker);
    return;
  }

  if (host.releaseMode) {
    for (const action of ['reset-shop', 'restore-snapshot']) {
      content.querySelector('[data-csp-click="' + action + '"]')?.remove();
    }
    const open = document.createElement('a');
    open.className = 'btn';
    open.href = '?review-copy=1#backup';
    open.textContent = 'เปิดสำเนาร้านเพื่อนำเข้า JSON';
    label.replaceWith(open);
    explanation.textContent = 'สำรองข้อมูลร้านได้จากหน้านี้ หากต้องการตรวจหรือกู้คืนไฟล์ JSON ให้เปิดสำเนาร้าน';
    return;
  }

  label.remove();
}
