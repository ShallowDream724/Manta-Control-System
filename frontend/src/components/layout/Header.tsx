import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  WifiIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface HeaderProps {
  title: string;
  isMobile?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  showSettings?: boolean;
  onSettings?: () => void;
  onNotifications?: () => void;
  hasNewLogs?: boolean;
}

/**
 * 通用头部组件
 * 支持移动端和桌面端不同样式
 */
export default function Header({
  title,
  isMobile = false,
  showBackButton = false,
  onBack,
  showSettings = true,
  onSettings,
  onNotifications,
  hasNewLogs = false
}: HeaderProps) {
  return (
    <header className={`
      bg-white border-b border-gray-200
      ${isMobile ? 'h-14' : 'h-16'}
      flex items-center justify-between px-4
    `}>
      {/* 左侧 */}
      <div className="flex items-center space-x-3">
        {showBackButton && (
          <motion.button
            onClick={onBack}
            whileTap={{ scale: 0.95 }}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 touch-feedback"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </motion.button>
        )}
        
        <div>
          <h1 className={`
            font-semibold text-gray-900
            ${isMobile ? 'text-lg' : 'text-xl'}
          `}>
            {title}
          </h1>
        </div>
      </div>

      {/* 右侧 */}
      <div className="flex items-center space-x-2">
        {/* 连接状态指示器 */}
        <ConnectionStatus />
        
        {/* 通知按钮 - 点击跳转到日志页面 */}
        <motion.button
          onClick={onNotifications}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg hover:bg-gray-100 touch-feedback relative"
          title="查看系统日志"
        >
          <BellIcon className="w-5 h-5 text-gray-600" />
          {/* 新日志红点提示 */}
          {hasNewLogs && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </motion.button>

        {/* 设置按钮 - 点击跳转到设备配置 */}
        {showSettings && (
          <motion.button
            onClick={onSettings}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
            title="设备配置"
          >
            <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
          </motion.button>
        )}
      </div>
    </header>
  );
}

/**
 * 连接状态组件
 */
function ConnectionStatus() {
  // TODO: 从状态管理获取实际连接状态
  const isConnected = true;
  const signalStrength = 3; // 0-4

  return (
    <div className="flex items-center space-x-1">
      {/* WiFi状态 */}
      <div className="relative">
        <WifiIcon 
          className={`w-4 h-4 ${
            isConnected ? 'text-green-500' : 'text-gray-400'
          }`} 
        />
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-6 bg-red-500 rotate-45"></div>
          </div>
        )}
      </div>

      {/* 信号强度 */}
      <div className="flex items-end space-x-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`
              w-1 bg-current transition-colors duration-200
              ${bar <= signalStrength ? 'text-green-500' : 'text-gray-300'}
            `}
            style={{ height: `${bar * 2 + 2}px` }}
          />
        ))}
      </div>
    </div>
  );
}
