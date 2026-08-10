# Barber Manager V2.0.1 — GitHub Pages Ready

ระบบจัดการร้านตัดผมแบบ Static Web App ใช้ IndexedDB เป็นฐานข้อมูลในเบราว์เซอร์ และรองรับ PWA/Offline

## ฟรีทั้งหมด
- GitHub repository: Public
- GitHub Pages: ใช้สำหรับ static site
- Database: IndexedDB ในเครื่องผู้ใช้
- Backup: IndexedDB snapshots + Export/Import JSON

## หมายเหตุสำคัญ
IndexedDB ไม่ซิงก์ข้อมูลข้ามเครื่องโดยอัตโนมัติ ข้อมูลของแต่ละ browser/device แยกจากกัน

## เปิด GitHub Pages
1. สร้าง Public repository ชื่อ `barber-manager-v2`
2. ใส่ไฟล์ทั้งหมดในโฟลเดอร์นี้ที่ root ของ repository
3. ไปที่ Settings → Pages → Build and deployment → Source = GitHub Actions
4. Push ไป branch `main`
5. Workflow `Deploy Barber Manager to GitHub Pages` จะ deploy ให้อัตโนมัติ
