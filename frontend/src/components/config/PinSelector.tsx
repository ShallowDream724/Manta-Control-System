import { useState } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig } from '../../types';
import { isPinAvailable, getRecommendedPins } from '../../utils/deviceConfig';

interface PinSelectorProps {
  value: number;
  onChange: (pin: number) => void;
  devices: DeviceConfig[];
  excludeDeviceId?: string;
  hasError?: boolean;
}

/**
 * 引脚选择器组件
 * 支持数字输入，提供PWM/IO引脚提示和冲突检测
 */
export default function PinSelector({ 
  value, 
  onChange, 
  devices, 
  excludeDeviceId, 
  hasError = false 
}: PinSelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const recommendedPins = getRecommendedPins();
  
  // 检查引脚是否可用
  const isAvailable = isPinAvailable(value, devices, excludeDeviceId);
  
  // 检查是否为推荐的PWM引脚
  const isPWMPin = recommendedPins.pwm.includes(value);

  // 检查是否为推荐的数字引脚
  const isDigitalPin = recommendedPins.digital.includes(value);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // 验证输入值
    const pinNumber = parseInt(newValue);
    if (!isNaN(pinNumber) && pinNumber >= 0 && pinNumber <= 99) {
      onChange(pinNumber);
    }
  };

  // 处理输入失焦
  const handleBlur = () => {
    const pinNumber = parseInt(inputValue);
    if (isNaN(pinNumber) || pinNumber < 0 || pinNumber > 99) {
      // 如果输入无效，恢复到原值
      setInputValue(value.toString());
    }
  };

  // 快速选择推荐引脚
  const handleQuickSelect = (pin: number) => {
    setInputValue(pin.toString());
    onChange(pin);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        引脚号码 *
      </label>
      
      {/* 引脚输入框 */}
      <div className="relative">
        <input
          type="number"
          min="0"
          max="99"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`
            w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${hasError || !isAvailable ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
          placeholder="0-99"
        />
        
        {/* 状态指示器 */}
        <div className="absolute right-3 top-2.5">
          {!isAvailable && (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          )}
          {isAvailable && isPWMPin && (
            <div className="w-2 h-2 bg-purple-500 rounded-full" title="PWM引脚" />
          )}
          {isAvailable && isDigitalPin && !isPWMPin && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="数字引脚" />
          )}
        </div>
      </div>

      {/* 引脚状态提示 */}
      <div className="mt-2 space-y-1">
        {!isAvailable && (
          <div className="flex items-start space-x-2 text-xs text-red-600">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>引脚 {value} 已被其他设备使用</span>
          </div>
        )}
        
        {isAvailable && isPWMPin && (
          <div className="flex items-start space-x-2 text-xs text-purple-600">
            <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>PWM引脚，支持功率控制 (0-100%)</span>
          </div>
        )}
        
        {isAvailable && isDigitalPin && !isPWMPin && (
          <div className="flex items-start space-x-2 text-xs text-blue-600">
            <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>数字引脚，支持开关控制 (HIGH/LOW)</span>
          </div>
        )}
        
        {isAvailable && !isPWMPin && !isDigitalPin && (
          <div className="flex items-start space-x-2 text-xs text-gray-600">
            <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>通用引脚，可用于数字信号</span>
          </div>
        )}
      </div>

      {/* 推荐引脚快速选择 */}
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-700 mb-2">推荐引脚 (基于Arduino UNO R4 WiFi):</p>
        
        {/* PWM引脚 */}
        <div className="mb-2">
          <p className="text-xs text-purple-600 mb-1">PWM引脚:</p>
          <div className="flex flex-wrap gap-1">
            {recommendedPins.pwm.map((pin: number) => (
              <button
                key={pin}
                onClick={() => handleQuickSelect(pin)}
                disabled={!isPinAvailable(pin, devices, excludeDeviceId)}
                className={`
                  px-2 py-1 text-xs rounded border transition-colors
                  ${value === pin 
                    ? 'bg-purple-600 text-white border-purple-600' 
                    : isPinAvailable(pin, devices, excludeDeviceId)
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }
                `}
              >
                {pin}
              </button>
            ))}
          </div>
        </div>

        {/* 数字引脚 */}
        <div>
          <p className="text-xs text-blue-600 mb-1">数字引脚:</p>
          <div className="flex flex-wrap gap-1">
            {recommendedPins.digital.map((pin: number) => (
              <button
                key={pin}
                onClick={() => handleQuickSelect(pin)}
                disabled={!isPinAvailable(pin, devices, excludeDeviceId)}
                className={`
                  px-2 py-1 text-xs rounded border transition-colors
                  ${value === pin 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : isPinAvailable(pin, devices, excludeDeviceId)
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }
                `}
              >
                {pin}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 引脚范围提示 */}
      <p className="text-xs text-gray-500 mt-2">
        有效范围: 0-99，推荐使用上述引脚以获得最佳兼容性
      </p>
    </div>
  );
}
