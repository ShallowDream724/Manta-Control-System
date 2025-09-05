import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import DeviceConfigManager from '../config/DeviceConfigManager';
import TaskEditor from '../task-orchestrator/TaskEditor';
import DashboardDemo from '../demo/DashboardDemo';
import SystemLogs from '../logs/SystemLogs';
// 删除：避免多个Hook实例导致重复请求

interface TabletLayoutProps {}

/**
 * 平板端布局组件
 * 特点：侧边导航栏、双列布局、分屏支持
 */
export default function TabletLayout({}: TabletLayoutProps) {
  const [currentPage, setCurrentPage] = useState('config'); // 默认显示设备配置
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false); // 是否正在拖拽
  const [dragStartTime, setDragStartTime] = useState(0); // 拖拽开始时间
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
    <div className="h-screen bg-gray-50 flex">
      {/* 侧边导航栏 */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 350,
              mass: 0.7
            }}
            className="w-70 bg-white border-r border-gray-200 flex-shrink-0"
          >
            <Sidebar 
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              isTablet={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      <motion.div
        className="flex-1 flex flex-col min-w-0"
        animate={{
          scale: sidebarOpen ? 0.94 : 1,
          x: sidebarOpen ? 20 : 0
        }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 350,
          mass: 0.7
        }}
        style={{
          transformOrigin: "left center",
          borderRadius: sidebarOpen ? '12px' : '0px'
        }}
      >
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
        <main className="flex-1 overflow-hidden">
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
              className="h-full overflow-y-auto"
            >
              <div className="p-6">
                {renderPageContent(currentPage)}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      {/* 可拖拽侧边栏切换按钮 */}
      <motion.button
        className="fixed z-50 p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 select-none"
        style={{
          left: 16,
          top: 16,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          left: 8,
          right: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 56),
          top: 8,
          bottom: Math.max(8, (typeof window !== 'undefined' ? window.innerHeight : 768) - 56)
        }}
        onDragStart={() => {
          setIsDragging(true);
          setDragStartTime(Date.now());
        }}
        onDragEnd={(_, info) => {
          const dragDuration = Date.now() - dragStartTime;
          const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);

          // 延迟重置拖拽状态，避免误触点击
          setTimeout(() => {
            setIsDragging(false);
          }, dragDuration > 200 || dragDistance > 10 ? 150 : 50);
        }}
        onClick={(e) => {
          e.stopPropagation();
          // 只有在没有拖拽时才响应点击
          if (!isDragging) {
            setSidebarOpen(!sidebarOpen);
          }
        }}
        whileDrag={{
          scale: 1.08,
          zIndex: 100,
          boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
          rotate: 2
        }}
        whileTap={!isDragging ? {
          scale: 0.92,
          rotate: -1
        } : {}}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 400
        }}
      >
        <svg
          className="w-6 h-6 text-gray-600 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </motion.button>


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
