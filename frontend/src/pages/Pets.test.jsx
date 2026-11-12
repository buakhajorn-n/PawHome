import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Pets from './Pets';
import { getPets } from '../api/backend';

// แทนทั้งไฟล์ backend.js ด้วยของปลอม: ทุกฟังก์ชันกลายเป็น jest.fn() ที่เรากำหนดคำตอบได้
jest.mock('../api/backend');

const FAKE_PETS = [
  { id: 1, name: 'ข้าวปุ้น', species: 'dog', breed: 'ไทยหลังอาน', ageMonths: 8, sex: 'male', status: 'available', imageUrl: '' },
  { id: 2, name: 'มะลิ', species: 'cat', breed: 'วิเชียรมาศ', ageMonths: 24, sex: 'female', status: 'available', imageUrl: '' },
  { id: 3, name: 'ถุงทอง', species: 'dog', breed: '', ageMonths: 60, sex: 'female', status: 'reserved', imageUrl: '' },
];

function renderPets() {
  return render(<MemoryRouter><Pets /></MemoryRouter>);   // มี Link ข้างใน ต้องมี Router ครอบ
}

test('โหลดสำเร็จ ต้องเห็นการ์ดสัตว์ครบทุกตัว', async () => {
  getPets.mockResolvedValue(FAKE_PETS);
  renderPets();

  expect(await screen.findByText('ข้าวปุ้น')).toBeInTheDocument();   // findBy = รอจน useEffect โหลดเสร็จ
  expect(screen.getByText('มะลิ')).toBeInTheDocument();
  expect(screen.getByText('ถุงทอง')).toBeInTheDocument();
});

test('พิมพ์ค้นหา ต้องกรองในเครื่องโดยไม่เรียก backend ซ้ำ', async () => {
  const user = userEvent.setup();
  getPets.mockResolvedValue(FAKE_PETS);
  renderPets();
  await screen.findByText('ข้าวปุ้น');

  await user.type(screen.getByPlaceholderText(/พิมพ์ชื่อหรือสายพันธุ์/), 'มะลิ');

  expect(screen.getByText('มะลิ')).toBeInTheDocument();
  expect(screen.queryByText('ข้าวปุ้น')).not.toBeInTheDocument();
  expect(getPets).toHaveBeenCalledTimes(1);            // ยังเรียกแค่ตอนโหลดครั้งแรก
});

test('เลือกเพศ ต้องเหลือเฉพาะเพศที่เลือก', async () => {
  const user = userEvent.setup();
  getPets.mockResolvedValue(FAKE_PETS);
  renderPets();
  await screen.findByText('ข้าวปุ้น');

  await user.selectOptions(screen.getByLabelText('กรองตามเพศ'), 'male');

  expect(screen.getByText('ข้าวปุ้น')).toBeInTheDocument();
  expect(screen.queryByText('มะลิ')).not.toBeInTheDocument();
});

test('backend ล่ม ต้องเห็นข้อความ error และปุ่มลองใหม่ที่โหลดอีกครั้งได้', async () => {
  const user = userEvent.setup();
  getPets
    .mockRejectedValueOnce(new Error('server ไม่ได้ตอบเป็น JSON'))   // ครั้งแรกพัง
    .mockResolvedValueOnce(FAKE_PETS);                               // ครั้งที่สองสำเร็จ
  renderPets();

  expect(await screen.findByText('โหลดข้อมูลไม่สำเร็จ')).toBeInTheDocument();
  expect(screen.getByText('server ไม่ได้ตอบเป็น JSON')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'ลองใหม่' }));

  expect(await screen.findByText('ข้าวปุ้น')).toBeInTheDocument();
  expect(getPets).toHaveBeenCalledTimes(2);
});
