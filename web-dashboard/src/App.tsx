import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LiveOpsPage from './pages/LiveOpsPage';
import CustomersPage from './pages/CustomersPage';
import DriversPage from './pages/DriversPage';
import StormsPage from './pages/StormsPage';
import RoutesPage from './pages/RoutesPage';
import FinancePage from './pages/FinancePage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected Dashboard Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <LiveOpsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CustomersPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DriversPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/storms"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <StormsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <RoutesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <FinancePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
