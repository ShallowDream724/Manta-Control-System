import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig } from '../types/device';

interface DeviceEditFormProps {
  device: Partial<DeviceConfig> | null;
  devices: DeviceConfig[];
  onSave: (device: DeviceConfig) => Promise<void>;
  onCancel: () => void;
}

export function DeviceEditForm({ device, devices, onSave, onCancel }: DeviceEditFormProps) {
  const [formData, setFormData] = useState<Partial<DeviceConfig>>({
    id: '',
    name: '',
    type: 'pump',
    pin: 0,
    mode: 'digital',
    pwmFrequency: 490,
    maxPower: 100,
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData(device);
    } else {
      setFormData({
        id: '',
        name: '',
        type: 'pump',
        pin: 0,
        mode: 'digital',
        pwmFrequency: 490,
        maxPower: 100,
        description: ''
      });
    }
    setErrors({});
  }, [device]);

  const validateDevice = (deviceData: Partial<DeviceConfig>): Record<string, string> => {
    const validationErrors: Record<string, string> = {};

    if (!deviceData.name?.trim()) {
      validationErrors.name = '设备名称不能为空';
    }

    if (!deviceData.id?.trim()) {
      validationErrors.id = '设备ID不能为空';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(deviceData.id)) {
      validationErrors.id = '设备ID只能包含字母、数字、下划线和连字符';
    } else if (devices.some(d => d.id === deviceData.id && d.id !== device?.id)) {
      validationErrors.id = '设备ID已存在';
    }

    if (deviceData.pin === undefined || deviceData.pin < 0 || deviceData.pin > 50) {
      validationErrors.pin = '引脚号必须在0-50之间';
    } else if (devices.some(d => d.pin === deviceData.pin && d.id !== device?.id)) {
      validationErrors.pin = '引脚号已被其他设备使用';
    }

    if (deviceData.type === 'pump') {
      if (deviceData.mode === 'pwm') {
        if (!deviceData.pwmFrequency || deviceData.pwmFrequency < 100 || deviceData.pwmFrequency > 10000) {
          validationErrors.pwmFrequency = 'PWM频率必须在100-10000Hz之间';
        }
        if (!deviceData.maxPower || deviceData.maxPower < 1 || deviceData.maxPower > 100) {
          validationErrors.maxPower = '最大功率必须在1-100%之间';
        }
      }
    }

    return validationErrors;
  };

  const handleInputChange = (field: keyof DeviceConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateDevice(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      const deviceConfig: DeviceConfig = {
        id: formData.id!,
        name: formData.name!,
        type: formData.type!,
        pin: formData.pin!,
        mode: formData.mode!,
        description: formData.description || '',
        ...(formData.type === 'pump' && formData.mode === 'pwm' && {
          pwmFrequency: formData.pwmFrequency!,
          maxPower: formData.maxPower!
        })
      };

      await onSave(deviceConfig);
    } catch (error) {
      console.error('Failed to save device:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg shadow-lg p-6 mb-6"
    >
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {device ? '编辑设备' : '添加设备'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 设备ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              设备ID *
            </label>
            <input
              type="text"
              value={formData.id || ''}
              onChange={(e) => handleInputChange('id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.id ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="例如: pump_1"
              disabled={!!device} // 编辑时不允许修改ID
            />
            {errors.id && <p className="text-red-500 text-sm mt-1">{errors.id}</p>}
          </div>

          {/* 设备名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              设备名称 *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="例如: 主充气泵"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* 设备类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              设备类型 *
            </label>
            <select
              value={formData.type || 'pump'}
              onChange={(e) => handleInputChange('type', e.target.value as 'pump' | 'valve')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pump">泵</option>
              <option value="valve">阀门</option>
            </select>
          </div>

          {/* 引脚号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              引脚号 *
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={formData.pin || ''}
              onChange={(e) => handleInputChange('pin', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.pin ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0-50"
            />
            {errors.pin && <p className="text-red-500 text-sm mt-1">{errors.pin}</p>}
          </div>

          {/* 控制模式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              控制模式 *
            </label>
            <select
              value={formData.mode || 'digital'}
              onChange={(e) => handleInputChange('mode', e.target.value as 'digital' | 'pwm')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="digital">数字</option>
              <option value="pwm">PWM</option>
            </select>
          </div>

          {/* PWM频率 - 仅在PWM模式下显示 */}
          {formData.mode === 'pwm' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PWM频率 (Hz) *
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                value={formData.pwmFrequency || ''}
                onChange={(e) => handleInputChange('pwmFrequency', parseInt(e.target.value) || 490)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pwmFrequency ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="490"
              />
              {errors.pwmFrequency && <p className="text-red-500 text-sm mt-1">{errors.pwmFrequency}</p>}
            </div>
          )}

          {/* 最大功率 - 仅在泵类型且PWM模式下显示 */}
          {formData.type === 'pump' && formData.mode === 'pwm' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大功率 (%) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.maxPower || ''}
                onChange={(e) => handleInputChange('maxPower', parseInt(e.target.value) || 100)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxPower ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="100"
              />
              {errors.maxPower && <p className="text-red-500 text-sm mt-1">{errors.maxPower}</p>}
            </div>
          )}
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="设备描述信息..."
          />
        </div>

        {/* 按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <XMarkIcon className="w-4 h-4 mr-2 inline" />
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4 mr-2 inline" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
