import React from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import { DEFAULT_DEVICES } from '../../types';
import DeviceIcon from '../config/DeviceIcon';

/**
 * 控制面板演示组件
 * 展示三端适配的设备控制界面
 */
export default function DashboardDemo() {
  const { breakpoint, isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            控制面板
          </h1>
          <p className="text-gray-600 mt-1">
            当前断点: <span className="font-medium">{breakpoint}</span>
          </p>
        </div>
        
        {/* 连接状态 */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Arduino已连接</span>
        </div>
      </div>

      {/* 设备网格 */}
      <div className={`
        grid gap-4
        ${isMobile ? 'grid-cols-1' : ''}
        ${isTablet ? 'grid-cols-2' : ''}
        ${isDesktop ? 'grid-cols-3' : ''}
      `}>
        {DEFAULT_DEVICES.map((device, index) => (
          <DeviceCard
            key={device.id}
            device={device}
            index={index}
          />
        ))}
      </div>

      {/* 系统状态卡片 */}
      <div className={`
        grid gap-4
        ${isMobile ? 'grid-cols-2' : ''}
        ${isTablet ? 'grid-cols-3' : ''}
        ${isDesktop ? 'grid-cols-4' : ''}
      `}>
        <StatusCard title="运行时间" value="2小时15分" />
        <StatusCard title="活跃设备" value="6/6" />
        <StatusCard title="任务队列" value="0" />
        <StatusCard title="内存使用" value="45%" />
      </div>

      {/* 布局说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">三端适配说明</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>手机端 (&lt;768px):</strong> 单列布局 + 底部导航</p>
          <p><strong>平板端 (768px-1024px):</strong> 双列布局 + 侧边导航</p>
          <p><strong>桌面端 (&gt;1024px):</strong> 三列布局 + 固定侧边栏 + 右侧面板</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 设备控制卡片组件
 */
function DeviceCard({ device, index }: {
  device: typeof DEFAULT_DEVICES[0];
  index: number;
}) {
  const isPWM = device.type === 'pwm';
  const [isActive, setIsActive] = React.useState(false);
  const [power, setPower] = React.useState(50);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
    >
      {/* 设备头部 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{device.name}</h3>
          <p className="text-sm text-gray-500">引脚 {device.pin}</p>
        </div>
        
        {/* 设备图标 */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center
          ${isPWM ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}
        `}>
          <DeviceIcon
            iconId={device.icon}
            className="w-6 h-6"
          />
        </div>
      </div>

      {/* 控制区域 */}
      <div className="space-y-3">
        {/* 开关控制 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">状态</span>
          <motion.button
            onClick={() => setIsActive(!isActive)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${isActive ? 'bg-blue-600' : 'bg-gray-300'}
            `}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
              animate={{ x: isActive ? 26 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        {/* 功率控制 (仅PWM设备) */}
        {isPWM && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">功率</span>
              <span className="text-sm text-gray-900">{power}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              disabled={!isActive}
            />
          </div>
        )}

        {/* 定时控制 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">定时</span>
          <select className="text-sm border border-gray-300 rounded px-2 py-1">
            <option value="0">常开</option>
            <option value="5">5秒</option>
            <option value="10">10秒</option>
            <option value="30">30秒</option>
            <option value="60">1分钟</option>
          </select>
        </div>
      </div>

      {/* 状态指示器 */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">在线状态</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-600">在线</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 状态卡片组件
 */
function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
