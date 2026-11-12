import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cancelApplication, getMyApplications } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { ConfirmBox, ErrorBox, Loading, btnGhost } from '../components/ui';
import { APP_STATUS, HOUSING, appBadge, dateTH } from '../utils';

// รายการคำขอของฉัน + ปุ่มยกเลิก (เฉพาะที่ยัง pending)
function MyApplications() {
  const { token } = useAuth();
  const location = useLocation();
  const [apps, setApps] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [target, setTarget] = useState(null);          // คำขอที่กำลังจะยกเลิก (เปิดกล่องยืนยัน)
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

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

  async function confirmCancel() {
    setBusy(true);
    setActionError(null);
    try {
      await cancelApplication(target.id, token);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      setTarget(null);
      setReloadKey(k => k + 1);                         // โหลดใหม่เสมอ จะได้เห็นสถานะจริงจาก server
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">คำขอรับเลี้ยงของฉัน</h1>
      {location.state?.submitted && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          ส่งคำขอรับเลี้ยง {location.state.submitted} เรียบร้อยแล้ว สถานะ: รอตรวจสอบ
        </p>
      )}
      {actionError && <p className="mt-4 text-sm text-red-600" role="alert">{actionError}</p>}

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && apps.length === 0 && (
        <p className="py-16 text-center text-slate-400">
          ยังไม่มีคำขอรับเลี้ยง <Link to="/pets" className="text-emerald-600 hover:underline">ไปค้นหาสัตว์เลี้ยง</Link>
        </p>
      )}
      {status === 'success' && apps.length > 0 && (
        <ul className="mt-6 space-y-4">
          {apps.map(a => (
            <li key={a.id} className="rounded-xl border border-emerald-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium text-slate-900"><Link to={`/pets/${a.petId}`} className="hover:text-emerald-600">{a.petName}</Link></h2>
                <span className={'rounded-full px-2 py-0.5 text-xs ' + appBadge[a.status]}>{APP_STATUS[a.status]}</span>
              </div>
              <p className="text-xs text-slate-400">ส่งเมื่อ {dateTH(a.createdAt)} | ที่อยู่อาศัย: {HOUSING[a.housingType]}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.reason}</p>
              {a.adminNote && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><strong>หมายเหตุจากผู้ดูแล:</strong> {a.adminNote}</p>}
              {a.status === 'approved' && (
                <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">คำขอได้รับการอนุมัติแล้ว กรุณารอผู้ดูแลติดต่อเพื่อนัดรับสัตว์เลี้ยง</p>
              )}
              {a.status === 'pending' && (
                <button onClick={() => setTarget(a)} className={btnGhost + ' mt-3'}>ยกเลิกคำขอ</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmBox open={Boolean(target)} busy={busy} title={`ยกเลิกคำขอรับเลี้ยง ${target?.petName} ?`}
                  confirmText="ยืนยันยกเลิก" onConfirm={confirmCancel} onCancel={() => setTarget(null)}>
        <p>เมื่อยกเลิกแล้ว คุณสามารถส่งคำขอใหม่สำหรับสัตว์ตัวนี้ได้ถ้ายังเปิดรับอยู่</p>
      </ConfirmBox>
    </div>
  );
}

export default MyApplications;
