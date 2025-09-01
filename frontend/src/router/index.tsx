import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Dashboard } from '../pages/Dashboard';
import { ControlPanel } from '../pages/ControlPanel';
import { SystemLogs } from '../pages/SystemLogs';
import { Settings } from '../pages/Settings';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * 应用路由配置
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'control',
        element: <ControlPanel />
      },
      {
        path: 'logs',
        element: <SystemLogs />
      },
      {
        path: 'settings',
        element: <Settings />
      }
    ]
  }
]);
