import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyApplications } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { ErrorBox, Loading } from '../components/ui';
import { APP_STATUS, appBadge, dateTH } from '../utils';

// หน้าแรกของสมาชิก: สรุปจำนวนคำขอตามสถานะ + คำขอล่าสุด + ประวัติการรับเลี้ยงที่สำเร็จ
function MemberHome() {
  const { token, member } = useAuth();
  const [apps, setApps] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getMyApplications(token);
        if (!ignore) { setApps(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  const count = (s) => apps.filter(a => a.status === s).length;
  const history = apps.filter(a => a.status === 'completed');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">สวัสดี {member.fullName} 👋</h1>
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {['pending', 'approved', 'completed', 'rejected'].map(s => (
              <div key={s} className="rounded-xl border border-emerald-100 bg-white p-4 text-center">
                <p className="text-2xl font-semibold text-slate-900">{count(s)}</p>
                <p className="text-xs text-slate-500">{APP_STATUS[s]}</p>
              </div>
            ))}
          </div>

          <div className="mb-3 mt-8 flex items-end justify-between">
            <h2 className="font-semibold text-slate-900">คำขอล่าสุด</h2>
            <Link to="/me/applications" className="text-sm text-emerald-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          {apps.length === 0 ? (
            <p className="py-8 text-center text-slate-400">ยังไม่ได้ส่งคำขอ <Link to="/pets" className="text-emerald-600 hover:underline">เริ่มค้นหาเพื่อนใหม่</Link></p>
          ) : (
            <ul className="space-y-2">
              {apps.slice(0, 3).map(a => (
                <li key={a.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{a.petName}</p>
                    <p className="text-xs text-slate-400">ส่งเมื่อ {dateTH(a.createdAt)}</p>
                  </div>
                  <span className={'rounded-full px-2 py-0.5 text-xs ' + appBadge[a.status]}>{APP_STATUS[a.status]}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-3 mt-8 font-semibold text-slate-900">ประวัติการรับเลี้ยง</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีประวัติการรับเลี้ยงที่สำเร็จ</p>
          ) : (
            <ul className="space-y-2">
              {history.map(a => (
                <li key={a.id} className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm">
                  🏠 <strong>{a.petName}</strong> <span className="text-slate-400">| รับเลี้ยงเมื่อ {dateTH(a.reviewedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default MemberHome;
