import React from 'react';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  CogIcon, 
  DocumentTextIcon, 
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CogIcon as CogIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconSolid
} from '@heroicons/react/24/solid';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isTablet?: boolean;
  isDesktop?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '控制面板',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
    description: '设备状态监控和实时控制'
  },
  {
    id: 'tasks',
    label: '任务编排',
    icon: AdjustmentsHorizontalIcon,
    activeIcon: AdjustmentsHorizontalIconSolid,
    description: '创建和管理自动化任务'
  },
  {
    id: 'logs',
    label: '系统日志',
    icon: DocumentTextIcon,
    activeIcon: DocumentTextIconSolid,
    description: '查看系统运行日志'
  },
  {
    id: 'config',
    label: '设备配置',
    icon: CogIcon,
    activeIcon: CogIconSolid,
    description: '管理设备配置和系统设置'
  }
];

/**
 * 侧边导航栏组件
 * 支持平板和桌面端，可折叠
 */
export default function Sidebar({ 
  currentPage, 
  onPageChange, 
  collapsed = false,
  onToggleCollapse,
  isTablet = false,
  isDesktop = false
}: SidebarProps) {
  return (
    <nav className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">仿生蝠鲼控制</h2>
                <p className="text-xs text-gray-500">Manta Control</p>
              </div>
            </motion.div>
          )}
          
          {collapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">MC</span>
            </div>
          )}

          {/* 折叠按钮 (仅桌面端) */}
          {isDesktop && onToggleCollapse && (
            <motion.button
              onClick={onToggleCollapse}
              whileTap={{ scale: 0.95 }}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              {collapsed ? (
                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = isActive ? item.activeIcon : item.icon;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-left
                  transition-colors duration-200 group relative
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                whileTap={{ scale: 0.98 }}
                title={collapsed ? item.label : undefined}
              >
                {/* 活跃状态指示器 */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                {/* 图标 */}
                <div className="flex-shrink-0">
                  <Icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
                </div>
                
                {/* 标签和描述 */}
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ml-3 flex-1 min-w-0"
                  >
                    <div className="font-medium">{item.label}</div>
                    {!isTablet && item.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </motion.div>
                )}
                
                {/* 徽章 */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`
                      bg-red-500 text-white text-xs rounded-full 
                      w-5 h-5 flex items-center justify-center
                      ${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
                    `}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 底部状态 */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Arduino已连接</span>
            </div>
            <div className="text-xs text-gray-500">
              运行时间: 2小时15分
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        )}
      </div>
    </nav>
  );
}
