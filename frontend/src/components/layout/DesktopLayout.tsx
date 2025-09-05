import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import DeviceConfigManager from '../config/DeviceConfigManager';
import TaskEditor from '../task-orchestrator/TaskEditor';
import DashboardDemo from '../demo/DashboardDemo';
import SystemLogs from '../logs/SystemLogs';
import { useGlobalState } from '../../contexts/GlobalStateContext';

interface DesktopLayoutProps {}

/**
 * 桌面端布局组件
 * 特点：三列布局、固定侧边栏、多窗口支持
 */
export default function DesktopLayout({}: DesktopLayoutProps) {
  const [currentPage, setCurrentPage] = useState('config'); // 默认显示设备配置
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasNewLogs, markLogsAsRead } = useGlobalState();

  // 导航处理函数
  const handleNotificationClick = () => {
    setCurrentPage('logs');
    markLogsAsRead(); // 标记日志为已读
  };

  const handleSettingsClick = () => {
    setCurrentPage('config');
  };

  // 根据当前页面渲染对应组件
  const renderPageContent = (page: string) => {
    switch (page) {
      case 'dashboard':
        return <DashboardDemo />;
      case 'tasks':
        return <TaskEditor />;
      case 'config':
        return <DeviceConfigManager />;
      case 'logs':
        return <SystemLogs />;
      default:
        return <DeviceConfigManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧导航栏 */}
      <motion.div
        animate={{ width: sidebarCollapsed ? 64 : 280 }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 300,
          mass: 0.8
        }}
        className="bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden"
      >
        <Sidebar 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isDesktop={true}
        />
      </motion.div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部头部 */}
        <Header
          title={getPageTitle(currentPage)}
          isMobile={false}
          showBackButton={false}
          showSettings={true}
          onSettings={handleSettingsClick}
          onNotifications={handleNotificationClick}
          hasNewLogs={hasNewLogs}
        />

        {/* 内容区域 */}
        <main className="flex-1 flex overflow-hidden">
          {/* 主内容 */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 400,
                  mass: 0.6
                }}
                className="h-full"
              >
                <div className="p-8">
                  {renderPageContent(currentPage)}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>


        </main>
      </div>




    </div>
  );
}

/**
 * 获取页面标题
 */
function getPageTitle(page: string): string {
  const titles: Record<string, string> = {
    dashboard: '控制面板',
    tasks: '任务编排器',
    logs: '系统日志',
    config: '设备配置'
  };

  return titles[page] || '仿生蝠鲼控制系统';
}
