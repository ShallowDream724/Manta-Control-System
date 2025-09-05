import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from './BottomNav';
import Header from './Header';
import DeviceConfigManager from '../config/DeviceConfigManager';
import TaskEditor from '../task-orchestrator/TaskEditor';
import DashboardDemo from '../demo/DashboardDemo';
import SystemLogs from '../logs/SystemLogs';
// 删除：避免多个Hook实例导致重复请求

interface MobileLayoutProps {}

/**
 * 移动端布局组件
 * 特点：底部导航栏、全屏内容、触摸优化
 */
export default function MobileLayout({}: MobileLayoutProps) {
  const [currentPage, setCurrentPage] = useState('config'); // 默认显示设备配置
  // 只在桌面端使用日志检测，避免重复请求
  const hasNewLogs = false;
  const markLogsAsRead = () => {};

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部状态栏 */}
      <Header
        isMobile={true}
        showBackButton={false}
        title={getPageTitle(currentPage)}
        onNotifications={handleNotificationClick}
        onSettings={handleSettingsClick}
        hasNewLogs={hasNewLogs}
      />

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto"
          >
            <div className="p-4 pb-20"> {/* 底部留出导航栏空间 */}
              {renderPageContent(currentPage)}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 底部导航栏 */}
      <BottomNav 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />



    </div>
  );
}

/**
 * 获取页面标题
 */
function getPageTitle(page: string): string {
  const titles: Record<string, string> = {
    dashboard: '控制面板',
    tasks: '任务编排',
    logs: '系统日志',
    config: '设备配置'
  };
  
  return titles[page] || '仿生蝠鲼控制';
}
