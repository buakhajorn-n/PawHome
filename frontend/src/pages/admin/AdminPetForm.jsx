import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPet, getAdminPet, updatePet } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBox, Field, Loading, btnPrimary, inputClass } from '../../components/ui';
import { SEX, SPECIES } from '../../utils';

const EMPTY = {
  name: '', species: 'dog', breed: '', ageMonths: '0', sex: 'unknown', description: '',
  healthStatus: '', vaccinated: false, sterilized: false, imageUrl: '', status: 'available',
};

export function validatePetForm(f) {
  const errors = {};
  if (!f.name.trim()) errors.name = 'กรุณากรอกชื่อ';
  const age = Number(f.ageMonths);
  if (!Number.isInteger(age) || age < 0 || age > 480) errors.ageMonths = 'อายุ (เดือน) ต้องเป็นจำนวนเต็ม 0–480';
  if (f.imageUrl.trim() && !/^https?:\/\//i.test(f.imageUrl.trim())) errors.imageUrl = 'ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://';
  return errors;
}

// ฟอร์มเดียวใช้ทั้งเพิ่ม (/admin/pets/new) และแก้ไข (/admin/pets/:id)
function AdminPetForm() {
  const { id } = useParams();
  const isNew = !id;
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loadStatus, setLoadStatus] = useState(isNew ? 'success' : 'loading');
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return undefined;
    let ignore = false;
    async function load() {
      setLoadStatus('loading');
      try {
        const p = await getAdminPet(id, token);
        if (!ignore) { setForm({ ...p, ageMonths: String(p.ageMonths) }); setLoadStatus('success'); }
      } catch (err) {
        if (!ignore) { setLoadError(err); setLoadStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, isNew, token, reloadKey]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggle = (key) => (e) => setForm({ ...form, [key]: e.target.checked });

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validatePetForm(form);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;

    const body = {
      name: form.name.trim(), species: form.species, breed: form.breed.trim(), ageMonths: Number(form.ageMonths),
      sex: form.sex, description: form.description.trim(), healthStatus: form.healthStatus.trim(),
      vaccinated: form.vaccinated, sterilized: form.sterilized, imageUrl: form.imageUrl.trim(),
    };
    setBusy(true);
    try {
      if (isNew) await createPet({ ...body, status: form.status === 'hidden' ? 'hidden' : 'available' }, token);
      else await updatePet(id, body, token);
      navigate('/admin/pets');
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      setError(err.message);
      setBusy(false);
    }
  }

  if (loadStatus === 'loading') return <Loading />;
  if (loadStatus === 'error') return <ErrorBox error={loadError} onRetry={() => setReloadKey(k => k + 1)} />;

  return (
    <div className="max-w-xl">
      <Link to="/admin/pets" className="text-sm text-slate-500 hover:text-emerald-600">← กลับรายการสัตว์เลี้ยง</Link>
      <h2 className="mb-4 mt-2 text-xl font-semibold text-slate-900">{isNew ? 'เพิ่มสัตว์เลี้ยง' : `แก้ไข ${form.name}`}</h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="ชื่อ" error={errors.name}><input value={form.name} onChange={set('name')} className={inputClass} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชนิด" error={errors.species}>
            <select value={form.species} onChange={set('species')} className={inputClass}>
              {Object.entries(SPECIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="เพศ" error={errors.sex}>
            <select value={form.sex} onChange={set('sex')} className={inputClass}>
              {Object.entries(SEX).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="สายพันธุ์" error={errors.breed}><input value={form.breed} onChange={set('breed')} className={inputClass} /></Field>
          <Field label="อายุ (เดือน)" error={errors.ageMonths}><input type="number" min="0" value={form.ageMonths} onChange={set('ageMonths')} className={inputClass} /></Field>
        </div>
        <Field label="รายละเอียด / นิสัย" error={errors.description}><textarea rows={3} value={form.description} onChange={set('description')} className={inputClass} /></Field>
        <Field label="สุขภาพ" error={errors.healthStatus}><input value={form.healthStatus} onChange={set('healthStatus')} className={inputClass} /></Field>
        <div className="flex gap-6 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.vaccinated} onChange={toggle('vaccinated')} /> ฉีดวัคซีนแล้ว</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.sterilized} onChange={toggle('sterilized')} /> ทำหมันแล้ว</label>
        </div>
        <Field label="ลิงก์รูปภาพ" error={errors.imageUrl} hint="เว้นว่างได้ ระบบจะวาดภาพตามประเภท สายพันธุ์ และอายุให้แทน"><input value={form.imageUrl} onChange={set('imageUrl')} className={inputClass} /></Field>
        {isNew && (
          <Field label="สถานะเริ่มต้น">
            <select value={form.status} onChange={set('status')} className={inputClass}>
              <option value="available">พร้อมรับเลี้ยง</option>
              <option value="hidden">ซ่อนประกาศ</option>
            </select>
          </Field>
        )}
        <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
    </div>
  );
}

export default AdminPetForm;
