import { useState } from 'react';
import { changePassword, updateProfile } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { Field, btnPrimary, inputClass } from '../components/ui';

function ProfileForm() {
  const { token, member, updateMember } = useAuth();
  const [form, setForm] = useState({ fullName: member.fullName, phone: member.phone || '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);       // { ok: true/false, text }
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (form.fullName.trim().length < 2) found.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (form.phone.trim() && !/^[0-9+\-\s()]{8,20}$/.test(form.phone.trim())) found.phone = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const next = await updateProfile({ fullName: form.fullName.trim(), phone: form.phone.trim() }, token);
      updateMember(next);
      setMessage({ ok: true, text: 'บันทึกข้อมูลเรียบร้อย' });
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      else setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-emerald-100 bg-white p-5">
      <h2 className="font-semibold text-slate-900">ข้อมูลส่วนตัว</h2>
      <Field label="อีเมล"><input value={member.email} disabled className={inputClass + ' bg-slate-50 text-slate-500'} /></Field>
      <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
        <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} />
      </Field>
      <Field label="เบอร์โทรศัพท์" error={errors.phone}>
        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
      </Field>
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      {message && <p className={'text-sm ' + (message.ok ? 'text-emerald-600' : 'text-red-600')} role="status">{message.text}</p>}
    </form>
  );
}

function PasswordForm() {
  const { token } = useAuth();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน';
    if (form.newPassword.length < 8) found.newPassword = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร';
    if (form.confirm !== form.newPassword) found.confirm = 'รหัสผ่านยืนยันไม่ตรงกัน';
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await changePassword(form.currentPassword, form.newPassword, token);
      setForm(empty);
      setMessage({ ok: true, text: 'เปลี่ยนรหัสผ่านเรียบร้อย' });
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      else setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-emerald-100 bg-white p-5">
      <h2 className="font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2>
      <Field label="รหัสผ่านปัจจุบัน" error={errors.currentPassword}>
        <input type="password" value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" className={inputClass} />
      </Field>
      <Field label="รหัสผ่านใหม่" error={errors.newPassword}>
        <input type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="ยืนยันรหัสผ่านใหม่" error={errors.confirm}>
        <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" className={inputClass} />
      </Field>
      <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}</button>
      {message && <p className={'text-sm ' + (message.ok ? 'text-emerald-600' : 'text-red-600')} role="status">{message.text}</p>}
    </form>
  );
}

function Profile() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">โปรไฟล์ของฉัน</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
    </div>
  );
}

export default Profile;
