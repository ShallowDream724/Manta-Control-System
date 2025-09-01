import { motion } from 'framer-motion';
import { TrashIcon, CogIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig } from '../types/device';

interface DeviceListItemProps {
  device: DeviceConfig;
  onEdit: (device: DeviceConfig) => void;
  onDelete: (deviceId: string) => void;
}

export function DeviceListItem({ device, onEdit, onDelete }: DeviceListItemProps) {
  const getDeviceTypeLabel = (type: string) => {
    switch (type) {
      case 'pump': return '泵';
      case 'valve': return '阀门';
      default: return type;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'digital': return '数字';
      case 'pwm': return 'PWM';
      default: return mode;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pump':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case 'valve':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <CogIcon className="w-6 h-6 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getDeviceIcon(device.type)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {device.name}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {getDeviceTypeLabel(device.type)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              ID: <span className="font-mono">{device.id}</span>
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-500">引脚:</span>
                <span className="ml-1 font-medium">{device.pin}</span>
              </div>
              
              <div>
                <span className="text-gray-500">模式:</span>
                <span className="ml-1 font-medium">{getModeLabel(device.mode)}</span>
              </div>
              
              {device.mode === 'pwm' && device.pwmFrequency && (
                <div>
                  <span className="text-gray-500">频率:</span>
                  <span className="ml-1 font-medium">{device.pwmFrequency}Hz</span>
                </div>
              )}
              
              {device.type === 'pump' && device.maxPower && (
                <div>
                  <span className="text-gray-500">功率:</span>
                  <span className="ml-1 font-medium">{device.maxPower}%</span>
                </div>
              )}
            </div>
            
            {device.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {device.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(device)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="编辑设备"
          >
            <CogIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => onDelete(device.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除设备"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
