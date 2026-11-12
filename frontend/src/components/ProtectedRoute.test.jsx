import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<h1>หน้า Login</h1>} />
          <Route path="/me/profile" element={<ProtectedRoute><h1>โปรไฟล์</h1></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => localStorage.clear());

test('ยังไม่ login ต้องถูกพาไปหน้า Login', () => {
  renderAt('/me/profile');
  expect(screen.getByRole('heading', { name: 'หน้า Login' })).toBeInTheDocument();
});

test('login แล้วต้องเห็นหน้าที่ขอ', () => {
  localStorage.setItem('pawhome.token', 'tok');
  localStorage.setItem('pawhome.member', JSON.stringify({ id: 1, fullName: 'Demo', role: 'member' }));
  renderAt('/me/profile');
  expect(screen.getByRole('heading', { name: 'โปรไฟล์' })).toBeInTheDocument();
});
