import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GroupActionButtonsProps } from '../../../types/task-orchestrator';
import DeviceSelectionPopover from '../../shared/DeviceSelectionPopover';

/**
 * 桌面端分组动作按钮组件
 * 支持设备分组、延时、循环的快捷添加
 */
export default function GroupActionButtons({
  devices,
  groups,
  onAddAction,
  onAddDelay,
  onAddLoop,
  className = ""
}: GroupActionButtonsProps) {
  const [showGroupDevices, setShowGroupDevices] = useState<string | null>(null);
  const [activeButtonRef, setActiveButtonRef] = useState<HTMLButtonElement | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // 设置按钮引用
  const setButtonRef = (groupId: string) => (ref: HTMLButtonElement | null) => {
    buttonRefs.current[groupId] = ref;
  };

  // 处理设备选择弹窗
  const handleGroupClick = (group: any) => {
    const groupDevices = devices.filter(d => d.groupId === group.id);

    if (groupDevices.length === 1) {
      // 只有一个设备，直接添加
      onAddAction(groupDevices[0].id);
    } else {
      // 多个设备，显示选择弹窗
      const newState = showGroupDevices === group.id ? null : group.id;
      setShowGroupDevices(newState);
      setActiveButtonRef(buttonRefs.current[group.id]);
    }
  };

  // 关闭弹窗
  const closePopover = () => {
    setShowGroupDevices(null);
    setActiveButtonRef(null);
  };

  return (
    <div className={`relative z-50 ${className}`}>
      <div className="flex items-center space-x-1">
        {/* 设备分组按钮 */}
        {groups.map((group) => {
          const groupDevices = devices.filter(d => d.groupId === group.id);
          if (groupDevices.length === 0) return null;

          return (
            <motion.button
              key={group.id}
              ref={setButtonRef(group.id)}
              onClick={() => handleGroupClick(group)}
              whileTap={{ scale: 0.95 }}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                backgroundColor: `${group.color}20`,
                color: group.color,
                border: `1px solid ${group.color}40`
              }}
            >
              {group.name}
            </motion.button>
          );
        })}

        {/* 循环按钮 - 仅在支持时显示 */}
        {onAddLoop && (
          <motion.button
            onClick={onAddLoop}
            whileTap={{ scale: 0.95 }}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
          >
            循环
          </motion.button>
        )}

        {/* 延时按钮 */}
        <motion.button
          onClick={onAddDelay}
          whileTap={{ scale: 0.95 }}
          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
        >
          延时
        </motion.button>
      </div>

      {/* 设备选择弹窗 */}
      <DeviceSelectionPopover
        isOpen={!!showGroupDevices}
        onClose={closePopover}
        onSelectDevice={(deviceId) => {
          onAddAction(deviceId);
          closePopover();
        }}
        triggerRef={{ current: activeButtonRef }}
        devices={devices}
        groups={groups}
        groupId={showGroupDevices || undefined}
        placement="bottom"
      />
    </div>
  );
}