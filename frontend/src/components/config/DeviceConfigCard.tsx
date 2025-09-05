import { motion } from 'framer-motion';
import {
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { DeviceConfig, ConfigValidationResult, DeviceGroup } from '../../types';
import DeviceIcon from './DeviceIcon';

interface DeviceConfigCardProps {
  device: DeviceConfig;
  groups: DeviceGroup[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  validationResult: ConfigValidationResult;
}

/**
 * 设备配置卡片组件
 * 显示单个设备的配置信息和操作按钮
 */
export default function DeviceConfigCard({
  device,
  groups,
  index,
  onEdit,
  onDelete,
  validationResult
}: DeviceConfigCardProps) {
  const isPWM = device.type === 'pwm';
  const deviceGroup = groups.find(group => group.id === device.groupId);

  // 获取设备颜色（优先使用分组颜色，否则使用默认颜色）
  const deviceColor = deviceGroup?.color || (isPWM ? '#3B82F6' : '#10B981');
  const lightColor = deviceColor + '20'; // 20% 透明度
  const darkColor = deviceColor;
  
  // 检查当前设备是否有错误
  const hasError = validationResult.errors.some(error => 
    error.includes(device.name) || error.includes(device.pin.toString())
  );
  
  // 检查当前设备是否有警告
  const hasWarning = validationResult.warnings.some(warning => 
    warning.includes(device.name)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        bg-white rounded-xl border p-4 hover:shadow-lg transition-all duration-200
        ${hasError ? 'border-red-300 bg-red-50' : ''}
        ${hasWarning && !hasError ? 'border-yellow-300 bg-yellow-50' : ''}
        ${!hasError && !hasWarning ? 'border-gray-200' : ''}
      `}
    >
      {/* 设备头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">{device.name}</h3>
            
            {/* 状态指示器 */}
            {hasError && (
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            )}
            {hasWarning && !hasError && (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            )}
            {!hasError && !hasWarning && (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-sm text-gray-500">
              {device.description || '无描述'}
            </p>
            {deviceGroup && (
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: deviceGroup.color + '20',
                  color: deviceGroup.color
                }}
              >
                {deviceGroup.name}
              </span>
            )}
          </div>
        </div>

        {/* 设备图标 */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: lightColor,
            color: darkColor
          }}
        >
          <DeviceIcon
            iconId={device.icon}
            className="w-6 h-6"
          />
        </div>
      </div>

      {/* 设备信息 */}
      <div className="space-y-3">
        {/* 设备类型 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">信号类型</span>
          <span
            className="px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1"
            style={{
              backgroundColor: lightColor,
              color: darkColor
            }}
          >
            {/* PWM/Digital 区分图标 */}
            {isPWM ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4v12h16V4H2zm2 2h12v8H4V6zm2 2v4h2V8H6zm4 0v4h2V8h-2zm4 0v4h2V8h-2z"/>
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10h6v6h4v-6h6V6h-6V0H8v6H2v4z"/>
              </svg>
            )}
            <span>{isPWM ? 'PWM' : 'Digital'}</span>
          </span>
        </div>

        {/* 引脚信息 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">引脚号码</span>
          <span className={`
            px-2 py-1 rounded text-sm font-mono
            ${hasError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}
          `}>
            {device.pin}
          </span>
        </div>




      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-gray-100">
        <motion.button
          onClick={onEdit}
          whileTap={{ scale: 0.95 }}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="编辑设备"
        >
          <PencilIcon className="w-4 h-4" />
        </motion.button>

        <motion.button
          onClick={onDelete}
          whileTap={{ scale: 0.95 }}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="删除设备"
        >
          <TrashIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
