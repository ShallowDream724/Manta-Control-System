import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig, DeviceGroup } from '../../../types';

interface MobileAddActionButtonProps {
  devices: DeviceConfig[];
  groups: DeviceGroup[];
  onAddAction: (deviceId: string) => void;
  onAddDelay: () => void;
  onAddLoop?: () => void; // 可选，某些容器不支持循环
  className?: string;
  compact?: boolean; // 紧凑模式，用于嵌套容器
}

/**
 * 移动端友好的添加动作按钮
 * 点击后显示多级菜单选择设备、延时、循环
 */
export default function MobileAddActionButton({
  devices,
  groups,
  onAddAction,
  onAddDelay,
  onAddLoop,
  className = "",
  compact = false
}: MobileAddActionButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监测容器宽度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // 只有在极窄的情况下（< 80px）才使用紧凑模式，否则显示完整文字
        setIsCompact(width < 80);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 关闭菜单
  const closeMenu = () => {
    setIsMenuOpen(false);
    setSelectedGroup(null);
  };

  // 处理设备组选择
  const handleGroupSelect = (group: DeviceGroup) => {
    const groupDevices = devices.filter(d => d.groupId === group.id);
    
    if (groupDevices.length === 1) {
      // 只有一个设备，直接添加
      onAddAction(groupDevices[0].id);
      closeMenu();
    } else {
      // 多个设备，显示设备列表
      setSelectedGroup(group.id);
    }
  };

  // 处理设备选择
  const handleDeviceSelect = (deviceId: string) => {
    onAddAction(deviceId);
    closeMenu();
  };

  // 处理延时添加
  const handleAddDelay = () => {
    onAddDelay();
    closeMenu();
  };

  // 处理循环添加
  const handleAddLoop = () => {
    if (onAddLoop) {
      onAddLoop();
      closeMenu();
    }
  };

  // 返回到分组选择
  const backToGroups = () => {
    setSelectedGroup(null);
  };



  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 添加动作按钮 */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        whileTap={{ scale: 0.95 }}
        className={
          isCompact || compact
            ? "flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            : "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        }
        title="添加动作"
      >
        <PlusIcon className="w-4 h-4" />
        {!isCompact && !compact && <span className="text-sm">添加动作</span>}
      </motion.button>

      {/* 多级菜单 */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-25 z-[9998]"
              onClick={closeMenu}
            />

            {/* 菜单内容 - 移动端全屏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 z-[9999] max-h-[80vh] overflow-y-auto"
            >
              {!selectedGroup ? (
                /* 主菜单：设备分组 + 延时 + 循环 */
                <div className="p-6">
                  {/* 顶部拖拽指示器 */}
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

                  <div className="text-lg font-semibold text-gray-800 mb-6 text-center">添加动作</div>
                  
                  {/* 设备分组 */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-600">设备动作</div>
                    <div className="grid gap-3">
                      {groups.map((group) => {
                        const groupDevices = devices.filter(d => d.groupId === group.id);
                        if (groupDevices.length === 0) return null;

                        return (
                          <motion.button
                            key={group.id}
                            onClick={() => handleGroupSelect(group)}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="text-base font-medium">{group.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                {groupDevices.length} 个设备
                              </span>
                              {groupDevices.length > 1 && (
                                <span className="text-gray-400">›</span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-gray-200 my-6" />

                  {/* 延时和循环 */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-600">其他操作</div>
                    <div className="grid gap-3">
                      <motion.button
                        onClick={handleAddDelay}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center space-x-3 p-4 text-left bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors border border-orange-200"
                      >
                        <ClockIcon className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="text-base font-medium text-orange-800">延时</div>
                          <div className="text-sm text-orange-600">添加等待时间</div>
                        </div>
                      </motion.button>

                      {onAddLoop && (
                        <motion.button
                          onClick={handleAddLoop}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center space-x-3 p-4 text-left bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
                        >
                          <ArrowPathIcon className="w-5 h-5 text-purple-600" />
                          <div>
                            <div className="text-base font-medium text-purple-800">循环</div>
                            <div className="text-sm text-purple-600">重复执行动作</div>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 设备选择子菜单 */
                <div className="p-6">
                  {/* 顶部拖拽指示器 */}
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

                  <div className="flex items-center space-x-3 mb-6">
                    <motion.button
                      onClick={backToGroups}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      ←
                    </motion.button>
                    <span className="text-lg font-semibold text-gray-800">选择设备</span>
                  </div>

                  <div className="grid gap-3">
                    {devices
                      .filter(d => d.groupId === selectedGroup)
                      .map((device) => (
                        <motion.button
                          key={device.id}
                          onClick={() => handleDeviceSelect(device.id)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                        >
                          <span className="text-base font-medium">{device.name}</span>
                          <span className="text-sm text-gray-500">引脚 {device.pin}</span>
                        </motion.button>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
