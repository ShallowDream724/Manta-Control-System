
import { motion } from 'framer-motion';

interface DeviceTypeSelectorProps {
  value: 'pwm' | 'digital';
  onChange: (type: 'pwm' | 'digital') => void;
}

/**
 * 设备类型选择器组件
 * 提供泵和阀两种设备类型的选择
 */
export default function DeviceTypeSelector({ value, onChange }: DeviceTypeSelectorProps) {
  const options = [
    {
      type: 'pwm' as const,
      label: 'PWM设备',
      icon: '⚡',
      description: '支持功率控制的PWM设备',
      features: ['功率控制 (0-100%)', 'PWM信号', '定时运行'],
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-100'
    },
    {
      type: 'digital' as const,
      label: 'Digital设备',
      icon: '🔧',
      description: '开关控制的数字设备',
      features: ['开关控制', '数字信号', '定时开关'],
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconBg: 'bg-green-100'
    }
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        设备类型 *
      </label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.type;
          
          return (
            <motion.button
              key={option.type}
              onClick={() => onChange(option.type)}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all duration-200
                ${isSelected 
                  ? `${option.bgColor} ${option.borderColor} shadow-md` 
                  : 'bg-white border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* 选中指示器 */}
              {isSelected && (
                <motion.div
                  layoutId="selectedType"
                  className="absolute top-2 right-2 w-3 h-3 bg-blue-600 rounded-full"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* 设备图标和标题 */}
              <div className="flex items-center space-x-3 mb-2">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center text-lg
                  ${isSelected ? option.iconBg : 'bg-gray-100'}
                `}>
                  {option.icon}
                </div>
                <div>
                  <h3 className={`
                    font-semibold
                    ${isSelected ? option.textColor : 'text-gray-900'}
                  `}>
                    {option.label}
                  </h3>
                  <p className={`
                    text-xs
                    ${isSelected ? option.textColor : 'text-gray-500'}
                  `}>
                    {option.description}
                  </p>
                </div>
              </div>
              
              {/* 功能特性列表 */}
              <div className="space-y-1">
                {option.features.map((feature, index) => (
                  <div 
                    key={index}
                    className={`
                      flex items-center text-xs
                      ${isSelected ? option.textColor : 'text-gray-600'}
                    `}
                  >
                    <div className={`
                      w-1.5 h-1.5 rounded-full mr-2
                      ${isSelected ? 'bg-current' : 'bg-gray-400'}
                    `} />
                    {feature}
                  </div>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {/* 类型说明 */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>PWM设备:</strong> 如充气泵、抽气泵等，支持功率调节 (0-100%)
          <br />
          <strong>Digital设备:</strong> 如电磁阀、球阀等，仅支持开关控制
        </p>
      </div>
    </div>
  );
}
