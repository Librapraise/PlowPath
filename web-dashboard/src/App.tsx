import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const LiveOpsPage = lazy(() => import('./pages/LiveOpsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const StormsPage = lazy(() => import('./pages/StormsPage'));
const RoutesPage = lazy(() => import('./pages/RoutesPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const HomeownerTrackingPortal = lazy(() => import('./pages/HomeownerTrackingPortal'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'));
const DataDeletionPage = lazy(() => import('./pages/DataDeletionPage'));

const PageSpinner = () => (
  <div className="flex h-full w-full items-center justify-center bg-slate-950 p-12 text-slate-400">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-blue-500"></div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/delete-data" element={<DataDeletionPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        
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
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/track/:slug" element={<HomeownerTrackingPortal />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
