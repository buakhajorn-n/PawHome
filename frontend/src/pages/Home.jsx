import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPets } from '../api/backend';
import PetGrid from '../components/PetGrid';

const STEPS = [
  ['🔍', 'ค้นหาเพื่อนใหม่', 'กรองตามประเภท อายุ และเพศ'],
  ['📝', 'ส่งคำขอรับเลี้ยง', 'สมัครสมาชิกแล้วกรอกแบบฟอร์มสั้น ๆ'],
  ['✅', 'รอผลพิจารณา', 'ผู้ดูแลศูนย์ตรวจสอบ คุณติดตามสถานะในเว็บได้'],
  ['🏠', 'รับน้องกลับบ้าน', 'นัดรับและเริ่มชีวิตใหม่ด้วยกัน'],
];

function Home() {
  const [pets, setPets] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getPets({ status: 'available' });
        if (!ignore) { setPets(list.slice(0, 4)); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [reloadKey]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <section className="rounded-2xl bg-emerald-50 px-6 py-12 text-center md:py-16">
        <p className="text-sm font-medium text-emerald-600">ศูนย์พักพิงสัตว์ออนไลน์</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-5xl">Find a Friend.<br />Give Them a Home.</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          PawHome เชื่อมคนที่พร้อมเปิดบ้านกับสัตว์ที่กำลังรอครอบครัว ค้นหา ส่งคำขอ และติดตามผลการรับเลี้ยงได้ในที่เดียว
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/pets" className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600">ดูสัตว์ที่รอรับเลี้ยง</Link>
          <Link to="/register" className="rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">สมัครสมาชิก</Link>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-slate-900">น้อง ๆ ที่รอคุณอยู่</h2>
          <Link to="/pets" className="text-sm text-emerald-600 hover:underline">ดูทั้งหมด</Link>
        </div>
        <PetGrid pets={pets} status={status} error={error} onRetry={() => setReloadKey(k => k + 1)} />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">ขั้นตอนการรับเลี้ยง</h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([icon, title, text], i) => (
            <li key={title} className="rounded-xl border border-emerald-100 bg-white p-4">
              <p className="text-3xl" aria-hidden="true">{icon}</p>
              <h3 className="mt-2 font-medium text-slate-900">{i + 1}. {title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default Home;
