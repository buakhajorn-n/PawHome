import { useEffect, useState } from 'react';
import { completeApplication, getAdminApplications, reviewApplication } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmBox, ErrorBox, Loading, btnDanger, btnPrimary, inputClass } from '../../components/ui';
import { APP_STATUS, HOUSING, appBadge, dateTH } from '../../utils';

const TABS = [['pending', 'รอตรวจสอบ'], ['approved', 'อนุมัติแล้ว'], ['completed', 'สำเร็จ'], ['rejected', 'ไม่ผ่าน'], ['cancelled', 'ยกเลิก'], ['', 'ทั้งหมด']];
const ACTION_TEXT = {
  approve: { title: 'อนุมัติคำขอนี้?', ok: 'อนุมัติ', hint: 'สัตว์เลี้ยงจะเปลี่ยนเป็น "จองแล้ว" และอนุมัติผู้ขอรายอื่นไม่ได้' },
  reject: { title: 'ปฏิเสธคำขอนี้?', ok: 'ปฏิเสธ', hint: 'ผู้ขอจะเห็นหมายเหตุที่คุณกรอก' },
  complete: { title: 'ยืนยันส่งมอบสัตว์เลี้ยง?', ok: 'ยืนยันส่งมอบ', hint: 'สัตว์เลี้ยงจะเปลี่ยนเป็น "มีบ้านแล้ว" และคำขออื่นของตัวนี้จะถูกปฏิเสธอัตโนมัติ' },
};

function AdminApplications() {
  const { token } = useAuth();
  const [tab, setTab] = useState('pending');
  const [apps, setApps] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState(null);       // { app, action }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getAdminApplications(tab, token);
        if (!ignore) { setApps(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [tab, token, reloadKey]);

  function ask(app, action) { setPending({ app, action }); setNote(''); setActionError(null); }

  async function confirm() {
    setBusy(true);
    setActionError(null);
    try {
      if (pending.action === 'complete') await completeApplication(pending.app.id, token);
      else await reviewApplication(pending.app.id, pending.action, note.trim(), token);
      setPending(null);
    } catch (err) {
      setActionError(err.message);                    // 409 เช่น สัตว์ถูกอนุมัติให้คนอื่นไปแล้ว
    } finally {
      setBusy(false);
      setReloadKey(k => k + 1);
    }
  }

  const info = pending && ACTION_TEXT[pending.action];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <button key={v || 'all'} onClick={() => setTab(v)}
            className={'rounded-full px-3 py-1 text-sm ' + (tab === v ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>{l}</button>
        ))}
      </div>

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && apps.length === 0 && <p className="py-12 text-center text-slate-400">ไม่มีคำขอในหมวดนี้</p>}
      {status === 'success' && (
        <ul className="space-y-4">
          {apps.map(a => (
            <li key={a.id} className="rounded-xl border border-emerald-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-slate-900">{a.petName} <span className="text-sm font-normal text-slate-400">← {a.applicantName}</span></h3>
                  <p className="text-xs text-slate-400">{a.applicantEmail} | โทร {a.contactPhone} | ส่งเมื่อ {dateTH(a.createdAt)}</p>
                </div>
                <span className={'rounded-full px-2 py-0.5 text-xs ' + appBadge[a.status]}>{APP_STATUS[a.status]}</span>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                <div><dt className="inline font-medium">เหตุผล: </dt><dd className="inline whitespace-pre-wrap">{a.reason}</dd></div>
                <div><dt className="inline font-medium">ที่อยู่อาศัย: </dt><dd className="inline">{HOUSING[a.housingType]}</dd> | เคยเลี้ยง: {a.hasExperience ? 'เคย' : 'ไม่เคย'} | มีสัตว์เลี้ยงอื่น: {a.hasOtherPets ? 'มี' : 'ไม่มี'}</div>
                <div><dt className="inline font-medium">แนวทางดูแล: </dt><dd className="inline whitespace-pre-wrap">{a.carePlan}</dd></div>
                {a.adminNote && <div className="text-slate-500"><dt className="inline font-medium">หมายเหตุ: </dt><dd className="inline">{a.adminNote}</dd></div>}
              </dl>
              <div className="mt-3 flex gap-2">
                {a.status === 'pending' && (<>
                  <button onClick={() => ask(a, 'approve')} className={btnPrimary}>อนุมัติ</button>
                  <button onClick={() => ask(a, 'reject')} className={btnDanger}>ปฏิเสธ</button>
                </>)}
                {a.status === 'approved' && <button onClick={() => ask(a, 'complete')} className={btnPrimary}>ยืนยันส่งมอบ</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmBox open={Boolean(pending)} busy={busy} title={info?.title} confirmText={info?.ok} onConfirm={confirm} onCancel={() => setPending(null)}>
        <p>{pending && `${pending.app.petName} — ${pending.app.applicantName}`}</p>
        <p className="mt-1 text-xs text-slate-500">{info?.hint}</p>
        {pending && pending.action !== 'complete' && (
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุถึงผู้ขอ (ไม่บังคับ)"
            aria-label="หมายเหตุ" className={inputClass + ' mt-3'} />
        )}
        {actionError && <p className="mt-2 text-sm text-red-600" role="alert">{actionError}</p>}
      </ConfirmBox>
    </div>
  );
}

export default AdminApplications;
