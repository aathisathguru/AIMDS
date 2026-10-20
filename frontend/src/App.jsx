import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';
import SeoManager from './components/seo/SeoManager.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { LoadingState } from './components/ui/States.jsx';

/*
 * Login and the dashboard are the two entry points, so they stay in the main
 * bundle. Everything else is split per route — the chart-heavy pages pull in
 * Recharts only once the operator actually opens them.
 */
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

const Blocks = lazy(() => import('./pages/Blocks.jsx'));
const BlockDetails = lazy(() => import('./pages/BlockDetails.jsx'));
const FloorMonitoring = lazy(() => import('./pages/FloorMonitoring.jsx'));
const HostelMonitoring = lazy(() => import('./pages/HostelMonitoring.jsx'));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring.jsx'));
const Sensors = lazy(() => import('./pages/Sensors.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Alerts = lazy(() => import('./pages/Alerts.jsx'));
const AIInsights = lazy(() => import('./pages/AIInsights.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const More = lazy(() => import('./pages/More.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function RouteFallback() {
  return <LoadingState label="Loading view" />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <SeoManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login defaultSignUp={true} />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout />
              </DataProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="blocks" element={<Blocks />} />
          <Route path="blocks/academics" element={<Blocks />} />
          <Route path="blocks/academics/:blockId" element={<BlockDetails />} />
          <Route path="blocks/academics/:blockId/floors/:floorId" element={<FloorMonitoring />} />
          <Route path="blocks/hostel" element={<Blocks />} />
          <Route path="blocks/hostels" element={<Navigate to="/blocks/hostel" replace />} />
          <Route path="blocks/hostel/:hostelId" element={<HostelMonitoring />} />
          <Route path="blocks/:blockId" element={<BlockDetails />} />
          <Route path="blocks/:blockId/floors/:floorId" element={<FloorMonitoring />} />
          <Route path="live" element={<LiveMonitoring />} />
          <Route path="sensors" element={<Sensors />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="insights" element={<AIInsights />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="more" element={<More />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
