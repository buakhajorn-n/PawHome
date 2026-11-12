import { apiFetch, applyForPet, login } from './backend';

// ตัวช่วยสร้าง "คำตอบปลอม" ของ fetch: ใส่แค่ status กับ body ที่อยากให้ server ตอบ
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('GET ธรรมดา: ไม่มี body ไม่มี Authorization และคืนข้อมูลที่แปลงแล้ว', async () => {
  fetch.mockResolvedValue(fakeResponse(200, { items: [{ id: 1 }] }));

  const data = await apiFetch('/api/pets');

  expect(data).toEqual({ items: [{ id: 1 }] });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/pets');
  expect(options.method).toBe('GET');
  expect(options.body).toBeUndefined();
  expect(options.headers.Authorization).toBeUndefined();
});

test('มี token ต้องแนบ Authorization แบบ Bearer และ body ต้องเป็นข้อความ JSON', async () => {
  fetch.mockResolvedValue(fakeResponse(201, { id: 7 }));

  await applyForPet(5, { reason: 'อยากเลี้ยง' }, 'abc123');

  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/pets/5/applications');
  expect(options.method).toBe('POST');
  expect(options.headers.Authorization).toBe('Bearer abc123');
  expect(options.body).toBe(JSON.stringify({ reason: 'อยากเลี้ยง' }));
});

test('error จาก server ต้องแนบ status, code และ field ไว้กับ Error', async () => {
  fetch.mockResolvedValue(fakeResponse(409, { error: { code: 'EMAIL_TAKEN', message: 'อีเมลนี้ถูกใช้แล้ว', field: 'email' } }));

  await expect(login('a@b.co', 'x')).rejects.toMatchObject({
    message: 'อีเมลนี้ถูกใช้แล้ว', status: 409, code: 'EMAIL_TAKEN', field: 'email',
  });
});

test('401 ทั้งที่ส่ง token ต้องส่งสัญญาณให้ออกจากระบบ แต่ login ผิด (ไม่มี token) ไม่ส่ง', async () => {
  const onExpired = jest.fn();
  window.addEventListener('pawhome:unauthorized', onExpired);
  fetch.mockResolvedValue(fakeResponse(401, { error: { code: 'UNAUTHORIZED', message: 'ตั๋วหมดอายุ' } }));

  await expect(apiFetch('/api/auth/me', { token: 't' })).rejects.toThrow('ตั๋วหมดอายุ');
  expect(onExpired).toHaveBeenCalledTimes(1);

  await expect(apiFetch('/api/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
  expect(onExpired).toHaveBeenCalledTimes(1);
  window.removeEventListener('pawhome:unauthorized', onExpired);
});

test('ต่อ server ไม่ติด ต้องได้ Error status 0 พร้อมข้อความภาษาไทย', async () => {
  fetch.mockRejectedValue(new TypeError('Failed to fetch'));

  await expect(apiFetch('/api/pets')).rejects.toMatchObject({ status: 0 });
});
