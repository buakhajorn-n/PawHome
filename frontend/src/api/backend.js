// ชั้นกลางสำหรับคุยกับ Go API ของทีมเรา ทุกฟังก์ชันเรียกผ่าน apiFetch ตัวเดียว
// endpoint ที่ต้อง login ต้องส่ง token เป็นอาร์กิวเมนต์สุดท้าย (ได้จาก useAuth())

// '' = origin เดียวกับหน้าเว็บ CRA จะ proxy /api ไปที่ http://localhost:8080 ให้ (ตั้งใน package.json)
// ตอน deploy ตั้ง REACT_APP_API_URL=https://pawhome-api.onrender.com ใน Vercel
const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');

// ฟังก์ชันเดียวที่ fetch จริง
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };   // 1) บอก server ว่า body เป็น JSON
  if (token) headers.Authorization = `Bearer ${token}`;      //    และแนบบัตรผ่านถ้ามี

  let res;
  try {
    res = await fetch(BASE + path, {                         // 2) ยิงจริง
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,         //    object ต้องแปลงเป็นข้อความก่อนส่ง
    });
  } catch {
    // ต่อ server ไม่ติดเลย (Render แพ็กเกจฟรีหลับอยู่ ใช้เวลาตื่นประมาณ 30-50 วินาที)
    const err = new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (เซิร์ฟเวอร์อาจกำลังตื่น กรุณารอสักครู่แล้วลองใหม่)');
    err.status = 0;
    throw err;
  }

  if (res.status === 204) return null;                       // 3) ไม่มี body ให้อ่าน

  const data = await res.json()                              //    อ่านคำตอบเป็น JSON
    .catch(() => ({ error: 'server ไม่ได้ตอบเป็น JSON' }));
  if (!res.ok) {                                             // 4) 400 / 401 / 403 / 404 / 409 มาลงตรงนี้
    const err = new Error(data.error?.message ?? data.error ?? `server ตอบกลับ ${res.status}`);
    err.status = res.status;                                 //    แนบเลขไว้ให้หน้าเว็บใช้ต่อ
    err.code = data.error?.code;
    err.field = data.error?.field;                           //    ช่องฟอร์มที่ผิด (ถ้า server บอกมา)
    if (res.status === 401 && token) {
      // ตั๋วหมดอายุหรือไม่ถูกต้อง: บอก AuthContext ให้ออกจากระบบ
      window.dispatchEvent(new Event('pawhome:unauthorized'));
    }
    throw err;
  }
  return data;
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---------- สมาชิก ----------
export function register({ email, password, fullName, phone }) {
  return apiFetch('/api/auth/register', { method: 'POST', body: { email, password, fullName, phone } });
}
export function login(email, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });   // ได้ { token, member }
}
export function getMe(token) {
  return apiFetch('/api/auth/me', { token });
}
export function updateProfile(fields, token) {
  return apiFetch('/api/auth/profile', { method: 'PATCH', body: fields, token });
}
export function changePassword(currentPassword, newPassword, token) {
  return apiFetch('/api/auth/password', { method: 'PATCH', body: { currentPassword, newPassword }, token });
}

// ---------- สัตว์ (สาธารณะ) ----------
export async function getPets(params) {
  const data = await apiFetch(`/api/pets${qs(params)}`);
  return data.items;
}
export function getPet(petId) {
  return apiFetch(`/api/pets/${petId}`);
}

// ---------- คำขอรับเลี้ยง (member) ----------
export function applyForPet(petId, fields, token) {
  return apiFetch(`/api/pets/${petId}/applications`, { method: 'POST', body: fields, token });
}
export async function getMyApplications(token) {
  const data = await apiFetch('/api/me/applications', { token });
  return data.items;
}
export function cancelApplication(applicationId, token) {
  return apiFetch(`/api/me/applications/${applicationId}/cancel`, { method: 'PATCH', token });
}

// ---------- หลังบ้าน (ทุกตัวต้องแนบ token ของ admin ถ้าเป็น member Go ตอบ 403) ----------
export function getAdminStats(token) {
  return apiFetch('/api/admin/dashboard', { token });
}
export async function getAdminPets(token) {
  const data = await apiFetch('/api/admin/pets', { token });
  return data.items;
}
export function getAdminPet(petId, token) {
  return apiFetch(`/api/admin/pets/${petId}`, { token });
}
export function createPet(fields, token) {
  return apiFetch('/api/admin/pets', { method: 'POST', body: fields, token });
}
export function updatePet(petId, fields, token) {
  return apiFetch(`/api/admin/pets/${petId}`, { method: 'PATCH', body: fields, token });
}
export function setPetStatus(petId, status, token) {
  return apiFetch(`/api/admin/pets/${petId}/status`, { method: 'PATCH', body: { status }, token });
}
export async function getAdminApplications(status, token) {
  const data = await apiFetch(`/api/admin/applications${qs({ status })}`, { token });
  return data.items;
}
export function reviewApplication(applicationId, action, note, token) {
  return apiFetch(`/api/admin/applications/${applicationId}/review`, { method: 'PATCH', body: { action, note }, token });
}
export function completeApplication(applicationId, token) {
  return apiFetch(`/api/admin/applications/${applicationId}/complete`, { method: 'PATCH', token });
}
