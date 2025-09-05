import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import type { DelayContainerProps, TaskAction, DelayAction } from '../../../types/task-orchestrator';
import AdaptiveActionItem from '../items/AdaptiveActionItem';
import LoopContainer from './LoopContainer';
import GroupActionButtons from '../shared/GroupActionButtons';
import MobileAddActionButton from '../shared/MobileAddActionButton';
import { useResponsive } from '../../../hooks/useResponsive';
import { useDelayLogic } from './logic/useDelayLogic';

/**
 * 延时容器组件
 * 支持设置延时时间和嵌套动作
 */
export default function DelayContainer({
  delay,
  devices,
  groups,
  onUpdate,
  onDelete,
  depth = 0,
  disableLoop = false // 新增：禁用循环标志
}: DelayContainerProps) {
  // 检测设备类型
  const { isMobile } = useResponsive();

  // 使用逻辑Hook
  const delayLogic = useDelayLogic({ delay, devices, onUpdate, depth, disableLoop });
  const {
    isExpanded,
    isEditing,
    editDelaySeconds,
    setIsExpanded,
    setIsEditing,
    setEditDelaySeconds,
    saveDelayEdit,
    cancelDelayEdit,
    addAction,
    addDelay,
    addLoop,
    updateAction,
    deleteAction,
    updateLoop,
    deleteLoop,
    colorTheme
  } = delayLogic;

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      let result = `${hours}时`;
      if (minutes > 0) result += `${minutes}分`;
      if (remainingSeconds > 0) result += `${remainingSeconds}秒`;
      return result;
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`${colorTheme.bg} border-l-4 ${colorTheme.border} rounded-lg w-full`}
    >
      {/* 延时头部 - 长条形布局 */}
      <div className={`flex items-center justify-between p-3 ${delay.actions.length > 0 || delay.parallelLoops.length > 0 ? `border-b ${colorTheme.borderB}` : ''}`}>
        <div className="flex items-center space-x-3">
          <ClockIcon className={`w-5 h-5 ${colorTheme.icon}`} />
          
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-orange-800">延时</span>
              <input
                type="number"
                min="0.1"
                max="3600"
                step="0.1"
                value={editDelaySeconds}
                onChange={(e) => setEditDelaySeconds(Number(e.target.value))}
                className="w-20 px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-orange-700">秒</span>
              
              <div className="flex space-x-1 ml-2">
                <motion.button
                  onClick={saveDelayEdit}
                  whileTap={{ scale: 0.95 }}
                  className="px-2 py-1 text-xs text-white bg-orange-600 rounded hover:bg-orange-700"
                >
                  保存
                </motion.button>
                <motion.button
                  onClick={cancelDelayEdit}
                  whileTap={{ scale: 0.95 }}
                  className="px-2 py-1 text-xs text-orange-600 bg-white border border-orange-300 rounded hover:bg-orange-50"
                >
                  取消
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="font-medium text-orange-800">
                {isMobile ? `延时 ${Math.round(delay.delayMs / 1000)} 秒` : delay.name}
              </span>
              {!isMobile && (
                <span className="text-sm text-orange-600">
                  ({delay.actions.length} 个动作
                  {delay.parallelLoops.length > 0 && `, ${delay.parallelLoops.length} 个循环`})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* 桌面端：添加动作按钮在头部 */}
          {!isMobile && (
            <GroupActionButtons
              devices={devices}
              groups={groups}
              onAddAction={addAction}
              onAddDelay={addDelay}
              onAddLoop={disableLoop ? undefined : addLoop}
              className="scale-90"
            />
          )}

          {!isEditing && (
            <motion.button
              onClick={() => setIsEditing(true)}
              whileTap={{ scale: 0.95 }}
              className="p-1 text-orange-400 hover:text-orange-600 rounded hover:bg-orange-100"
              title="编辑延时"
            >
              <PencilIcon className="w-4 h-4" />
            </motion.button>
          )}

          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            whileTap={{ scale: 0.95 }}
            className="p-1 text-orange-400 hover:text-orange-600 rounded hover:bg-orange-100"
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </motion.button>

          <motion.button
            onClick={onDelete}
            whileTap={{ scale: 0.95 }}
            className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-100"
            title="删除延时"
          >
            <TrashIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* 延时内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* 动作网格 - 长条形布局 */}
              {delay.actions.length > 0 && (
                <div className="space-y-3">
                  {delay.actions.map((action) => (
                    <div key={action.id}>
                      {'type' in action && action.type === 'delay' ? (
                        <DelayContainer
                          delay={action as DelayAction}
                          devices={devices}
                          groups={groups}
                          onUpdate={(updatedDelay) => updateAction(action.id, updatedDelay)}
                          onDelete={() => deleteAction(action.id)}
                          depth={depth + 1}
                        />
                      ) : (
                        <AdaptiveActionItem
                          action={action as TaskAction}
                          devices={devices}
                          onUpdate={(updatedAction) => updateAction(action.id, updatedAction)}
                          onDelete={() => deleteAction(action.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 循环列表 */}
              {delay.parallelLoops.length > 0 && (
                <div className="space-y-3">
                  {delay.parallelLoops.map((loop) => (
                    <LoopContainer
                      key={loop.id}
                      loop={loop}
                      devices={devices}
                      groups={groups}
                      onUpdate={(updatedLoop) => updateLoop(loop.id, updatedLoop)}
                      onDelete={() => deleteLoop(loop.id)}
                    />
                  ))}
                </div>
              )}

              {/* 空状态提示 */}
              {delay.actions.length === 0 && delay.parallelLoops.length === 0 && (
                <div className={`text-center py-6 ${colorTheme.text}`}>
                  <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">延时 {formatTime(delay.delayMs / 1000)} 后执行</p>
                  <p className="text-xs opacity-75 mt-1">点击下方按钮添加要执行的动作</p>
                </div>
              )}

              {/* 移动端：添加动作按钮区域 */}
              {isMobile && (
                <div className="flex justify-center pt-2 border-t border-orange-100">
                  <MobileAddActionButton
                    devices={devices}
                    groups={groups}
                    onAddAction={addAction}
                    onAddDelay={addDelay}
                    onAddLoop={disableLoop ? undefined : addLoop}
                    compact={true}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
