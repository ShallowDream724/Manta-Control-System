/**
 * 设备选择弹窗组件
 * 使用Portal渲染，确保在任何嵌套层级下都能正确显示
 * 支持动态定位，跟随触发按钮位置
 */

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DeviceConfig, DeviceGroup } from '../../types';
import { useElementPosition, calculatePopoverPosition } from '../../hooks/useElementPosition';
import Portal from './Portal';

interface DeviceSelectionPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDevice: (deviceId: string) => void;
  triggerRef: RefObject<HTMLElement | null>;
  devices: DeviceConfig[];
  groups: DeviceGroup[];
  groupId?: string; // 如果指定了groupId，只显示该分组的设备
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export default function DeviceSelectionPopover({
  isOpen,
  onClose,
  onSelectDevice,
  triggerRef,
  devices,
  groups,
  groupId,
  title = '选择设备',
  placement = 'bottom'
}: DeviceSelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverSize, setPopoverSize] = useState({ width: 200, height: 100 });
  
  // 跟踪触发按钮位置
  const { position: triggerPosition } = useElementPosition(triggerRef, {
    enabled: isOpen,
    offset: { x: 0, y: 0 }
  });

  // 过滤设备
  const filteredDevices = groupId 
    ? devices.filter(d => d.groupId === groupId)
    : devices;

  const selectedGroup = groupId ? groups.find(g => g.id === groupId) : null;

  // 计算弹窗位置
  const popoverPosition = triggerPosition && popoverSize ? 
    calculatePopoverPosition(triggerPosition, popoverSize, placement, 8) : 
    { x: 0, y: 0, placement };

  // 测量弹窗尺寸
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      setPopoverSize({
        width: rect.width || 200,
        height: rect.height || 100
      });
    }
  }, [isOpen, filteredDevices.length]);

  // 处理设备选择
  const handleDeviceSelect = (deviceId: string) => {
    onSelectDevice(deviceId);
    onClose();
  };

  // 处理点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !triggerPosition) {
    return null;
  }

  return (
    <Portal>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 z-[9998] bg-black bg-opacity-10" />
      
      {/* 弹窗内容 */}
      <AnimatePresence>
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl min-w-48 max-w-xs"
          style={{
            left: popoverPosition.x,
            top: popoverPosition.y,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 2rem)'
          }}
        >
          {/* 头部 */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">
              {selectedGroup ? `选择${selectedGroup.name}设备` : title}
            </h3>
          </div>

          {/* 设备列表 */}
          <div className="max-h-64 overflow-y-auto">
            {filteredDevices.length > 0 ? (
              <div className="p-2 space-y-1">
                {filteredDevices.map((device) => (
                  <motion.button
                    key={device.id}
                    onClick={() => handleDeviceSelect(device.id)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    {/* 设备图标 */}
                    <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    
                    {/* 设备信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm group-hover:text-blue-900 truncate">
                        {device.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        引脚 {device.pin} · {device.type === 'pwm' ? 'PWM' : '数字'}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">该分组暂无设备</p>
              </div>
            )}
          </div>

          {/* 底部信息 */}
          {filteredDevices.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              共 {filteredDevices.length} 个设备
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
