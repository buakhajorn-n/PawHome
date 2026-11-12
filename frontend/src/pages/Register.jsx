import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Field, btnPrimary, inputClass } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ตรวจฝั่งหน้าเว็บเพื่อบอกผู้ใช้ทันที (server ตรวจซ้ำอีกชั้นเสมอ)
export function validateRegister(f) {
  const errors = {};
  if (f.fullName.trim().length < 2) errors.fullName = 'กรุณากรอกชื่อ-นามสกุล';
  if (!EMAIL_RE.test(f.email.trim())) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (f.phone.trim() && !/^[0-9+\-\s()]{8,20}$/.test(f.phone.trim())) errors.phone = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
  if (f.password.length < 8) errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (f.confirm !== f.password) errors.confirm = 'รหัสผ่านยืนยันไม่ตรงกัน';
  return errors;
}

function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing');
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateRegister(form);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;

    setStatus('submitting');
    try {
      await register({
        email: form.email.trim(), password: form.password,
        fullName: form.fullName.trim(), phone: form.phone.trim(),
      });
      navigate(location.state?.from || '/me', { replace: true });
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });   // 409 อีเมลซ้ำ ฯลฯ ขึ้นใต้ช่องที่ผิด
      else setError(err.message);
      setStatus('typing');
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-3">
        <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
          <input value={form.fullName} onChange={set('fullName')} autoComplete="name" className={inputClass} />
        </Field>
        <Field label="อีเมล" error={errors.email}>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" className={inputClass} />
        </Field>
        <Field label="เบอร์โทรศัพท์ (ไม่บังคับ)" error={errors.phone}>
          <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={inputClass} />
        </Field>
        <Field label="รหัสผ่าน" error={errors.password} hint="อย่างน้อย 8 ตัวอักษร">
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="ยืนยันรหัสผ่าน" error={errors.confirm}>
          <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" className={inputClass} />
        </Field>
        <button type="submit" disabled={status === 'submitting'} className={btnPrimary + ' w-full'}>
          {status === 'submitting' ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>
      <p className="mt-6 text-sm text-slate-500">
        มีบัญชีแล้ว? <Link to="/login" state={location.state} className="text-emerald-600 hover:underline">เข้าสู่ระบบ</Link>
      </p>
    </div>
  );
}

export default Register;
