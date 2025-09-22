import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { ActionItemProps } from '../../../types/task-orchestrator';
import { updateActionName } from '../../../utils/task-orchestrator';
import DeviceIcon from '../../config/DeviceIcon';

/**
 * 动作项组件
 * 显示和编辑单个设备动作
 */
export default function ActionItem({
  action,
  devices,
  onUpdate,
  onDelete
}: ActionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(action.value);
  const [editDuration, setEditDuration] = useState(action.duration / 1000); // 转换为秒

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
    const newDuration = Math.round(editDuration * 10) * 100; // 转换为毫秒（0.1s精度）
    
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



  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      {isEditing ? (
        /* 编辑模式 - 紧凑卡片 */
        <div className="p-3 space-y-3">
          {/* 设备信息头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DeviceIcon iconId={device.icon} className="w-4 h-4" />
              <span className="font-medium text-gray-900 text-sm">{device.name}</span>
            </div>
            <div className="text-xs text-gray-500">引脚 {device.pin}</div>
          </div>

          {/* 参数设置 */}
          <div className="space-y-2">
            {/* 值设置 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {device.type === 'pwm' ? '功率' : '状态'}
              </label>
              {device.type === 'pwm' ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editValue as number}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-medium text-blue-600 min-w-[3rem]">{editValue}%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setEditValue(true)}
                      className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors ${
                        editValue
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      开启
                    </button>
                    <button
                      onClick={() => setEditValue(false)}
                      className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors ${
                        !editValue
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      关闭
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">💡 常闭式：开启=通电</p>
                </div>
              )}
            </div>

            {/* 持续时间设置 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                持续时间 (秒)
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                min="0.1"
                max="3600"
                step="0.1"
                value={editDuration}
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  const num = Number(v);
                  const rounded = isNaN(num) ? 0 : Math.round(num * 10) / 10; // 立刻四舍五入到1位小数
                  setEditDuration(rounded);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-1">
            <motion.button
              onClick={cancelEdit}
              whileTap={{ scale: 0.95 }}
              className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              取消
            </motion.button>
            <motion.button
              onClick={saveEdit}
              whileTap={{ scale: 0.95 }}
              className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              保存
            </motion.button>
          </div>
        </div>
      ) : (
        /* 显示模式 - 桌面端稍大的卡片 */
        <div className="p-3">
          {/* 卡片头部 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <DeviceIcon iconId={device.icon} className="w-5 h-5" />
              <span className="font-medium text-gray-900 text-base">{device.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <motion.button
                onClick={() => setIsEditing(true)}
                whileTap={{ scale: 0.95 }}
                className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                title="编辑动作"
              >
                <PencilIcon className="w-3 h-3" />
              </motion.button>
              <motion.button
                onClick={onDelete}
                whileTap={{ scale: 0.95 }}
                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                title="删除动作"
              >
                <TrashIcon className="w-3 h-3" />
              </motion.button>
            </div>
          </div>

          {/* 参数显示 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {device.type === 'pwm' ? (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {action.value}%
                </span>
              ) : (
                <span className={`px-2 py-1 rounded text-sm ${
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
      )}
    </motion.div>
  );
}
