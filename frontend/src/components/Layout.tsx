import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDeviceStore } from '../store/deviceStore';
import {
  HomeIcon,
  CogIcon,
  PlayIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

/**
 * 主布局组件
 * 包含导航栏、侧边栏和主内容区域
 */
export function Layout() {
  const location = useLocation();
  const { connectionStatus, systemStatus, error } = useDeviceStore();

  const navigation = [
    { name: '仪表盘', href: '/dashboard', icon: HomeIcon },
    { name: '控制面板', href: '/control', icon: CogIcon },
    { name: '设备配置', href: '/device-config', icon: CpuChipIcon },
    { name: '任务编排', href: '/tasks', icon: PlayIcon },
    { name: '系统日志', href: '/logs', icon: DocumentTextIcon },
    { name: '设置', href: '/settings', icon: AdjustmentsHorizontalIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                  Manta Control Ultra
                </h1>
                <h1 className="text-lg font-bold text-gray-900 sm:hidden">
                  Manta
                </h1>
              </div>
            </div>

            {/* 状态指示器 */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* 连接状态 */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                <WifiIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  connectionStatus.isConnected ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className={`text-xs sm:text-sm font-medium ${
                  connectionStatus.isConnected ? 'text-green-700' : 'text-red-700'
                } hidden sm:inline`}>
                  {connectionStatus.isConnected ? '已连接' : '未连接'}
                </span>
                {connectionStatus.isConnected && (
                  <span className="text-xs text-gray-500 hidden md:inline">
                    ({connectionStatus.clientCount}/{connectionStatus.maxClients})
                  </span>
                )}
              </div>

              {/* 后端状态 */}
              <div className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                systemStatus.backend.isRunning
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1 sm:mr-1.5 ${
                  systemStatus.backend.isRunning ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="hidden sm:inline">后端 {systemStatus.backend.version}</span>
                <span className="sm:hidden">BE</span>
              </div>

              {/* Arduino状态 */}
              <div className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                systemStatus.arduino.isConnected
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1 sm:mr-1.5 ${
                  systemStatus.arduino.isConnected ? 'bg-blue-400' : 'bg-gray-400'
                }`}></div>
                <span className="hidden sm:inline">Arduino</span>
                <span className="sm:hidden">AR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-red-50 border-l-4 border-red-400 p-4"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                  onClick={() => useDeviceStore.getState().setError(null)}
                >
                  <span className="sr-only">关闭</span>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex">
        {/* 侧边栏 */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
            <div className="flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 flex-shrink-0 h-6 w-6 ${
                          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <nav className="flex">
          {navigation.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex-1 flex flex-col items-center py-2 px-1 text-xs ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="truncate text-xs">{item.name.length > 4 ? item.name.substring(0, 4) : item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
