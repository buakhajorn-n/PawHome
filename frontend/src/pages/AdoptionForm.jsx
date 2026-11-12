import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applyForPet, getPet } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { ErrorBox, Field, Loading, btnPrimary, inputClass } from '../components/ui';

// ตรวจฝั่งหน้าเว็บเพื่อบอกผู้ใช้ทันที (server ตรวจซ้ำอีกชั้นเสมอ) คืน object { ชื่อช่อง: ข้อความ }
export function validateAdoption(f) {
  const errors = {};
  if (!/^[0-9+\-\s()]{8,20}$/.test(f.contactPhone.trim())) errors.contactPhone = 'กรุณากรอกเบอร์โทรศัพท์ที่ติดต่อได้';
  if (f.reason.trim().length < 10) errors.reason = 'กรุณาอธิบายเหตุผลที่ต้องการรับเลี้ยง (อย่างน้อย 10 ตัวอักษร)';
  if (!f.housingType) errors.housingType = 'กรุณาเลือกลักษณะที่อยู่อาศัย';
  if (!f.carePlan.trim()) errors.carePlan = 'กรุณาระบุแนวทางการดูแลสัตว์';
  return errors;
}

function AdoptionForm() {
  const { id } = useParams();
  const { token, member } = useAuth();
  const navigate = useNavigate();

  const [pet, setPet] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState({
    contactPhone: member?.phone || '', reason: '', housingType: '',
    hasExperience: false, hasOtherPets: false, carePlan: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing');

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoadStatus('loading');
      try {
        const p = await getPet(id);
        if (!ignore) { setPet(p); setLoadStatus('success'); }
      } catch (err) {
        if (!ignore) { setLoadError(err); setLoadStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, reloadKey]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggle = (key) => (e) => setForm({ ...form, [key]: e.target.checked });

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateAdoption(form);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;      // ไม่ครบ: แจ้งเตือนและไม่ยิง API

    setStatus('submitting');
    try {
      await applyForPet(id, {
        contactPhone: form.contactPhone.trim(), reason: form.reason.trim(), housingType: form.housingType,
        hasExperience: form.hasExperience, hasOtherPets: form.hasOtherPets, carePlan: form.carePlan.trim(),
      }, token);
      navigate('/me/applications', { replace: true, state: { submitted: pet?.name } });
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      setError(err.message);                          // 409 ถูกจองแล้ว / ส่งซ้ำ ฯลฯ ข้อความมาจาก server
      setStatus('typing');
    }
  }

  if (loadStatus === 'loading') return <div className="mx-auto max-w-5xl px-4"><Loading /></div>;
  if (loadStatus === 'error') {
    return <div className="mx-auto max-w-2xl px-4 py-12"><ErrorBox error={loadError} onRetry={() => setReloadKey(k => k + 1)} /></div>;
  }
  if (pet.status !== 'available') {
    return (
      <div className="px-4 py-24 text-center">
        <p className="text-slate-600">{pet.name} ไม่เปิดรับคำขอในขณะนี้ ({pet.status === 'adopted' ? 'มีบ้านแล้ว' : 'ถูกจองแล้ว'})</p>
        <Link to="/pets" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">ดูสัตว์ตัวอื่น</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link to={`/pets/${pet.id}`} className="text-sm text-slate-500 hover:text-emerald-600">← กลับไปหน้า {pet.name}</Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">ขอรับเลี้ยง {pet.name}</h1>
      <p className="text-sm text-slate-500">ผู้ขอ: {member.fullName} ({member.email})</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="เบอร์โทรศัพท์ติดต่อ" error={errors.contactPhone}>
          <input type="tel" value={form.contactPhone} onChange={set('contactPhone')} className={inputClass} />
        </Field>
        <Field label="เหตุผลที่ต้องการรับเลี้ยง" error={errors.reason}>
          <textarea rows={4} value={form.reason} onChange={set('reason')} className={inputClass} />
        </Field>
        <Field label="ลักษณะที่อยู่อาศัย" error={errors.housingType}>
          <select value={form.housingType} onChange={set('housingType')} className={inputClass}>
            <option value="">-- เลือก --</option>
            <option value="house">บ้าน</option>
            <option value="condo">คอนโด</option>
            <option value="apartment">อพาร์ตเมนต์/หอพัก</option>
            <option value="other">อื่น ๆ</option>
          </select>
        </Field>
        <div className="space-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.hasExperience} onChange={toggle('hasExperience')} /> เคยเลี้ยงสัตว์มาก่อน
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.hasOtherPets} onChange={toggle('hasOtherPets')} /> ปัจจุบันมีสัตว์เลี้ยงอยู่แล้ว
          </label>
        </div>
        <Field label="แนวทางการดูแลสัตว์" error={errors.carePlan} hint="เช่น อาหาร การพาไปหาสัตวแพทย์ ผู้ดูแลเมื่อต้องเดินทาง">
          <textarea rows={4} value={form.carePlan} onChange={set('carePlan')} className={inputClass} />
        </Field>

        <button type="submit" disabled={status === 'submitting'} className={btnPrimary + ' w-full'}>
          {status === 'submitting' ? 'กำลังส่งคำขอ...' : 'ส่งคำขอรับเลี้ยง'}
        </button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
    </div>
  );
}

export default AdoptionForm;
