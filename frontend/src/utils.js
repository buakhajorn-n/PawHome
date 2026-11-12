// ตัวช่วยแสดงผล: ป้ายภาษาไทยของค่าในฐานข้อมูล และจัดรูปแบบอายุ/วันที่
export const SPECIES = { dog: 'สุนัข', cat: 'แมว', other: 'สัตว์อื่น ๆ' };
export const SEX = { male: 'เพศผู้', female: 'เพศเมีย', unknown: 'ไม่ระบุเพศ' };
export const PET_STATUS = { available: 'พร้อมรับเลี้ยง', reserved: 'จองแล้ว', adopted: 'มีบ้านแล้ว', hidden: 'ซ่อนประกาศ' };
export const APP_STATUS = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว รอส่งมอบ',
  rejected: 'ไม่ผ่านการอนุมัติ',
  cancelled: 'ยกเลิกแล้ว',
  completed: 'รับเลี้ยงเรียบร้อย',
};
export const HOUSING = { house: 'บ้าน', condo: 'คอนโด', apartment: 'อพาร์ตเมนต์/หอพัก', other: 'อื่น ๆ' };
export const EMOJI = { dog: '🐶', cat: '🐱', other: '🐰' };

export const petBadge = {
  available: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700',
  adopted: 'bg-slate-200 text-slate-600',
  hidden: 'bg-slate-100 text-slate-500',
};
export const appBadge = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  completed: 'bg-emerald-100 text-emerald-700',
};

export function formatAge(months) {
  const m = Number(months) || 0;
  if (m < 1) return 'ไม่ถึง 1 เดือน';
  if (m < 12) return `${m} เดือน`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  return r ? `${y} ปี ${r} เดือน` : `${y} ปี`;
}

export function dateTH(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
