import React from 'react';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  CogIcon, 
  DocumentTextIcon, 
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CogIcon as CogIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconSolid
} from '@heroicons/react/24/solid';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '控制',
    icon: HomeIcon,
    activeIcon: HomeIconSolid
  },
  {
    id: 'tasks',
    label: '任务',
    icon: AdjustmentsHorizontalIcon,
    activeIcon: AdjustmentsHorizontalIconSolid
  },
  {
    id: 'logs',
    label: '日志',
    icon: DocumentTextIcon,
    activeIcon: DocumentTextIconSolid
  },
  {
    id: 'config',
    label: '配置',
    icon: CogIcon,
    activeIcon: CogIconSolid
  }
];

/**
 * 移动端底部导航栏组件
 * iOS风格设计，支持触摸反馈和动画
 */
export default function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = isActive ? item.activeIcon : item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full touch-feedback relative"
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              {/* 活跃状态背景 */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-2 inset-y-1 bg-blue-50 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* 图标 */}
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                  }`} 
                />
                
                {/* 徽章 */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </div>
              
              {/* 标签 */}
              <span 
                className={`text-xs mt-1 transition-colors duration-200 ${
                  isActive 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      
      {/* 安全区域适配 */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
