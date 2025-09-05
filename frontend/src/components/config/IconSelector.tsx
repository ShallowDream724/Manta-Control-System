import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { 
  BoltIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  CircleStackIcon,
  CpuChipIcon,
  PowerIcon,
  SignalIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  FireIcon,
  CloudIcon,
  LightBulbIcon,
  Battery0Icon
} from '@heroicons/react/24/solid';

// 图标配置接口
export interface IconOption {
  id: string;
  name: string;
  component: React.ComponentType<{ className?: string }>;
  category: 'power' | 'control' | 'sensor' | 'general';
}

// 预定义图标选项
const ICON_OPTIONS: IconOption[] = [
  // 电源类
  { id: 'bolt', name: '闪电', component: BoltIcon, category: 'power' },
  { id: 'power', name: '电源', component: PowerIcon, category: 'power' },
  { id: 'battery', name: '电池', component: Battery0Icon, category: 'power' },
  { id: 'fire', name: '火焰', component: FireIcon, category: 'power' },
  { id: 'sun', name: '太阳', component: SunIcon, category: 'power' },
  
  // 控制类
  { id: 'cog', name: '齿轮', component: CogIcon, category: 'control' },
  { id: 'wrench', name: '扳手', component: WrenchScrewdriverIcon, category: 'control' },
  { id: 'cpu', name: '芯片', component: CpuChipIcon, category: 'control' },
  { id: 'signal', name: '信号', component: SignalIcon, category: 'control' },
  
  // 传感器类
  { id: 'beaker', name: '烧杯', component: BeakerIcon, category: 'sensor' },
  { id: 'stack', name: '堆栈', component: CircleStackIcon, category: 'sensor' },
  { id: 'cloud', name: '云朵', component: CloudIcon, category: 'sensor' },
  
  // 通用类
  { id: 'sparkles', name: '星光', component: SparklesIcon, category: 'general' },
  { id: 'moon', name: '月亮', component: MoonIcon, category: 'general' },
  { id: 'bulb', name: '灯泡', component: LightBulbIcon, category: 'general' }
];

// 分类配置
const CATEGORIES = {
  power: { name: '电源类', color: 'text-yellow-600' },
  control: { name: '控制类', color: 'text-blue-600' },
  sensor: { name: '传感器类', color: 'text-green-600' },
  general: { name: '通用类', color: 'text-purple-600' }
} as const;

interface IconSelectorProps {
  value: string;
  onChange: (iconId: string) => void;
  className?: string;
}

/**
 * 图标选择器组件
 * 提供分类的图标选择功能，支持搜索和预览
 */
export default function IconSelector({ value, onChange, className = '' }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 获取当前选中的图标
  const selectedIcon = ICON_OPTIONS.find(icon => icon.id === value);
  const SelectedIconComponent = selectedIcon?.component || BoltIcon;

  // 过滤图标
  const filteredIcons = ICON_OPTIONS.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || icon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 按分类分组
  const groupedIcons = filteredIcons.reduce((groups, icon) => {
    const category = icon.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(icon);
    return groups;
  }, {} as Record<string, IconOption[]>);

  const handleIconSelect = (iconId: string) => {
    onChange(iconId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        设备图标
      </label>
      
      {/* 选择器按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <SelectedIconComponent className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-700">
            {selectedIcon?.name || '选择图标'}
          </span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg"
          >
            {/* 搜索和分类过滤 */}
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="搜索图标..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              
              <div className="flex flex-wrap gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedCategory === 'all' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                {Object.entries(CATEGORIES).map(([key, category]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedCategory === key 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 图标网格 */}
            <div className="max-h-64 overflow-y-auto p-3">
              {Object.entries(groupedIcons).map(([category, icons]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <h4 className={`text-xs font-medium mb-2 ${CATEGORIES[category as keyof typeof CATEGORIES].color}`}>
                    {CATEGORIES[category as keyof typeof CATEGORIES].name}
                  </h4>
                  <div className="grid grid-cols-6 gap-2">
                    {icons.map((icon) => {
                      const IconComponent = icon.component;
                      const isSelected = value === icon.id;
                      
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => handleIconSelect(icon.id)}
                          className={`
                            p-2 rounded-lg border-2 transition-all duration-200 hover:scale-105
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
                          title={icon.name}
                        >
                          <IconComponent className={`w-5 h-5 mx-auto ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">未找到匹配的图标</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 点击外部关闭 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// 导出图标选项供其他组件使用
export { ICON_OPTIONS };
