import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }) =>
  'text-sm transition ' + (isActive ? 'font-medium text-emerald-600' : 'text-slate-500 hover:text-emerald-600');

function Navbar() {
  const { isLoggedIn, isAdmin, member, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="border-b border-emerald-100 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 md:px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight text-emerald-600">
          🐾 PawHome
        </Link>
        <div className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={linkClass}>หน้าแรก</NavLink>
          <NavLink to="/pets" className={linkClass}>ค้นหาสัตว์</NavLink>
          {isLoggedIn && !isAdmin && <NavLink to="/me" end className={linkClass}>หน้าของฉัน</NavLink>}
          {isLoggedIn && !isAdmin && <NavLink to="/me/applications" className={linkClass}>คำขอของฉัน</NavLink>}
          {isAdmin && <NavLink to="/admin" className={linkClass}>หลังบ้าน</NavLink>}
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {isLoggedIn ? (
            <>
              <Link to="/me/profile" className="text-slate-600 hover:text-emerald-600">
                สวัสดี {member?.fullName}
                {isAdmin && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">admin</span>}
              </Link>
              <button onClick={handleLogout} className="text-slate-500 hover:text-emerald-600">ออกจากระบบ</button>
            </>
          ) : (
            <>
              <Link to="/register" className="text-slate-500 hover:text-emerald-600">สมัครสมาชิก</Link>
              <Link to="/login" className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">
                เข้าสู่ระบบ
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
