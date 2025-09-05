import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import type { LoopContainerProps, TaskAction, DelayAction, SubStep } from '../../../types/task-orchestrator';
import AdaptiveActionItem from '../items/AdaptiveActionItem';
import DelayContainer from './DelayContainer';
import MobileAddActionButton from '../shared/MobileAddActionButton';
import AdaptiveActionButtons from '../shared/AdaptiveActionButtons';
import { useResponsive } from '../../../hooks/useResponsive';
import { useLoopLogic } from './logic/useLoopLogic';
import { useSubStepLogic } from './logic/useSubStepLogic';

/**
 * 循环容器组件
 * 支持设置循环次数、间隔和子步骤
 */
export default function LoopContainer({
  loop,
  devices,
  groups,
  onUpdate,
  onDelete
}: LoopContainerProps) {
  // 检测设备类型
  const { isMobile } = useResponsive();

  // 使用逻辑Hook
  const loopLogic = useLoopLogic({ loop, devices, onUpdate });
  const {
    isExpanded,
    isEditing,
    editIterations,
    editIntervalSeconds,
    setIsExpanded,
    setIsEditing,
    setEditIterations,
    setEditIntervalSeconds,
    saveLoopEdit,
    cancelLoopEdit,
    addSubStep,
    updateSubStep,
    deleteSubStep,
    addActionToSubStep,
    addDelayToSubStep
  } = loopLogic;

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
      let result = `${hours}时`;
      if (minutes > 0) result += `${minutes}分`;
      return result;
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-purple-50 border-l-4 border-purple-400 rounded-lg"
    >
      {/* 循环头部 */}
      <div className="flex items-center justify-between p-3 border-b border-purple-200">
        <div className="flex items-center space-x-3">
          <ArrowPathIcon className="w-5 h-5 text-purple-600" />
          
          {isEditing ? (
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm font-medium text-purple-800">循环</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={editIterations}
                onChange={(e) => setEditIterations(Number(e.target.value))}
                className={`px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isMobile ? 'w-8' : 'w-16'
                }`}
              />
              <span className="text-sm text-purple-700">次，间隔</span>
              <input
                type="number"
                min="0"
                max="3600"
                step="0.1"
                value={editIntervalSeconds}
                onChange={(e) => setEditIntervalSeconds(Number(e.target.value))}
                className={`px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isMobile ? 'w-10' : 'w-20'
                }`}
              />
              <span className="text-sm text-purple-700">秒</span>
              
              <div className="flex space-x-1 ml-2">
                <motion.button
                  onClick={saveLoopEdit}
                  whileTap={{ scale: 0.95 }}
                  className="px-2 py-1 text-xs text-white bg-purple-600 rounded hover:bg-purple-700"
                >
                  保存
                </motion.button>
                <motion.button
                  onClick={cancelLoopEdit}
                  whileTap={{ scale: 0.95 }}
                  className="px-2 py-1 text-xs text-purple-600 bg-white border border-purple-300 rounded hover:bg-purple-50"
                >
                  取消
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="font-medium text-purple-800">
                {isMobile ? `${loop.iterations}次  ${Math.round(loop.intervalMs / 1000)}秒` : loop.name}
              </span>
              {!isMobile && (
                <span className="text-sm text-purple-600">
                  间隔 {formatTime(loop.intervalMs / 1000)} · {loop.subSteps.length} 个子步骤
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {!isEditing && (
            <motion.button
              onClick={() => setIsEditing(true)}
              whileTap={{ scale: 0.95 }}
              className="p-1 text-purple-400 hover:text-purple-600 rounded hover:bg-purple-100"
              title="编辑循环"
            >
              <PencilIcon className="w-4 h-4" />
            </motion.button>
          )}

          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            whileTap={{ scale: 0.95 }}
            className="p-1 text-purple-400 hover:text-purple-600 rounded hover:bg-purple-100"
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
            title="删除循环"
          >
            <TrashIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* 循环内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {/* 子步骤列表 */}
              {loop.subSteps.map((subStep, index) => (
                <SubStepContainer
                  key={subStep.id}
                  subStep={subStep}
                  subStepIndex={index}
                  devices={devices}
                  groups={groups}
                  onUpdate={(updatedSubStep) => updateSubStep(subStep.id, updatedSubStep)}
                  onDelete={() => deleteSubStep(subStep.id)}
                  onAddActionToSubStep={addActionToSubStep}
                  onAddDelayToSubStep={addDelayToSubStep}
                />
              ))}

              {/* 添加子步骤按钮 */}
              <motion.button
                onClick={addSubStep}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center space-x-2 py-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-purple-600">添加子步骤</span>
              </motion.button>

              {/* 空状态提示 */}
              {loop.subSteps.length === 0 && (
                <div className="text-center py-6 text-purple-600">
                  <ArrowPathIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {isMobile
                      ? `${loop.iterations}次${Math.round(loop.intervalMs / 1000)}秒`
                      : `循环 ${loop.iterations} 次，间隔 ${formatTime(loop.intervalMs / 1000)}`
                    }
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    {isMobile ? '点击添加子步骤' : '点击上方按钮添加子步骤'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 子步骤容器组件
interface SubStepContainerProps {
  subStep: SubStep;
  subStepIndex: number;
  devices: import('../../../types').DeviceConfig[];
  groups: import('../../../types').DeviceGroup[];
  onUpdate: (subStep: SubStep) => void;
  onDelete: () => void;
  onAddActionToSubStep: (subStepId: string, deviceId: string) => void;
  onAddDelayToSubStep: (subStepId: string) => void;
}

function SubStepContainer({
  subStep,
  subStepIndex,
  devices,
  groups,
  onUpdate,
  onDelete,
  onAddActionToSubStep,
  onAddDelayToSubStep
}: SubStepContainerProps) {
  // 折叠状态
  const [isExpanded, setIsExpanded] = useState(true);

  // 检测设备类型
  const { isMobile } = useResponsive();

  // 使用共享的子步骤逻辑Hook
  const subStepLogic = useSubStepLogic({
    subStep,
    devices,
    onUpdate,
    onAddActionToSubStep,
    onAddDelayToSubStep
  });

  const {
    updateSubStepName,
    updateAction,
    deleteAction,
    handleAddAction,
    handleAddDelay
  } = subStepLogic;

  return (
    <div className="ml-4 bg-white border border-purple-200 rounded-lg">
      {/* 子步骤头部 */}
      <div className="flex items-center justify-between p-3 border-b border-purple-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold">
            {subStepIndex + 1}
          </div>
          <input
            type="text"
            value={subStep.name}
            onChange={(e) => updateSubStepName(e.target.value)}
            className={`font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 ${
              isMobile ? 'max-w-24' : ''
            }`}
            placeholder="子步骤名称"
          />
        </div>

        {/* 自适应操作按钮 */}
        <AdaptiveActionButtons
          isExpanded={isExpanded}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
          onDelete={onDelete}
          showExpandButton={true}
          expandButtonTitle="折叠/展开子步骤"
          deleteButtonTitle="删除子步骤"
          devices={devices}
          groups={groups}
          onAddAction={handleAddAction}
          onAddDelay={handleAddDelay}
          onAddLoop={undefined} // 循环内不能嵌套循环
          showAddActions={true}
        />
      </div>

      {/* 子步骤内容 */}
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
              {/* 动作列表 */}
              {subStep.actions.map((action) => (
                <div key={action.id}>
                  {'type' in action && action.type === 'delay' ? (
                    <DelayContainer
                      delay={action as DelayAction}
                      devices={devices}
                      groups={groups}
                      onUpdate={(updatedDelay) => updateAction(action.id, updatedDelay)}
                      onDelete={() => deleteAction(action.id)}
                      depth={1}
                      disableLoop={true}
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

              {/* 空状态提示 */}
              {subStep.actions.length === 0 && (
                <div className="text-center py-6 text-purple-600">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-sm">点击下方按钮添加动作</p>
                </div>
              )}

              {/* 移动端：添加动作按钮区域 */}
              {isMobile && (
                <div className="flex justify-center pt-2 border-t border-purple-100">
                  <MobileAddActionButton
                    devices={devices}
                    groups={groups}
                    onAddAction={handleAddAction}
                    onAddDelay={handleAddDelay}
                    onAddLoop={undefined} // 循环内不能嵌套循环
                    compact={true}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
