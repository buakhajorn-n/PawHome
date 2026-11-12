import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api/backend';

// Context = "กล่องกลาง" ที่ component ไหนในแอปก็เอื้อมมาหยิบได้ ไม่ต้องส่ง props ต่อกันเป็นทอด ๆ
// เราใส่สถานะ login ไว้ในนี้ เพราะ Navbar, PetDetail, หน้า Member และ Admin ต้องรู้เหมือนกันหมดว่าใครล็อกอินอยู่
const AuthContext = createContext(null);

const TOKEN_KEY = 'pawhome.token';
const MEMBER_KEY = 'pawhome.member';

function readMember() {
  try {
    return JSON.parse(localStorage.getItem(MEMBER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // อ่านค่าเดิมจาก localStorage จะได้ไม่หลุด login ตอน refresh
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [member, setMember] = useState(readMember);

  function remember({ token, member }) {
    setToken(token);
    setMember(member);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  }

  async function login(email, password) {
    const data = await api.login(email, password);   // ถ้าผิด backend.js จะ throw
    remember(data);
    return data.member;
  }

  async function register(fields) {
    await api.register(fields);
    return login(fields.email, fields.password);     // สมัครเสร็จล็อกอินให้เลย
  }

  function logout() {
    setToken(null);
    setMember(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_KEY);
  }

  // หลังแก้โปรไฟล์: อัปเดตข้อมูลที่จำไว้ให้ตรงกับ server
  function updateMember(next) {
    setMember(next);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(next));
  }

  // api/backend.js ส่งสัญญาณนี้เมื่อ server ตอบ 401 ทั้งที่เราส่งตั๋วไป (ตั๋วหมดอายุ)
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener('pawhome:unauthorized', onExpired);
    return () => window.removeEventListener('pawhome:unauthorized', onExpired);
  }, []);

  const isAdmin = member?.role === 'admin';
  const value = { token, member, isLoggedIn: Boolean(token), isAdmin, login, register, logout, updateMember };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// hook สั้น ๆ ให้ทุกหน้าเรียก useAuth() แทนที่จะต้อง import Context เอง
export function useAuth() {
  return useContext(AuthContext);
}
