export function mountLegacyImport(content, host) {
  const picker = content.querySelector('input[data-csp-change="import-json"]');
  const label = picker?.closest('label');
  if (!label) return;

  if (!host.releaseMode && !host.reviewCopy) {
    label.remove();
    return;
  }

  const explanation = label.closest('.card').querySelector('p.muted');
  explanation.textContent = host.reviewCopy
    ? 'เลือกไฟล์ JSON เพื่อตรวจรายการก่อนกู้คืนในสำเนานี้'
    : 'เลือกไฟล์ JSON เพื่อตรวจรายการก่อนยืนยันแทนที่ข้อมูลร้านจริง';
  const chooseFile = document.createElement('button');
  chooseFile.className = 'btn';
  chooseFile.type = 'button';
  chooseFile.textContent = '↑ นำเข้า JSON';
  chooseFile.addEventListener('click', () => {
    picker.value = '';
    picker.click();
  });
  label.replaceWith(chooseFile, picker);

  if (host.releaseMode) {
    for (const action of ['reset-shop', 'restore-snapshot']) {
      content.querySelector('[data-csp-click="' + action + '"]')?.remove();
    }
    const open = document.createElement('a');
    open.className = 'btn';
    open.href = '?review-copy=1#backup';
    open.textContent = 'ทดสอบในสำเนาร้าน';
    chooseFile.before(open);
  }
}
