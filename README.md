# PawHome – ระบบรับเลี้ยงสัตว์

| ส่วน | เทคโนโลยี | ที่ deploy |
|---|---|---|
| Frontend (`frontend/`) | React (CRA) + Tailwind + Jest | Vercel |
| Backend (`backend/`) | Go `net/http` + pgx + JWT | Render |
| Database | PostgreSQL | Supabase |

เส้นทางข้อมูล: **เบราว์เซอร์ (Vercel) → Go API (Render) → Postgres (Supabase)**
ฐานข้อมูลเปิด RLS ไว้และไม่มี policy จึงเข้าถึงได้ผ่าน Go API เท่านั้น (anon key อ่านตารางไม่ได้)

## 1) Supabase
1. สร้างโปรเจกต์ แล้วเปิด **SQL Editor** รัน `backend/schema.sql` ตามด้วย `backend/seed.sql` (ข้อมูลตัวอย่าง 6 ตัว)
2. กด **Connect** → เลือก **Session pooler** → คัดลอก connection string (ใช้เป็น `DATABASE_URL`)
   ห้ามใช้ Direct connection เพราะ Render เข้าไม่ถึง (IPv6)

## 2) Render (Backend)
1. New → **Blueprint** เลือก repo นี้ (ใช้ `render.yaml`) หรือสร้าง Web Service เอง: Runtime Go, Root Directory `backend`, Build `go build -o app .`, Start `./app`, Health check `/api/health`
2. ตั้ง Environment Variables

| ชื่อ | ค่า |
|---|---|
| `DATABASE_URL` | Session pooler URI จาก Supabase |
| `JWT_SECRET` | สุ่มอย่างน้อย 32 ตัวอักษร (Blueprint สร้างให้เอง) |
| `ALLOWED_ORIGINS` | โดเมน Vercel เช่น `https://pawhome.vercel.app` (**ไม่มี `/` ท้าย**, คั่นหลายโดเมนด้วยจุลภาค) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | บัญชี admin ที่ระบบสร้างให้ตอนเริ่มเซิร์ฟเวอร์ (รหัสผ่านอย่างน้อย 8 ตัว) |

> แพ็กเกจฟรีของ Render หลับเมื่อไม่มีคนใช้ การเรียกครั้งแรกจะช้าประมาณ 30–50 วินาที

## 3) Vercel (Frontend)
1. Import repo, ตั้ง **Root Directory = `frontend`** (Framework: Create React App)
2. ตั้ง Environment Variable `REACT_APP_API_URL` = URL ของ Render เช่น `https://pawhome-api.onrender.com`
3. Deploy (`vercel.json` มี rewrite ให้ React Router ทำงานเมื่อ refresh)
4. นำโดเมน Vercel ไปใส่ `ALLOWED_ORIGINS` ที่ Render แล้ว redeploy backend

## รันในเครื่อง
```bash
# Backend
cd backend
cp .env.example .env     # ใส่ DATABASE_URL, JWT_SECRET, ADMIN_*
go mod tidy
go run .                 # http://localhost:8080

# Frontend (อีกเทอร์มินัล)
cd frontend
npm install
npm start                # http://localhost:3000  (proxy /api → :8080)
```

## ทดสอบ
```bash
cd backend && go vet ./... && go test ./...
cd frontend && npm test -- --watchAll=false
```

## สิทธิ์การใช้งาน
- **Guest**: ดูหน้าแรก ค้นหา/ดูรายละเอียดสัตว์ สมัคร/เข้าสู่ระบบ
- **Member**: ส่งคำขอรับเลี้ยง ดู/ยกเลิกคำขอ (เฉพาะ pending) แก้โปรไฟล์ เปลี่ยนรหัสผ่าน
- **Admin**: Dashboard, จัดการสัตว์เลี้ยง, อนุมัติ/ปฏิเสธ/ยืนยันส่งมอบคำขอ

กฎสำคัญ: สัตว์ที่ถูกอนุมัติแล้วอนุมัติให้ผู้ขอคนอื่นไม่ได้ (ตรวจใน transaction + unique index ใน DB), ผู้ใช้ส่งคำขอ pending ซ้ำสำหรับสัตว์ตัวเดิมไม่ได้, เมื่อส่งมอบสำเร็จคำขออื่นของตัวนั้นถูกปฏิเสธอัตโนมัติ

## API (JSON camelCase, error: `{"error":{"code","message","field?"}}`, list: `{"items":[...]}`)
Public: `GET /api/health`, `POST /api/auth/register|login`, `GET /api/pets`, `GET /api/pets/{id}`
Login: `GET /api/auth/me`, `PATCH /api/auth/profile|password`
Member: `POST /api/pets/{id}/applications`, `GET /api/me/applications`, `PATCH /api/me/applications/{id}/cancel`
Admin: `GET /api/admin/dashboard`, `GET|POST /api/admin/pets`, `GET|PATCH /api/admin/pets/{id}`, `PATCH /api/admin/pets/{id}/status`, `GET /api/admin/applications`, `PATCH /api/admin/applications/{id}/review|complete`
