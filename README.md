# Barber Manager V1.10.8 Web

พัฒนาจาก **Barber Manager V1.10.7** โดยคง UI และฟังก์ชันล่าสุดไว้ และปรับสำหรับใช้งานบน GitHub Pages

- Public package ไม่มีข้อมูลร้านจริงฝังในไฟล์
- ข้อมูลหลักเก็บใน browser localStorage
- สำรอง Snapshot ใน IndexedDB สูงสุด 20 ชุด
- Export / Import JSON สำหรับสำรองและย้ายข้อมูลข้ามเครื่อง
- รองรับ PWA / Offline ผ่าน Service Worker
- ใช้งานบน GitHub Pages ได้โดยไม่ต้องใช้ฐานข้อมูลออนไลน์แบบเสียเงิน

> IndexedDB และ localStorage เป็นข้อมูลเฉพาะ browser/device จึงไม่ sync ข้ามเครื่องอัตโนมัติ
