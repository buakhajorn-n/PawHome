import { useEffect, useState } from 'react';
import { getAdminStats } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBox, Loading } from '../../components/ui';

const CARDS = [
  ['totalPets', 'สัตว์ทั้งหมด'],
  ['availablePets', 'พร้อมรับเลี้ยง'],
  ['reservedPets', 'จองแล้ว'],
  ['adoptedPets', 'มีบ้านแล้ว'],
  ['hiddenPets', 'ซ่อนประกาศ'],
  ['totalApplications', 'คำขอทั้งหมด'],
  ['pendingApplications', 'รอตรวจสอบ'],
  ['approvedApplications', 'อนุมัติรอส่งมอบ'],
  ['completedApplications', 'รับเลี้ยงสำเร็จ'],
  ['members', 'สมาชิก'],
];

function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const s = await getAdminStats(token);
        if (!ignore) { setStats(s); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {CARDS.map(([key, label]) => (
        <div key={key} className="rounded-xl border border-emerald-100 bg-white p-4 text-center">
          <p className="text-3xl font-semibold text-slate-900">{stats[key]}</p>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboard;
