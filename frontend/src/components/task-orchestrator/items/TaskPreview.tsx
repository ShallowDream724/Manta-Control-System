import { motion } from 'framer-motion';
import { XMarkIcon, ClockIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { DeviceConfig } from '../../../types';
import type { Task, Step, TaskAction, DelayAction, ParallelLoop } from '../../../types/task-orchestrator';
import { formatTime, calculateTaskDuration } from '../../../utils/task-orchestrator';
import DeviceIcon from '../../config/DeviceIcon';

interface TaskPreviewProps {
  task: Task;
  devices: DeviceConfig[];
  onClose: () => void;
}

/**
 * 任务预览组件
 * 显示任务的时间线和冲突检测结果
 */
export default function TaskPreview({ task, devices, onClose }: TaskPreviewProps) {
  // 检测设备冲突
  const detectConflicts = () => {
    const conflicts: Array<{ stepIndex: number; deviceId: string; actions: string[] }> = [];
    
    task.steps.forEach((step, stepIndex) => {
      const deviceUsage = new Map<string, string[]>();
      
      // 收集步骤内所有动作
      const collectActions = (actions: (TaskAction | DelayAction)[], prefix = '') => {
        actions.forEach(action => {
          if ('type' in action && action.type === 'delay') {
            const delayAction = action as DelayAction;
            collectActions(delayAction.actions, `${prefix}延时${delayAction.delayMs/1000}s后 `);
          } else {
            const taskAction = action as TaskAction;
            const device = devices.find(d => d.id === taskAction.deviceId);
            if (device) {
              if (!deviceUsage.has(taskAction.deviceId)) {
                deviceUsage.set(taskAction.deviceId, []);
              }
              deviceUsage.get(taskAction.deviceId)!.push(`${prefix}${taskAction.name}`);
            }
          }
        });
      };
      
      // 收集步骤直接动作
      collectActions(step.actions);
      
      // 收集循环内动作
      step.parallelLoops.forEach(loop => {
        loop.subSteps.forEach(subStep => {
          collectActions(subStep.actions, `循环${loop.iterations}次 `);
        });
      });
      
      // 检测冲突
      deviceUsage.forEach((actions, deviceId) => {
        if (actions.length > 1) {
          conflicts.push({ stepIndex, deviceId, actions });
        }
      });
    });
    
    return conflicts;
  };

  // 计算步骤总时长（简化版本）
  const calculateStepDuration = (step: Step): number => {
    // 使用工具函数计算单步骤任务的时长
    const singleStepTask: Task = {
      id: 'temp',
      name: 'temp',
      steps: [step],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return calculateTaskDuration(singleStepTask);
  };

  const conflicts = detectConflicts();
  const totalDuration = calculateTaskDuration(task);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{task.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {task.steps.length} 个步骤 · 预计用时 {formatTime(totalDuration / 1000)}
            </p>
          </div>
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 冲突警告 */}
          {conflicts.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-900">检测到设备冲突</h3>
                  <div className="mt-2 space-y-2">
                    {conflicts.map((conflict, index) => {
                      const device = devices.find(d => d.id === conflict.deviceId);
                      return (
                        <div key={index} className="text-sm text-red-700">
                          <span className="font-medium">步骤 {conflict.stepIndex + 1}</span> 中 
                          <span className="font-medium"> {device?.name} </span> 
                          被使用了 {conflict.actions.length} 次，若有冲突后一个信号将覆盖前一个信号。
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤时间线 */}
          <div className="space-y-6">
            {task.steps.map((step, stepIndex) => (
              <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {stepIndex + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{step.name}</h3>
                      <p className="text-sm text-gray-500">
                        预计用时: {formatTime(calculateStepDuration(step) / 1000)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 步骤内容预览 */}
                <div className="space-y-3">
                  {/* 直接动作 */}
                  {step.actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">立即执行:</h4>
                      <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
                        {step.actions.map(action => (
                          <ActionPreview key={action.id} action={action} devices={devices} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 并行循环 */}
                  {step.parallelLoops.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">并行循环:</h4>
                      <div className="space-y-2">
                        {step.parallelLoops.map(loop => (
                          <LoopPreview key={loop.id} loop={loop} devices={devices} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 空状态 */}
          {task.steps.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ClockIcon className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">任务为空</h3>
              <p className="text-gray-500">请先添加步骤来创建任务</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// 动作预览组件
function ActionPreview({ action, devices }: { action: TaskAction | DelayAction; devices: DeviceConfig[] }) {
  if ('type' in action && action.type === 'delay') {
    const delayAction = action as DelayAction;
    return (
      <div className="flex items-center space-x-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
        <ClockIcon className="w-4 h-4 text-orange-500" />
        <span className="text-orange-700">{delayAction.name}</span>
      </div>
    );
  }

  const taskAction = action as TaskAction;
  const device = devices.find(d => d.id === taskAction.deviceId);
  if (!device) return null;

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
      <DeviceIcon iconId={device.icon} className="w-4 h-4" />
      <span className="text-gray-700 truncate">{taskAction.name}</span>
    </div>
  );
}

// 循环预览组件
function LoopPreview({ loop, devices }: { loop: ParallelLoop; devices: DeviceConfig[] }) {
  return (
    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-center space-x-2 mb-2">
        <ArrowPathIcon className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-purple-700">{loop.name}</span>
        <span className="text-xs text-purple-600">
          间隔 {(loop.intervalMs / 1000).toFixed(1)}秒
        </span>
      </div>
      
      <div className="space-y-2">
        {loop.subSteps.map((subStep, index) => (
          <div key={subStep.id} className="ml-4">
            <div className="text-xs font-medium text-purple-600 mb-1">
              子步骤 {index + 1}: {subStep.name}
            </div>
            <div className="grid gap-1 grid-cols-2">
              {subStep.actions.map(action => (
                <ActionPreview key={action.id} action={action} devices={devices} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
