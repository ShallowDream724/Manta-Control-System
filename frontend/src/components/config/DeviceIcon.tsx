import { BoltIcon } from '@heroicons/react/24/solid';
import { ICON_OPTIONS } from './IconSelector';

interface DeviceIconProps {
  iconId?: string;
  type?: 'pwm' | 'digital'; // 兼容旧的type属性
  className?: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
}

/**
 * 设备图标渲染器
 * 根据图标ID渲染对应的图标组件
 */
export default function DeviceIcon({
  iconId,
  type,
  className = 'w-6 h-6',
  fallbackIcon: FallbackIcon = BoltIcon
}: DeviceIconProps) {
  // 如果提供了type但没有iconId，使用默认图标
  let finalIconId = iconId;
  if (!iconId && type) {
    finalIconId = type === 'pwm' ? 'bolt' : 'cpu-chip';
  }

  // 查找对应的图标
  const iconOption = ICON_OPTIONS.find(option => option.id === finalIconId);
  const IconComponent = iconOption?.component || FallbackIcon;

  return <IconComponent className={className} />;
}
