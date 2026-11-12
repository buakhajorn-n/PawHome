import { useId } from 'react';

// ภาพวาด SVG ของสัตว์ที่สร้างจากข้อมูลในประกาศ (ประเภท สายพันธุ์ อายุ คำบรรยาย)
// ใช้แทนรูปจริงเมื่อประกาศยังไม่มีรูป: สัตว์ตัวเดิมจะได้ภาพเดิมทุกครั้ง

const COLORS = {
  black: '#34312f', white: '#f8f6f1', brown: '#8b5a3c', grey: '#a3a7ad',
  orange: '#e8923f', cream: '#f2dfbd', gold: '#dfa64e',
};

// คำบอกสีที่พบในสายพันธุ์หรือคำบรรยาย ("ข้าว" ไม่ตรงกับ "ขาว" เพราะมีไม้โท)
const COLOR_WORDS = [
  [/ขาวดำ|ดำขาว/, null], // ให้กฎลายวัว (tuxedo) จัดการ
  [/ดำ|black/, 'black'],
  [/ขาว|white/, 'white'],
  [/น้ำตาล|brown|ช็อก/, 'brown'],
  [/เทา|grey|gray|สวาด/, 'grey'],
  [/ส้ม|orange|ginger/, 'orange'],
  [/ครีม|cream/, 'cream'],
  [/ทอง|golden|gold/, 'gold'],
];

const BLUE = '#5fa8e0';
const AMBER = '#e2b43c';
const GREEN = '#8cc152';

// ลักษณะตามสายพันธุ์: ตรวจจากสายพันธุ์ก่อน แล้วค่อยดูคำบรรยาย
const RULES = {
  dog: [
    { re: /ชิวาวา|chihuahua/, t: { coat: '#e7c393', ears: 'big', small: true, bigEyes: true } },
    { re: /โกลเด้น|golden/, t: { coat: '#dfa64e', ears: 'floppy' } },
    { re: /ลาบ|labrador/, t: { coat: '#ecd3a0', ears: 'floppy' } },
    { re: /หลังอาน|ridgeback/, t: { coat: '#b5652d', ears: 'pointy' } },
    { re: /บางแก้ว/, t: { coat: COLORS.white, patch: '#9a8f86', ears: 'pointy', fluffy: true } },
    { re: /ปอม|pomeranian/, t: { coat: COLORS.orange, ears: 'pointy', fluffy: true, small: true } },
    { re: /ชิสุ|shih|พุดเดิ้ล|poodle|มอลทีส|maltese/, t: { coat: '#f2e6d3', ears: 'floppy', fluffy: true } },
    { re: /บีเกิ้ล|บีเกิล|beagle/, t: { coat: '#c98b4f', patch: COLORS.black, blaze: COLORS.white, ears: 'floppy' } },
    { re: /ไซบีเรียน|husky|ฮัสกี้/, t: { coat: '#7d838b', blaze: COLORS.white, ears: 'pointy', eyes: [BLUE, BLUE] } },
    { re: /คอร์กี้|corgi|ชิบะ|shiba/, t: { coat: '#e0913f', blaze: COLORS.white, ears: 'pointy' } },
    { re: /ไทย|thai/, t: { coat: '#c27a3a', ears: 'pointy' } },
  ],
  cat: [
    { re: /วิเชียรมาศ|siamese|ไซมีส/, t: { coat: '#f3e6cf', points: '#5a3b2b', pattern: 'points', eyes: [BLUE, BLUE] } },
    { re: /ขาวมณี|khao ?manee/, t: { coat: '#fbfaf7', eyes: [BLUE, AMBER] } },
    { re: /โคราช|สีสวาด|korat/, t: { coat: '#8f9aa6', eyes: [GREEN, GREEN] } },
    { re: /ศุภลักษณ์|burmese/, t: { coat: '#6f4330', eyes: [AMBER, AMBER] } },
    { re: /เปอร์เซีย|persian/, t: { coat: '#f2e2c8', fluffy: true } },
    { re: /สก็อตติช|scottish|หูพับ/, t: { ears: 'folded' } },
    { re: /สามสี|calico/, t: { coat: COLORS.white, pattern: 'calico' } },
    { re: /ขาวดำ|ดำขาว|ลายวัว|tuxedo/, t: { coat: COLORS.black, pattern: 'tuxedo' } },
    { re: /ลายสลิด|ลายเสือ|tabby/, t: { pattern: 'tabby' } },
  ],
  other: [
    { re: /แฮมสเตอร์|hamster/, t: { kind: 'hamster', coat: '#e9b97c' } },
    { re: /หูตก|lop/, t: { kind: 'rabbit', ears: 'lop' } },
    { re: /แคระ|dwarf|netherland/, t: { kind: 'rabbit', ears: 'short', small: true } },
    { re: /กระต่าย|rabbit|bunny/, t: { kind: 'rabbit', ears: 'long' } },
  ],
};

const PALETTE = {
  dog: ['#c98b4f', '#e0b47a', '#8b5a3c', '#34312f', '#f2dfbd', '#b5652d'],
  cat: ['#e8923f', '#a3a7ad', '#34312f', '#f8f6f1', '#c9a27a'],
  other: ['#f8f6f1', '#b9a28a', '#8b6b52', '#a3a7ad'],
};
const CAT_EYES = [AMBER, GREEN, '#d9a441', '#7fb36a'];
const BG = { dog: '#fdf0d5', cat: '#e3f0fb', other: '#e9f6dc' };

const INK = '#2a2420';
const PINK = '#f3b3c0';
const NOSE_PINK = '#e38c9d';

function hashString(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ปรับสีให้อ่อนลง (amount > 0) หรือเข้มขึ้น (amount < 0) ช่วง -1..1
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = (c) => Math.round(c + (target - c) * p);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// แปลงข้อมูลสัตว์เป็นลักษณะที่ใช้วาด
export function petTraits(pet = {}) {
  const species = pet.species === 'dog' || pet.species === 'cat' ? pet.species : 'other';
  const breed = String(pet.breed || '').toLowerCase();
  const desc = String(pet.description || '').toLowerCase();
  const age = Number(pet.ageMonths) || 0;
  const seed = hashString(`${pet.id ?? ''}|${pet.name ?? ''}|${breed}`);

  const t = {
    species,
    kind: species === 'other' ? 'paw' : species,
    ears: species === 'dog' ? (seed % 2 ? 'pointy' : 'floppy') : species === 'cat' ? 'pointy' : 'long',
    pattern: 'solid',
    coat: null,
    eyes: null,
    small: false,
    fluffy: false,
    bigEyes: false,
  };

  const rules = RULES[species];
  const rule = rules.find((r) => r.re.test(breed)) || rules.find((r) => r.re.test(desc));
  if (rule) Object.assign(t, rule.t);

  if (!t.coat) {
    const word = COLOR_WORDS.find(([re]) => re.test(breed)) || COLOR_WORDS.find(([re]) => re.test(desc));
    t.coat = word && word[1] ? COLORS[word[1]] : PALETTE[species][seed % PALETTE[species].length];
  }
  if (!t.eyes) {
    const c = species === 'cat' ? CAT_EYES[(seed >>> 3) % CAT_EYES.length] : '#3a2618';
    t.eyes = [c, c];
  }

  t.young = age > 0 && age < 12;
  t.senior = /สูงวัย|สูงอายุ|ชรา|senior/.test(desc) || age >= (species === 'cat' ? 132 : 96);
  return t;
}

// วาดส่วนซ้าย แล้วสะท้อนเป็นส่วนขวา
function Pair({ children }) {
  return (
    <>
      {children}
      <g transform="translate(200 0) scale(-1 1)">{children}</g>
    </>
  );
}

function Eye({ cx, cy, r, color }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {color !== '#3a2618' && <circle cx={cx} cy={cy} r={r * 0.45} fill={INK} />}
      <circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.32} fill="#fff" />
    </>
  );
}

// ขนฟูเป็นปุยรอบแก้มและคาง (เปอร์เซีย ปอม บางแก้ว ฯลฯ) วาดก่อนหัว
function Fluff({ cy, color, line }) {
  const puffs = [[52, -14, 17], [58, 4, 18], [70, 20, 18], [86, 30, 17]];
  return (
    <g fill={color} stroke={line} strokeWidth="1.5">
      <Pair>
        {puffs.map(([x, dy, r]) => <circle key={x} cx={x} cy={cy + dy} r={r} />)}
      </Pair>
      <circle cx="100" cy={cy + 34} r="17" />
    </g>
  );
}

function Blush() {
  return (
    <Pair>
      <ellipse cx="66" cy="124" rx="9" ry="5" fill="#f19aa8" opacity="0.35" />
    </Pair>
  );
}

function Dog({ t, uid }) {
  const { coat } = t;
  const line = shade(coat, -0.18);
  const light = shade(coat, 0.5);
  const earColor = t.patch || shade(coat, -0.22);
  const muzzle = t.senior ? '#dedad3' : t.blaze || light;
  const er = t.bigEyes || t.young ? 8 : 6.5;
  const headClip = `${uid}-dh`;
  const bodyClip = `${uid}-db`;

  const pointy = t.ears === 'big'
    ? { outer: 'M62 84 L22 22 Q30 16 40 24 L96 58 Z', inner: 'M66 74 L36 33 L86 60 Z' }
    : { outer: 'M60 82 L54 30 Q60 25 67 31 L94 60 Z', inner: 'M65 72 L60 42 L84 62 Z' };

  return (
    <g transform={t.small ? 'translate(10 18) scale(0.9)' : undefined}>
      <defs>
        <clipPath id={headClip}><ellipse cx="100" cy="100" rx="52" ry="48" /></clipPath>
        <clipPath id={bodyClip}><ellipse cx="100" cy="196" rx="58" ry="44" /></clipPath>
      </defs>

      <ellipse cx="100" cy="196" rx="58" ry="44" fill={coat} stroke={line} strokeWidth="1.5" />
      <g clipPath={`url(#${bodyClip})`}>
        {t.patch && <ellipse cx="100" cy="160" rx="70" ry="14" fill={t.patch} />}
        <ellipse cx="100" cy="192" rx="24" ry="30" fill={t.blaze || light} opacity="0.9" />
      </g>

      {t.ears !== 'floppy' && (
        <Pair>
          <path d={pointy.outer} fill={t.patch || coat} stroke={line} strokeWidth="1.5" strokeLinejoin="round" />
          <path d={pointy.inner} fill="#f2c4b8" />
        </Pair>
      )}

      {t.fluffy && <Fluff cy={112} color={shade(coat, 0.15)} line={line} />}
      <ellipse cx="100" cy="100" rx="52" ry="48" fill={coat} stroke={line} strokeWidth="1.5" />

      <g clipPath={`url(#${headClip})`}>
        {t.blaze && <path d="M100 56 C90 70 82 92 74 116 L126 116 C118 92 110 70 100 56 Z" fill={t.blaze} />}
      </g>

      {t.ears === 'floppy' && (
        <Pair>
          <path d="M58 68 C36 72 30 118 44 136 C54 146 66 128 66 102 Z" fill={earColor} stroke={shade(earColor, -0.15)} strokeWidth="1.5" />
        </Pair>
      )}

      <ellipse cx="100" cy="123" rx="27" ry="21" fill={muzzle} />
      {t.senior && (
        <Pair>
          <ellipse cx="80" cy="82" rx="8" ry="3.5" fill="#e6e3dd" />
        </Pair>
      )}

      <Eye cx={80} cy={93} r={er} color={t.eyes[0]} />
      <Eye cx={120} cy={93} r={er} color={t.eyes[1]} />

      <path d="M95 131 Q100 143 105 131 Z" fill="#e8798a" />
      <path d="M90 112 Q100 106 110 112 Q108 121 100 122 Q92 121 90 112 Z" fill={INK} />
      <path d="M100 122 L100 128 M100 128 Q93 135 86 130 M100 128 Q107 135 114 130"
            fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      {t.young && <Blush />}
    </g>
  );
}

function Cat({ t, uid }) {
  const { coat } = t;
  const line = shade(coat, -0.18);
  const dark = shade(coat, -0.35);
  const headClip = `${uid}-ch`;
  const eyeRy = t.young ? 11 : 9;

  const earColors =
    t.pattern === 'points' ? [t.points, t.points]
      : t.pattern === 'calico' ? [COLORS.orange, COLORS.black]
        : [coat, coat];
  const muzzleColor = t.pattern === 'tuxedo' ? COLORS.white : shade(coat, 0.4);
  const whisker = t.pattern === 'points' || coat === COLORS.black ? '#e9e4dc' : shade(coat, -0.5);

  const ear = (color, i) =>
    t.ears === 'folded' ? (
      <path d="M62 72 Q66 52 88 58 Q80 72 62 72 Z" fill={color} stroke={line} strokeWidth="1.5" />
    ) : (
      <g key={i}>
        <path d="M58 92 L58 36 Q62 31 69 36 L96 66 Z" fill={color} stroke={line} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M64 82 L64 48 L86 68 Z" fill={PINK} />
      </g>
    );

  return (
    <g>
      <defs>
        <clipPath id={headClip}><ellipse cx="100" cy="108" rx="52" ry="45" /></clipPath>
      </defs>

      <ellipse cx="100" cy="198" rx="54" ry="42" fill={coat} stroke={line} strokeWidth="1.5" />
      {t.pattern === 'tuxedo' && <ellipse cx="100" cy="190" rx="22" ry="28" fill={COLORS.white} />}

      {ear(earColors[0], 0)}
      <g transform="translate(200 0) scale(-1 1)">{ear(earColors[1], 1)}</g>

      {t.fluffy && <Fluff cy={120} color={shade(coat, 0.15)} line={line} />}
      <ellipse cx="100" cy="108" rx="52" ry="45" fill={coat} stroke={line} strokeWidth="1.5" />

      <g clipPath={`url(#${headClip})`}>
        {t.pattern === 'points' && <ellipse cx="100" cy="124" rx="31" ry="27" fill={t.points} opacity="0.88" />}
        {t.pattern === 'calico' && (
          <>
            <ellipse cx="66" cy="82" rx="30" ry="24" fill={COLORS.orange} />
            <ellipse cx="138" cy="86" rx="26" ry="22" fill={COLORS.black} />
          </>
        )}
        {t.pattern === 'tuxedo' && (
          <path d="M100 84 C88 96 72 112 74 132 C80 154 120 154 126 132 C128 112 112 96 100 84 Z" fill={COLORS.white} />
        )}
        {t.pattern === 'tabby' && (
          <g stroke={dark} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M86 70 L90 84 M100 66 L100 82 M114 70 L110 84" />
            <Pair><path d="M48 106 L64 109 M48 118 L64 117" /></Pair>
          </g>
        )}
      </g>

      <Pair>
        <ellipse cx="91" cy="127" rx="10" ry="8" fill={muzzleColor} />
      </Pair>
      {t.senior && <ellipse cx="100" cy="128" rx="20" ry="9" fill="#fff" opacity="0.35" />}

      {[[80, t.eyes[0]], [120, t.eyes[1]]].map(([cx, color]) => (
        <g key={cx}>
          <ellipse cx={cx} cy="104" rx="9" ry={eyeRy} fill={color} />
          <ellipse cx={cx} cy="104" rx="2.8" ry={eyeRy - 2} fill="#1d1b1a" />
          <circle cx={cx + 3} cy={104 - eyeRy / 2} r="2.2" fill="#fff" />
        </g>
      ))}

      <path d="M94 119 L106 119 L100 126 Z" fill={NOSE_PINK} strokeLinejoin="round" />
      <path d="M100 126 Q96 133 89 131 M100 126 Q104 133 111 131" fill="none" stroke="#5a4a44" strokeWidth="2" strokeLinecap="round" />
      <Pair>
        <path d="M78 126 L38 120 M78 131 L38 135" stroke={whisker} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      </Pair>
      {t.young && <Blush />}
    </g>
  );
}

function Rabbit({ t }) {
  const { coat } = t;
  const line = shade(coat, -0.18);
  const light = shade(coat, 0.45);
  const er = t.young ? 8 : 7;
  const upright = t.ears === 'short'
    ? { cy: 66, ry: 26, innerRy: 18 }
    : { cy: 50, ry: 40, innerRy: 30 };

  return (
    <g transform={t.small ? 'translate(10 20) scale(0.9)' : undefined}>
      <ellipse cx="100" cy="196" rx="52" ry="40" fill={coat} stroke={line} strokeWidth="1.5" />

      {t.ears !== 'lop' && (
        <Pair>
          <g transform={`rotate(-12 80 ${upright.cy})`}>
            <ellipse cx="80" cy={upright.cy} rx="13" ry={upright.ry} fill={coat} stroke={line} strokeWidth="1.5" />
            <ellipse cx="80" cy={upright.cy + 2} rx="6" ry={upright.innerRy} fill={PINK} />
          </g>
        </Pair>
      )}

      <ellipse cx="100" cy="116" rx="46" ry="40" fill={coat} stroke={line} strokeWidth="1.5" />

      {t.ears === 'lop' && (
        <Pair>
          <ellipse cx="56" cy="114" rx="14" ry="34" transform="rotate(16 56 114)" fill={shade(coat, -0.1)} stroke={line} strokeWidth="1.5" />
        </Pair>
      )}

      <Pair>
        <ellipse cx="85" cy="131" rx="16" ry="12" fill={light} />
      </Pair>
      {t.senior && <ellipse cx="100" cy="132" rx="22" ry="10" fill="#fff" opacity="0.35" />}

      <Eye cx={80} cy={110} r={er} color="#3a2618" />
      <Eye cx={120} cy={110} r={er} color="#3a2618" />

      <rect x="97" y="134" width="6" height="6" rx="1" fill="#fff" stroke="#d6d0c8" />
      <path d="M96 124 L104 124 L100 129 Z" fill={NOSE_PINK} />
      <path d="M100 129 L100 133 M100 133 Q96 137 92 135 M100 133 Q104 137 108 135"
            fill="none" stroke="#5a4a44" strokeWidth="1.8" strokeLinecap="round" />
      <Pair>
        <path d="M80 130 L46 124 M80 134 L46 138" stroke={shade(coat, -0.45)} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </Pair>
      {t.young && <Blush />}
    </g>
  );
}

function Hamster({ t }) {
  const { coat } = t;
  const line = shade(coat, -0.18);
  return (
    <g>
      <Pair>
        <circle cx="64" cy="94" r="14" fill={coat} stroke={line} strokeWidth="1.5" />
        <circle cx="64" cy="94" r="8" fill={PINK} />
      </Pair>
      <ellipse cx="100" cy="152" rx="66" ry="58" fill={coat} stroke={line} strokeWidth="1.5" />
      <ellipse cx="100" cy="176" rx="40" ry="32" fill={COLORS.white} />
      <Pair>
        <ellipse cx="72" cy="146" rx="16" ry="12" fill={shade(coat, 0.45)} />
      </Pair>
      <Eye cx={82} cy={128} r={6} color="#3a2618" />
      <Eye cx={118} cy={128} r={6} color="#3a2618" />
      <circle cx="100" cy="142" r="4" fill={NOSE_PINK} />
      <path d="M100 146 Q96 151 92 149 M100 146 Q104 151 108 149" fill="none" stroke="#5a4a44" strokeWidth="1.6" strokeLinecap="round" />
      {t.young && <Blush />}
    </g>
  );
}

// สัตว์อื่นที่ไม่รู้จักรูปร่าง: วาดรอยเท้าสีตามขน
function Paw({ t }) {
  const line = shade(t.coat, -0.25);
  return (
    <g fill={t.coat} stroke={line} strokeWidth="2">
      <ellipse cx="100" cy="128" rx="34" ry="28" />
      <ellipse cx="64" cy="92" rx="12" ry="15" transform="rotate(-20 64 92)" />
      <ellipse cx="88" cy="72" rx="12" ry="15" />
      <ellipse cx="112" cy="72" rx="12" ry="15" />
      <ellipse cx="136" cy="92" rx="12" ry="15" transform="rotate(20 136 92)" />
    </g>
  );
}

const DRAW = { dog: Dog, cat: Cat, rabbit: Rabbit, hamster: Hamster, paw: Paw };

function PetArt({ pet, className = '' }) {
  const t = petTraits(pet);
  const uid = 'pa' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const Draw = DRAW[t.kind];
  return (
    <div role="img" aria-label={`ภาพวาดประกอบของ ${pet.name}`}
         className={'w-full overflow-hidden ' + className} style={{ backgroundColor: BG[t.species] }}>
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true" focusable="false">
        <circle cx="100" cy="106" r="80" fill="#fff" opacity="0.55" />
        <Draw t={t} uid={uid} />
      </svg>
    </div>
  );
}

export default PetArt;
