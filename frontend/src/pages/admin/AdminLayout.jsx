import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/admin', label: 'ภาพรวม', end: true },
  { to: '/admin/pets', label: 'จัดการสัตว์เลี้ยง' },
  { to: '/admin/applications', label: 'คำขอรับเลี้ยง' },
];

// โครงหน้าหลังบ้าน: แท็บด้านบน + Outlet แสดงหน้าย่อย
function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">หลังบ้าน</h1>
      <nav className="mt-4 flex gap-2 border-b border-emerald-100">
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) =>
              'border-b-2 px-3 py-2 text-sm ' + (isActive ? 'border-emerald-500 font-medium text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6"><Outlet /></div>
    </div>
  );
}

export default AdminLayout;
