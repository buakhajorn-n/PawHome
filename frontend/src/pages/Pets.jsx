import { useEffect, useState } from 'react';
import PetGrid from '../components/PetGrid';
import { getPets } from '../api/backend';
import { inputClass } from '../components/ui';

const AGE_GROUPS = [
  ['all', 'ทุกช่วงอายุ', () => true],
  ['baby', 'ไม่เกิน 1 ปี', (m) => m <= 12],
  ['young', '1 - 5 ปี', (m) => m > 12 && m <= 60],
  ['senior', 'มากกว่า 5 ปี', (m) => m > 60],
];

function Pets() {
  const [query, setQuery] = useState('');          // คำค้น (controlled input) กรองในเครื่อง ไม่ยิง API
  const [species, setSpecies] = useState('all');   // ประเภทที่เลือกจากแถบปุ่ม
  const [sex, setSex] = useState('all');
  const [age, setAge] = useState('all');

  const [pets, setPets] = useState([]);            // รายการจาก getPets()
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);   // ตัวนับสำหรับปุ่ม "ลองใหม่"

  useEffect(() => {
    let ignore = false;                            // ธงกันคำตอบเก่ามาทับคำตอบใหม่

    async function load() {
      setStatus('loading');
      try {
        const list = await getPets();
        if (!ignore) {
          setPets(list);
          setStatus('success');
        }
      } catch (err) {
        if (!ignore) {
          setError(err);
          setStatus('error');
        }
      }
    }
    load();

    return () => { ignore = true; };               // cleanup: effect รอบเก่าถูกยกเลิก
  }, [reloadKey]);

  // ค่าที่คำนวณจาก state ไม่ต้องเป็น state เอง
  const q = query.trim().toLowerCase();
  const inAge = AGE_GROUPS.find(([key]) => key === age)[2];
  const shown = pets.filter(p =>
    (species === 'all' || p.species === species) &&
    (sex === 'all' || p.sex === sex) &&
    inAge(p.ageMonths) &&
    (q === '' || p.name.toLowerCase().includes(q) || (p.breed ?? '').toLowerCase().includes(q))
  );

  const chipClass = (active) =>
    'rounded-full border px-3 py-1 text-sm transition ' +
    (active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-200 bg-white text-slate-600 hover:bg-emerald-50');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ค้นหาสัตว์เลี้ยง</h1>
          <p className="text-sm text-slate-500">
            {status === 'success' && `พบ ${shown.length} จาก ${pets.length} ตัว`}
          </p>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="พิมพ์ชื่อหรือสายพันธุ์เพื่อกรอง..."
          className={inputClass + ' md:w-72'} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {[['all', 'ทุกประเภท'], ['dog', 'สุนัข'], ['cat', 'แมว'], ['other', 'สัตว์อื่น ๆ']].map(([key, label]) => (
          <button key={key} onClick={() => setSpecies(key)} className={chipClass(species === key)}>{label}</button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <select value={sex} onChange={(e) => setSex(e.target.value)} aria-label="กรองตามเพศ" className={inputClass + ' w-auto'}>
          <option value="all">ทุกเพศ</option>
          <option value="male">เพศผู้</option>
          <option value="female">เพศเมีย</option>
        </select>
        <select value={age} onChange={(e) => setAge(e.target.value)} aria-label="กรองตามอายุ" className={inputClass + ' w-auto'}>
          {AGE_GROUPS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      <PetGrid pets={shown} status={status} error={error} onRetry={() => setReloadKey(k => k + 1)} />
    </div>
  );
}

export default Pets;
