import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig } from '../../../types';
import DeviceIcon from '../../config/DeviceIcon';

interface DeviceSelectorProps {
  devices: DeviceConfig[];
  onSelect: (deviceId: string) => void;
  label?: string;
  className?: string;
}

/**
 * 设备选择器组件
 * 用于在任务编排中选择要控制的设备
 */
export default function DeviceSelector({
  devices,
  onSelect,
  label = "选择设备",
  className = ""
}: DeviceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤设备
  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按类型分组
  const groupedDevices = filteredDevices.reduce((groups, device) => {
    const type = device.type === 'pwm' ? 'PWM设备' : '数字设备';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(device);
    return groups;
  }, {} as Record<string, DeviceConfig[]>);

  const handleDeviceSelect = (deviceId: string) => {
    console.log('DeviceSelector: 选择设备', deviceId);
    onSelect(deviceId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 调试信息
  console.log('DeviceSelector: 设备列表', devices);

  return (
    <div className={`relative ${className}`}>
      {/* 选择器按钮 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span className="text-gray-700">{label}</span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </motion.button>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
          >
            {/* 搜索框 */}
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="搜索设备..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* 设备列表 */}
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(groupedDevices).map(([groupName, groupDevices]) => (
                <div key={groupName} className="p-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                    {groupName}
                  </h4>
                  <div className="space-y-1">
                    {groupDevices.map((device) => (
                      <motion.button
                        key={device.id}
                        onClick={() => handleDeviceSelect(device.id)}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                      >
                        <DeviceIcon iconId={device.icon} className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 group-hover:text-blue-900">
                            {device.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            引脚 {device.pin} · {device.type === 'pwm' ? 'PWM控制' : '数字控制'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 group-hover:text-blue-500">
                          {device.type === 'pwm' ? '功率' : '开关'}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 空状态 */}
              {filteredDevices.length === 0 && (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V7a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2v-.694z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">
                    {searchTerm ? '未找到匹配的设备' : '暂无可用设备'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      清除搜索
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 设备统计 */}
            {devices.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                共 {devices.length} 个设备 · {devices.filter(d => d.type === 'pwm').length} 个PWM · {devices.filter(d => d.type === 'digital').length} 个数字
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 点击外部关闭 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
