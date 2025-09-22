import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { ActionItemProps } from '../../../types/task-orchestrator';
import { updateActionName } from '../../../utils/task-orchestrator';
import DeviceIcon from '../../config/DeviceIcon';

// 震动反馈函数
const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50); // 50ms 轻微震动
  }
};

interface SwipeableActionItemProps extends ActionItemProps {
  // 继承所有 ActionItemProps
}

/**
 * 支持左滑删除的移动端动作项组件
 * - 点击进入编辑模式
 * - 左滑删除（带震动反馈）
 * - 流畅的动画效果
 */
export default function SwipeableActionItem({
  action,
  devices,
  onUpdate,
  onDelete
}: SwipeableActionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(action.value);
  const [editDuration, setEditDuration] = useState(action.duration / 1000);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  // 滑动相关状态
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 删除阈值（滑动距离）
  const DELETE_THRESHOLD = 80;
  
  // 背景颜色变化
  const backgroundColor = useTransform(
    x,
    [-DELETE_THRESHOLD, -DELETE_THRESHOLD * 0.5, 0],
    ['rgb(239, 68, 68)', 'rgb(248, 113, 113)', 'rgb(255, 255, 255)']
  );

  // 获取设备信息
  const device = devices.find(d => d.id === action.deviceId);
  if (!device) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <span className="text-red-600 text-sm">设备不存在: {action.deviceId}</span>
      </div>
    );
  }

  // 保存编辑
  const saveEdit = () => {
    const newValue = device.type === 'pwm' ? Number(editValue) : Boolean(editValue);
    // 统一到0.1s精度，避免浮点误差
    const newDuration = Math.round(editDuration * 10) * 100;
    
    const updatedAction = updateActionName({
      ...action,
      value: newValue,
      duration: newDuration
    }, device);

    onUpdate(updatedAction);
    setIsEditing(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditValue(action.value);
    setEditDuration(action.duration / 1000);
    setIsEditing(false);
  };

  // 处理滑动
  const handlePan = (_event: any, info: PanInfo) => {
    const newX = info.offset.x;
    
    // 只允许向左滑动
    if (newX <= 0) {
      x.set(newX);
      
      // 震动反馈
      if (newX <= -DELETE_THRESHOLD && !hasTriggeredHaptic) {
        hapticFeedback();
        setHasTriggeredHaptic(true);
      } else if (newX > -DELETE_THRESHOLD && hasTriggeredHaptic) {
        setHasTriggeredHaptic(false);
      }
    }
  };

  // 处理滑动结束
  const handlePanEnd = (_event: any, info: PanInfo) => {
    const newX = info.offset.x;
    
    if (newX <= -DELETE_THRESHOLD) {
      // 触发删除
      onDelete();
    } else {
      // 回弹
      x.set(0);
      setHasTriggeredHaptic(false);
    }
  };

  // 点击进入编辑模式（仅在非编辑状态下）
  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  // 重置滑动状态
  useEffect(() => {
    return () => {
      x.set(0);
      setHasTriggeredHaptic(false);
    };
  }, [x]);

  if (isEditing) {
    // 编辑模式 - 不支持滑动
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="p-3 space-y-3">
          {/* 设备信息头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DeviceIcon iconId={device.icon} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-900">{device.name}</span>
            </div>
          </div>

          {/* 编辑表单 */}
          <div className="space-y-2">
            {device.type === 'pwm' ? (
              <div>
                <label className="block text-xs text-gray-600 mb-1">PWM 值 (0-255)</label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={editValue as number}
                  onChange={(e) => setEditValue(Number(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-600 mb-1">状态</label>
                <select
                  value={editValue ? 'true' : 'false'}
                  onChange={(e) => setEditValue(e.target.value === 'true')}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">开启</option>
                  <option value="false">关闭</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 mb-1">持续时间 (秒)</label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                min="0"
                max="3600"
                step="0.1"
                value={editDuration}
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  const num = Number(v);
                  const rounded = isNaN(num) ? 0 : Math.round(num * 10) / 10;
                  setEditDuration(rounded);
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-2">
            <motion.button
              onClick={saveEdit}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存
            </motion.button>
            <motion.button
              onClick={cancelEdit}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 显示模式 - 支持滑动删除和点击编辑，使用原来的UI样式
  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      {/* 删除背景 */}
      <motion.div
        style={{ backgroundColor }}
        className="absolute inset-0 flex items-center justify-end pr-4"
      >
        <span className="text-white font-medium text-sm">删除</span>
      </motion.div>

      {/* 主内容 - 完全匹配原来的ActionItem样式 */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -DELETE_THRESHOLD * 1.5, right: 0 }}
        dragElastic={0.1}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative z-10"
      >
        {/* 显示模式 - 紧凑小卡片 */}
        <div className="p-2">
          {/* 卡片头部 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <DeviceIcon iconId={device.icon} className="w-4 h-4" />
              <span className="font-medium text-gray-900 text-sm">{device.name}</span>
            </div>
            {/* 移动端不显示编辑删除按钮 */}
          </div>

          {/* 参数显示 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {device.type === 'pwm' ? (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {action.value}%
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded ${
                  action.value
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {action.value ? '开启' : '关闭'}
                </span>
              )}
              <span className="text-gray-500">
                {(action.duration / 1000).toFixed(1)}秒
              </span>
            </div>
            <span className="text-gray-400">引脚{device.pin}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
