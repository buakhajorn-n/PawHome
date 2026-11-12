import { fireEvent, render, screen } from '@testing-library/react';
import PetArt, { petTraits, shade } from './PetArt';
import { PetImage } from './PetCard';

const pet = (o) => ({ id: 1, name: 'ทดสอบ', species: 'dog', breed: '', ageMonths: 24, description: '', ...o });

describe('petTraits', () => {
  test('วิเชียรมาศ: หน้ากากสีเข้มและตาสีฟ้า', () => {
    const t = petTraits(pet({ species: 'cat', breed: 'วิเชียรมาศ' }));
    expect(t.pattern).toBe('points');
    expect(t.eyes[0]).toBe(t.eyes[1]);
    expect(t.eyes[0]).toBe('#5fa8e0');
  });

  test('ขาวมณี: ขนขาวและตาสองสี', () => {
    const t = petTraits(pet({ species: 'cat', breed: 'ขาวมณี' }));
    expect(t.coat).toBe('#fbfaf7');
    expect(t.eyes[0]).not.toBe(t.eyes[1]);
  });

  test('ชิวาวา: หูใหญ่ ตัวเล็ก และสูงวัยตามคำบรรยาย', () => {
    const t = petTraits(pet({ breed: 'ชิวาวา', ageMonths: 60, description: 'สุนัขสูงวัย สงบ' }));
    expect(t.ears).toBe('big');
    expect(t.small).toBe(true);
    expect(t.senior).toBe(true);
  });

  test('โกลเด้นผสม: หูตก สีทอง', () => {
    const t = petTraits(pet({ breed: 'ผสมโกลเด้น' }));
    expect(t.ears).toBe('floppy');
    expect(t.coat).toBe('#dfa64e');
  });

  test('กระต่ายแคระ: วาดเป็นกระต่ายหูสั้น', () => {
    const t = petTraits(pet({ species: 'other', breed: 'กระต่ายแคระ' }));
    expect(t.kind).toBe('rabbit');
    expect(t.ears).toBe('short');
  });

  test('อายุน้อยกว่า 1 ปีนับเป็นเด็ก', () => {
    expect(petTraits(pet({ ageMonths: 4 })).young).toBe(true);
    expect(petTraits(pet({ ageMonths: 18 })).young).toBe(false);
  });

  test('"เหมาะแก่" ในคำบรรยายไม่ทำให้นับเป็นสูงวัย', () => {
    expect(petTraits(pet({ description: 'เหมาะแก่บ้านที่มีเด็ก' })).senior).toBe(false);
  });

  test('ใช้สีจากคำบรรยายเมื่อสายพันธุ์ไม่บอก', () => {
    expect(petTraits(pet({ description: 'ขนสีดำสนิท' })).coat).toBe('#34312f');
  });

  test('สัตว์ตัวเดิมได้ลักษณะเดิมทุกครั้ง', () => {
    const p = pet({ id: 42, name: 'ถุงเงิน', species: 'cat' });
    expect(petTraits(p)).toEqual(petTraits(p));
  });

  test('แมวทุกตัวได้สีตาเสมอ (ไม่ติดลบจากการเลื่อนบิต)', () => {
    for (let id = 1; id <= 200; id += 1) {
      const t = petTraits(pet({ id, name: `แมว${id}`, species: 'cat', breed: 'สามสี' }));
      expect(t.eyes[0]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test('สัตว์อื่นที่ไม่รู้จักวาดเป็นรอยเท้า', () => {
    expect(petTraits(pet({ species: 'other', breed: 'เต่า' })).kind).toBe('paw');
  });
});

test('shade ปรับสีอ่อน/เข้ม', () => {
  expect(shade('#808080', 1)).toBe('#ffffff');
  expect(shade('#808080', -1)).toBe('#000000');
  expect(shade('#123456', 0)).toBe('#123456');
});

test('PetArt แสดงเป็นภาพพร้อมคำอธิบาย', () => {
  render(<PetArt pet={pet({ name: 'มะลิ', species: 'cat', breed: 'วิเชียรมาศ' })} />);
  expect(screen.getByRole('img', { name: 'ภาพวาดประกอบของ มะลิ' })).toBeInTheDocument();
});

test('PetImage ใช้รูปจริงเมื่อมี และสลับเป็นภาพวาดเมื่อโหลดรูปไม่ได้', () => {
  render(<PetImage pet={pet({ name: 'ข้าวปุ้น', imageUrl: 'https://example.com/x.jpg' })} />);
  const img = screen.getByRole('img', { name: 'รูปของ ข้าวปุ้น' });
  fireEvent.error(img);
  expect(screen.getByRole('img', { name: 'ภาพวาดประกอบของ ข้าวปุ้น' })).toBeInTheDocument();
});

test('PetImage ไม่มีรูปแสดงภาพวาด', () => {
  render(<PetImage pet={pet({ name: 'โบ๊ท', species: 'other', breed: 'กระต่ายแคระ' })} />);
  expect(screen.getByRole('img', { name: 'ภาพวาดประกอบของ โบ๊ท' })).toBeInTheDocument();
});
