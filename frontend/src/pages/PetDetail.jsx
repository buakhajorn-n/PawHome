import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPet } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { PetImage } from '../components/PetCard';
import { ErrorBox, Loading, btnPrimary } from '../components/ui';
import { PET_STATUS, SEX, SPECIES, formatAge, petBadge } from '../utils';

function Fact({ label, children }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function PetDetail() {
  const { id } = useParams();
  const { isLoggedIn, isAdmin } = useAuth();
  const [pet, setPet] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const p = await getPet(id);
        if (!ignore) { setPet(p); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, reloadKey]);

  if (status === 'loading') return <div className="mx-auto max-w-5xl px-4"><Loading /></div>;
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        {error.status === 404
          ? <div className="text-center"><p className="text-slate-500">ไม่พบสัตว์ที่ต้องการ</p>
              <Link to="/pets" className="mt-3 inline-block text-sm text-emerald-600 hover:underline">กลับไปค้นหา</Link></div>
          : <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      </div>
    );
  }

  // ปุ่มรับเลี้ยงแสดงต่างกันตามสถานะการล็อกอินและสถานะของสัตว์
  let action;
  if (pet.status !== 'available') {
    action = <button disabled className={btnPrimary}>{pet.status === 'adopted' ? 'มีบ้านแล้ว' : 'ถูกจองแล้ว'}</button>;
  } else if (!isLoggedIn) {
    action = <Link to="/login" state={{ from: `/pets/${pet.id}/adopt` }} className={btnPrimary + ' inline-block'}>สนใจรับเลี้ยง (เข้าสู่ระบบก่อน)</Link>;
  } else if (isAdmin) {
    action = <p className="text-sm text-slate-500">บัญชี admin ส่งคำขอรับเลี้ยงไม่ได้</p>;
  } else {
    action = <Link to={`/pets/${pet.id}/adopt`} className={btnPrimary + ' inline-block'}>สนใจรับเลี้ยง</Link>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link to="/pets" className="text-sm text-slate-500 hover:text-emerald-600">← กลับไปรายการ</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-emerald-100">
          <PetImage pet={pet} className="aspect-square" />
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-semibold text-slate-900">{pet.name}</h1>
            <span className={'rounded-full px-3 py-1 text-xs ' + petBadge[pet.status]}>{PET_STATUS[pet.status]}</span>
          </div>
          <p className="text-slate-500">{SPECIES[pet.species]}{pet.breed && ` · ${pet.breed}`}</p>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Fact label="อายุ">{formatAge(pet.ageMonths)}</Fact>
            <Fact label="เพศ">{SEX[pet.sex]}</Fact>
            <Fact label="วัคซีน">{pet.vaccinated ? '✅ ฉีดแล้ว' : '⏳ ยังไม่ครบ'}</Fact>
            <Fact label="ทำหมัน">{pet.sterilized ? '✅ ทำแล้ว' : '⏳ ยังไม่ได้ทำ'}</Fact>
          </dl>

          <h2 className="mt-6 font-semibold text-slate-900">ประวัติและนิสัย</h2>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{pet.description || 'ยังไม่มีรายละเอียดเพิ่มเติม'}</p>
          <h2 className="mt-4 font-semibold text-slate-900">ข้อมูลสุขภาพ</h2>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{pet.healthStatus || 'ยังไม่มีข้อมูลสุขภาพเพิ่มเติม'}</p>

          <div className="mt-6">{action}</div>
        </div>
      </div>
    </div>
  );
}

export default PetDetail;
