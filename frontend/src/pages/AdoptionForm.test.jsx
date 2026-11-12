import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import AdoptionForm, { validateAdoption } from './AdoptionForm';
import { applyForPet, getPet } from '../api/backend';

jest.mock('../api/backend');

const PET = { id: 5, name: 'ข้าวปุ้น', species: 'dog', status: 'available' };

function renderForm() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/pets/5/adopt']}>
        <Routes>
          <Route path="/pets/:id/adopt" element={<AdoptionForm />} />
          <Route path="/me/applications" element={<h1>คำขอของฉัน</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pawhome.token', 'tok');
  localStorage.setItem('pawhome.member', JSON.stringify({ id: 1, fullName: 'สมชาย', email: 'a@b.co', phone: '', role: 'member' }));
  getPet.mockResolvedValue(PET);
});

async function fillValid(user) {
  await user.type(screen.getByLabelText(/เบอร์โทรศัพท์ติดต่อ/), '0812345678');
  await user.type(screen.getByLabelText(/เหตุผลที่ต้องการรับเลี้ยง/), 'อยากมีเพื่อนในบ้านและมีเวลาดูแล');
  await user.selectOptions(screen.getByLabelText(/ลักษณะที่อยู่อาศัย/), 'house');
  await user.type(screen.getByLabelText(/แนวทางการดูแลสัตว์/), 'ให้อาหารตรงเวลา พาไปหาหมอ');
}

test('validateAdoption: ฟอร์มว่างต้องมี error ครบ 4 ช่อง', () => {
  const errors = validateAdoption({ contactPhone: '', reason: '', housingType: '', carePlan: '' });
  expect(Object.keys(errors).sort()).toEqual(['carePlan', 'contactPhone', 'housingType', 'reason']);
});

test('กรอกไม่ครบแล้วกดส่ง ต้องเห็นข้อความเตือนและไม่เรียก API', async () => {
  const user = userEvent.setup();
  renderForm();
  await screen.findByText(/ขอรับเลี้ยง ข้าวปุ้น/);

  await user.click(screen.getByRole('button', { name: 'ส่งคำขอรับเลี้ยง' }));

  expect(screen.getByText('กรุณาเลือกลักษณะที่อยู่อาศัย')).toBeInTheDocument();
  expect(applyForPet).not.toHaveBeenCalled();
});

test('กรอกครบ ส่งสำเร็จ ต้องเรียก API พร้อม token แล้วไปหน้าคำขอของฉัน', async () => {
  const user = userEvent.setup();
  applyForPet.mockResolvedValue({ id: 1 });
  renderForm();
  await screen.findByText(/ขอรับเลี้ยง ข้าวปุ้น/);

  await fillValid(user);
  await user.click(screen.getByRole('button', { name: 'ส่งคำขอรับเลี้ยง' }));

  expect(await screen.findByRole('heading', { name: 'คำขอของฉัน' })).toBeInTheDocument();
  expect(applyForPet).toHaveBeenCalledTimes(1);
  const [petId, body, token] = applyForPet.mock.calls[0];
  expect(petId).toBe('5');
  expect(body).toMatchObject({ contactPhone: '0812345678', housingType: 'house', hasExperience: false });
  expect(token).toBe('tok');
});

test('server ตอบ 409 ต้องแสดงข้อความจาก server และไม่ออกจากหน้าฟอร์ม', async () => {
  const user = userEvent.setup();
  applyForPet.mockRejectedValue(new Error('สัตว์เลี้ยงตัวนี้ถูกจองแล้ว'));
  renderForm();
  await screen.findByText(/ขอรับเลี้ยง ข้าวปุ้น/);

  await fillValid(user);
  await user.click(screen.getByRole('button', { name: 'ส่งคำขอรับเลี้ยง' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('สัตว์เลี้ยงตัวนี้ถูกจองแล้ว');
  expect(screen.queryByRole('heading', { name: 'คำขอของฉัน' })).not.toBeInTheDocument();
});
