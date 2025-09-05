
import { motion } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useResponsive } from '../../../hooks/useResponsive';
import GroupActionButtons from './GroupActionButtons';
import type { DeviceConfig, DeviceGroup } from '../../../types';

interface AdaptiveActionButtonsProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onDelete: () => void;
  showExpandButton?: boolean;
  className?: string;
  expandButtonTitle?: string;
  deleteButtonTitle?: string;
  // 添加动作相关props
  devices?: DeviceConfig[];
  groups?: DeviceGroup[];
  onAddAction?: (deviceId: string) => void;
  onAddDelay?: () => void;
  onAddLoop?: () => void;
  showAddActions?: boolean;
}

/**
 * 自适应的操作按钮组件
 * 桌面端：添加动作按钮、展开/折叠、删除按钮在同一行
 * 移动端：只有展开/折叠、删除按钮在头部，添加动作按钮在下方
 */
export default function AdaptiveActionButtons({
  isExpanded,
  onToggleExpanded,
  onDelete,
  showExpandButton = true,
  className = "",
  expandButtonTitle = "折叠/展开",
  deleteButtonTitle = "删除",
  devices,
  groups,
  onAddAction,
  onAddDelay,
  onAddLoop,
  showAddActions = false
}: AdaptiveActionButtonsProps) {
  const { isMobile } = useResponsive();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* 桌面端：添加动作按钮在头部 */}
      {!isMobile && showAddActions && devices && groups && onAddAction && onAddDelay && (
        <GroupActionButtons
          devices={devices}
          groups={groups}
          onAddAction={onAddAction}
          onAddDelay={onAddDelay}
          onAddLoop={onAddLoop}
        />
      )}

      {/* 展开/折叠按钮 */}
      {showExpandButton && onToggleExpanded && (
        <motion.button
          onClick={onToggleExpanded}
          whileTap={{ scale: 0.95 }}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          title={expandButtonTitle}
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </motion.button>
      )}

      {/* 删除按钮 */}
      <motion.button
        onClick={onDelete}
        whileTap={{ scale: 0.95 }}
        className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
        title={deleteButtonTitle}
      >
        <TrashIcon className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
