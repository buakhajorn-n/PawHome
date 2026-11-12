import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminPets, setPetStatus } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';
import { ErrorBox, Loading, btnPrimary } from '../../components/ui';
import { PET_STATUS, SPECIES, formatAge, petBadge } from '../../utils';

function AdminPets() {
  const { token } = useAuth();
  const [pets, setPets] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const list = await getAdminPets(token);
        if (!ignore) { setPets(list); setStatus('success'); }
      } catch (err) {
        if (!ignore) { setError(err); setStatus('error'); }
      }
    }
    load();
    return () => { ignore = true; };
  }, [token, reloadKey]);

  async function changeStatus(pet, next) {
    setActionError(null);
    try {
      await setPetStatus(pet.id, next, token);
    } catch (err) {
      setActionError(`${pet.name}: ${err.message}`);        // เช่น 409 มีคำขอที่อนุมัติแล้ว
    }
    setReloadKey(k => k + 1);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">สัตว์เลี้ยงทั้งหมด</h2>
        <Link to="/admin/pets/new" className={btnPrimary}>+ เพิ่มสัตว์เลี้ยง</Link>
      </div>
      {actionError && <p className="mb-3 text-sm text-red-600" role="alert">{actionError}</p>}
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={error} onRetry={() => setReloadKey(k => k + 1)} />}
      {status === 'success' && (
        <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-50 text-slate-600">
              <tr><th className="px-4 py-2">ชื่อ</th><th className="px-4 py-2">ชนิด</th><th className="px-4 py-2">อายุ</th><th className="px-4 py-2">สถานะ</th><th className="px-4 py-2" /></tr>
            </thead>
            <tbody>
              {pets.map(p => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-2">{SPECIES[p.species]}</td>
                  <td className="px-4 py-2">{formatAge(p.ageMonths)}</td>
                  <td className="px-4 py-2">
                    <span className={'mr-2 rounded-full px-2 py-0.5 text-xs ' + petBadge[p.status]}>{PET_STATUS[p.status]}</span>
                    <select aria-label={`สถานะของ ${p.name}`} value={p.status} onChange={(e) => changeStatus(p, e.target.value)}
                      className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                      {Object.entries(PET_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right"><Link to={`/admin/pets/${p.id}`} className="text-emerald-600 hover:underline">แก้ไข</Link></td>
                </tr>
              ))}
              {pets.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">ยังไม่มีสัตว์เลี้ยง</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPets;
