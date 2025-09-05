import { useResponsive } from '../../../hooks/useResponsive';
import type { ActionItemProps } from '../../../types/task-orchestrator';
import ActionItem from './ActionItem';
import SwipeableActionItem from './SwipeableActionItem';

/**
 * 自适应动作项组件
 * 根据设备类型自动选择合适的组件：
 * - 移动端/平板端：使用 SwipeableActionItem（左滑删除 + 点击编辑）
 * - 桌面端：使用原有的 ActionItem（传统按钮操作）
 */
export default function AdaptiveActionItem(props: ActionItemProps) {
  const { isMobile, isTablet } = useResponsive();
  
  // 移动端和平板端使用滑动版本
  if (isMobile || isTablet) {
    return <SwipeableActionItem {...props} />;
  }
  
  // 桌面端使用传统版本
  return <ActionItem {...props} />;
}
