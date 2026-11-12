import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import AdoptionForm from './pages/AdoptionForm';
import Home from './pages/Home';
import Login from './pages/Login';
import MemberHome from './pages/MemberHome';
import MyApplications from './pages/MyApplications';
import NotFound from './pages/NotFound';
import PetDetail from './pages/PetDetail';
import Pets from './pages/Pets';
import Profile from './pages/Profile';
import Register from './pages/Register';
import AdminApplications from './pages/admin/AdminApplications';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminPetForm from './pages/admin/AdminPetForm';
import AdminPets from './pages/admin/AdminPets';

function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-emerald-50/40">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Guest */}
            <Route path="/" element={<Home />} />
            <Route path="/pets" element={<Pets />} />
            <Route path="/pets/:id" element={<PetDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Member */}
            <Route path="/pets/:id/adopt" element={<RequireRole role="member"><AdoptionForm /></RequireRole>} />
            <Route path="/me" element={<RequireRole role="member"><MemberHome /></RequireRole>} />
            <Route path="/me/applications" element={<RequireRole role="member"><MyApplications /></RequireRole>} />
            <Route path="/me/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
              <Route index element={<AdminDashboard />} />
              <Route path="pets" element={<AdminPets />} />
              <Route path="pets/new" element={<AdminPetForm />} />
              <Route path="pets/:id" element={<AdminPetForm />} />
              <Route path="applications" element={<AdminApplications />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
