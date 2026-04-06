import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ManagerDashboard from './pages/ManagerDashboard';
import ViewerDashboard from './pages/ViewerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentDashboard from './pages/PaymentDashboard';

function WaitForAuth({ children }) {
  const { loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-bg"><div className="text-pur text-xl">Loading...</div></div>;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<WaitForAuth><Navigate to="/manager" /></WaitForAuth>} />
      <Route path="/manager" element={<WaitForAuth><ManagerDashboard /></WaitForAuth>} />
      <Route path="/viewer" element={<WaitForAuth><ViewerDashboard /></WaitForAuth>} />
      <Route path="/admin" element={<WaitForAuth><AdminDashboard /></WaitForAuth>} />
      <Route path="/payments" element={<WaitForAuth><PaymentDashboard /></WaitForAuth>} />
    </Routes>
  );
}
