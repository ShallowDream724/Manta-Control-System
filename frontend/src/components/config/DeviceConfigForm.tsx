import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig, DeviceGroup } from '../../types';
import { validateDeviceConfig } from '../../utils/deviceConfig';
import PinSelector from './PinSelector';
import DeviceTypeSelector from './DeviceTypeSelector';
import IconSelector from './IconSelector';

// 获取设备名称建议
function getNameSuggestions(type: 'pwm' | 'digital'): string[] {
  if (type === 'pwm') {
    return ['充气泵1', '充气泵2', '抽气泵1', '抽气泵2', '调速风扇', '水泵'];
  } else {
    return ['电磁阀1', '电磁阀2', '继电器1', '继电器2', '开关1', '开关2'];
  }
}

interface DeviceConfigFormProps {
  device: DeviceConfig;
  devices: DeviceConfig[];
  groups: DeviceGroup[];
  onSave: (device: DeviceConfig) => void;
  onCancel: () => void;
  isMobile: boolean;
}

/**
 * 设备配置表单组件
 * 支持编辑设备的所有配置项，实时验证
 */
export default function DeviceConfigForm({
  device,
  devices,
  groups,
  onSave,
  onCancel,
  isMobile
}: DeviceConfigFormProps) {
  const [formData, setFormData] = useState<DeviceConfig>(device);
  const [validationResult, setValidationResult] = useState(
    validateDeviceConfig([formData])
  );

  // 实时验证表单数据
  useEffect(() => {
    // 创建临时设备列表用于验证
    const tempDevices = devices.map(d => 
      d.id === formData.id ? formData : d
    );
    const result = validateDeviceConfig(tempDevices);
    setValidationResult(result);
  }, [formData, devices]);

  // 更新表单字段
  const updateField = (field: keyof DeviceConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 保存配置
  const handleSave = () => {
    if (validationResult.isValid) {
      onSave(formData);
    }
  };

  // 检查特定字段是否有错误
  const hasFieldError = (field: string) => {
    return validationResult.errors.some(error => 
      error.toLowerCase().includes(field.toLowerCase())
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto
          ${isMobile ? 'max-w-sm' : 'max-w-md'}
        `}
      >
        {/* 表单头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            编辑设备: {device.name}
          </h2>
          <motion.button
            onClick={onCancel}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-6">
          {/* 设备名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设备名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                ${hasFieldError('名称') ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              `}
              placeholder="请输入设备名称"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/20 字符
            </p>

            {/* 快捷名称选项 */}
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-2">快捷选项:</p>
              <div className="flex flex-wrap gap-2">
                {getNameSuggestions(formData.type).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => updateField('name', suggestion)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 设备类型选择器 */}
          <DeviceTypeSelector
            value={formData.type}
            onChange={(type) => {
              updateField('type', type);
            }}
          />

          {/* 引脚选择器 */}
          <PinSelector
            value={formData.pin}
            onChange={(pin) => updateField('pin', pin)}
            devices={devices}
            excludeDeviceId={formData.id}
            hasError={hasFieldError('引脚')}
          />

          {/* 图标选择器 */}
          <IconSelector
            value={formData.icon || 'bolt'}
            onChange={(icon) => updateField('icon', icon)}
          />

          {/* 设备分组 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设备分组
            </label>
            <select
              value={formData.groupId || ''}
              onChange={(e) => updateField('groupId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">无分组</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              选择设备所属的分组，用于任务编排时的快速选择
            </p>
          </div>

          {/* 设备描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述信息
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="可选的设备描述信息"
              rows={3}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.description || '').length}/100 字符
            </p>
          </div>

          {/* 验证结果显示 */}
          {!validationResult.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-medium text-red-900 text-sm mb-1">配置错误</h4>
              <ul className="text-xs text-red-700 space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-medium text-yellow-900 text-sm mb-1">配置建议</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.isValid && validationResult.warnings.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">✓ 配置有效</p>
            </div>
          )}
        </div>

        {/* 表单底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <motion.button
            onClick={onCancel}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </motion.button>
          
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: 0.95 }}
            disabled={!validationResult.isValid}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${validationResult.isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            保存
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
