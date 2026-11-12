import PetCard from './PetCard';

// วาดรายการสัตว์ตาม "สถานะ" 3 แบบ: loading | error | success (สำเร็จแต่ว่างเปล่าก็เป็น success)
function PetGrid({ pets, status, error, onRetry }) {
  if (status === 'loading') {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" role="status" aria-label="กำลังโหลด">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-emerald-100 bg-white">
            <div className="aspect-square bg-slate-100" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-medium text-red-700">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-red-500">{error?.message}</p>
        {onRetry && (
          <button onClick={onRetry}
                  className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-100">
            ลองใหม่
          </button>
        )}
      </div>
    );
  }

  if (!pets || pets.length === 0) {
    return <p className="py-16 text-center text-slate-400">ไม่พบสัตว์ที่ตรงกับเงื่อนไข ลองเปลี่ยนตัวกรองดู</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {pets.map(p => <PetCard key={p.id} pet={p} />)}
    </div>
  );
}

export default PetGrid;
