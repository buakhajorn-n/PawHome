import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { btnPrimary, inputClass } from '../components/ui';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing');             // 'typing' | 'submitting'
  const location = useLocation();
  const from = location.state?.from;                          // ProtectedRoute ส่งมาบอกว่าเดิมจะไปไหน
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const member = await login(email, password);           // POST /api/auth/login + จำ token
      navigate(from || (member.role === 'admin' ? '/admin' : '/me'), { replace: true });
    } catch (err) {
      setError(err.message);                                  // ข้อความ 401 จาก server
      setStatus('typing');
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">เข้าสู่ระบบ</h1>
      <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบเพื่อส่งคำขอรับเลี้ยงและติดตามสถานะ</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล" required
          aria-label="อีเมล" autoComplete="email" className={inputClass} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน" required
          aria-label="รหัสผ่าน" autoComplete="current-password" className={inputClass} />
        <button type="submit" disabled={status === 'submitting'} className={btnPrimary + ' w-full'}>
          {status === 'submitting' ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </form>

      <p className="mt-6 text-sm text-slate-500">
        ยังไม่มีบัญชี? <Link to="/register" state={location.state} className="text-emerald-600 hover:underline">สมัครสมาชิก</Link>
      </p>
    </div>
  );
}

export default Login;
