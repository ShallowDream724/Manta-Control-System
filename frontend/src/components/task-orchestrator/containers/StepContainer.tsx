import { motion, AnimatePresence } from 'framer-motion';
import type { StepContainerProps, TaskAction, DelayAction } from '../../../types/task-orchestrator';
import AdaptiveActionItem from '../items/AdaptiveActionItem';
import DelayContainer from './DelayContainer';
import LoopContainer from './LoopContainer';
import MobileAddActionButton from '../shared/MobileAddActionButton';
import AdaptiveActionButtons from '../shared/AdaptiveActionButtons';
import { useResponsive } from '../../../hooks/useResponsive';
import { useStepLogic } from './logic/useStepLogic';

/**
 * 步骤容器组件
 * 支持添加动作、延时、循环等元素
 */
export default function StepContainer({
  step,
  stepIndex,
  devices,
  groups,
  onUpdate,
  onDelete
}: StepContainerProps) {
  // 检测设备类型
  const { isMobile } = useResponsive();

  // 使用逻辑Hook
  const stepLogic = useStepLogic({ step, devices, onUpdate });
  const {
    isExpanded,
    setIsExpanded,
    updateStepName,
    addAction,
    addDelay,
    addLoop,
    updateAction,
    deleteAction,
    updateLoop,
    deleteLoop
  } = stepLogic;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      {/* 步骤头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          {/* 步骤编号 */}
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
            {stepIndex + 1}
          </div>
          
          {/* 步骤名称 */}
          <input
            type="text"
            value={step.name}
            onChange={(e) => updateStepName(e.target.value)}
            className={`text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 ${
              isMobile ? 'max-w-20' : ''
            }`}
            placeholder="步骤名称"
          />
        </div>

        {/* 自适应操作按钮 */}
        <AdaptiveActionButtons
          isExpanded={isExpanded}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
          onDelete={onDelete}
          showExpandButton={true}
          expandButtonTitle="折叠/展开步骤"
          deleteButtonTitle="删除步骤"
          devices={devices}
          groups={groups}
          onAddAction={addAction}
          onAddDelay={addDelay}
          onAddLoop={addLoop}
          showAddActions={true}
        />
      </div>

      {/* 步骤内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* 动作列表 */}
              {step.actions.length > 0 && (
                <div className="space-y-3">
                  {/* 延时容器 - 独立占据整行 */}
                  {step.actions.filter(action => 'type' in action && action.type === 'delay').map((action) => (
                    <DelayContainer
                      key={action.id}
                      delay={action as DelayAction}
                      devices={devices}
                      groups={groups}
                      onUpdate={(updatedDelay) => updateAction(action.id, updatedDelay)}
                      onDelete={() => deleteAction(action.id)}
                      depth={0}
                    />
                  ))}

                  {/* 普通动作 - 网格布局 */}
                  {step.actions.filter(action => !('type' in action) || action.type !== 'delay').length > 0 && (
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {step.actions.filter(action => !('type' in action) || action.type !== 'delay').map((action) => (
                        <AdaptiveActionItem
                          key={action.id}
                          action={action as TaskAction}
                          devices={devices}
                          onUpdate={(updatedAction) => updateAction(action.id, updatedAction)}
                          onDelete={() => deleteAction(action.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 循环列表 */}
              {step.parallelLoops.map((loop) => (
                <LoopContainer
                  key={loop.id}
                  loop={loop}
                  devices={devices}
                  groups={groups}
                  onUpdate={(updatedLoop) => updateLoop(loop.id, updatedLoop)}
                  onDelete={() => deleteLoop(loop.id)}
                />
              ))}

              {/* 移动端：添加动作按钮区域 */}
              {isMobile && (
                <div className="flex justify-center pt-2">
                  <MobileAddActionButton
                    devices={devices}
                    groups={groups}
                    onAddAction={addAction}
                    onAddDelay={addDelay}
                    onAddLoop={addLoop}
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
