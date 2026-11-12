import { Link } from 'react-router-dom';
import { EMOJI, PET_STATUS, SEX, SPECIES, formatAge, petBadge } from '../utils';

// รูปสัตว์: ถ้าไม่มีรูปใช้อีโมจิตามประเภทแทน
export function PetImage({ pet, className = '' }) {
  if (pet.imageUrl) {
    return <img src={pet.imageUrl} alt={`รูปของ ${pet.name}`} loading="lazy" className={'w-full object-cover ' + className} />;
  }
  return (
    <div role="img" aria-label={`ยังไม่มีรูปของ ${pet.name}`}
         className={'grid w-full place-items-center bg-slate-100 text-6xl ' + className}>
      {EMOJI[pet.species] || '🐾'}
    </div>
  );
}

// การ์ดสัตว์ 1 ใบ รับ object ตาม API: { id, name, species, breed, ageMonths, sex, status, imageUrl }
function PetCard({ pet }) {
  return (
    <Link to={`/pets/${pet.id}`}
          className="group block overflow-hidden rounded-xl border border-emerald-100 bg-white transition hover:border-emerald-300 hover:shadow-md">
      <div className="relative">
        <PetImage pet={pet} className="aspect-square" />
        <span className={'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs ' + petBadge[pet.status]}>
          {PET_STATUS[pet.status]}
        </span>
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium text-slate-900" title={pet.name}>{pet.name}</h3>
        <p className="truncate text-sm text-slate-500">{SPECIES[pet.species]}{pet.breed && ` · ${pet.breed}`}</p>
        <p className="mt-1 text-xs text-slate-400">{formatAge(pet.ageMonths)} | {SEX[pet.sex]}</p>
      </div>
    </Link>
  );
}

export default PetCard;
