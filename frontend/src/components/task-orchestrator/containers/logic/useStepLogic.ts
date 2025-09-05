/**
 * 步骤容器逻辑Hook
 * 提供步骤相关的所有业务逻辑，与UI层分离
 */

import { useState, useCallback } from 'react';
import type { Step, TaskAction, DelayAction, ParallelLoop } from '../../../../types/task-orchestrator';
import type { DeviceConfig } from '../../../../types';
import { createTaskAction, createDelayAction, createParallelLoop } from '../../../../utils/task-orchestrator';

export interface UseStepLogicProps {
  step: Step;
  devices: DeviceConfig[];
  onUpdate: (step: Step) => void;
}

export interface UseStepLogicReturn {
  // 状态
  isExpanded: boolean;
  
  // 操作方法
  setIsExpanded: (expanded: boolean) => void;
  updateStepName: (name: string) => void;
  addAction: (deviceId: string) => void;
  addDelay: () => void;
  addLoop: () => void;
  updateAction: (actionId: string, updatedAction: TaskAction | DelayAction) => void;
  deleteAction: (actionId: string) => void;
  updateLoop: (loopId: string, updatedLoop: ParallelLoop) => void;
  deleteLoop: (loopId: string) => void;
  
  // 计算属性
  hasContent: boolean;
  actionCount: number;
  loopCount: number;
}

/**
 * 步骤逻辑Hook
 */
export function useStepLogic({ step, devices, onUpdate }: UseStepLogicProps): UseStepLogicReturn {
  const [isExpanded, setIsExpanded] = useState(true);

  // 更新步骤名称
  const updateStepName = useCallback((name: string) => {
    onUpdate({ ...step, name });
  }, [step, onUpdate]);

  // 添加动作
  const addAction = useCallback((deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const newAction = createTaskAction(device);
    onUpdate({
      ...step,
      actions: [...step.actions, newAction]
    });
  }, [step, devices, onUpdate]);

  // 添加延时
  const addDelay = useCallback(() => {
    const newDelay = createDelayAction(5);
    onUpdate({
      ...step,
      actions: [...step.actions, newDelay]
    });
  }, [step, onUpdate]);

  // 添加循环
  const addLoop = useCallback(() => {
    const newLoop = createParallelLoop(3);
    onUpdate({
      ...step,
      parallelLoops: [...step.parallelLoops, newLoop]
    });
  }, [step, onUpdate]);

  // 更新动作
  const updateAction = useCallback((actionId: string, updatedAction: TaskAction | DelayAction) => {
    onUpdate({
      ...step,
      actions: step.actions.map(action => 
        action.id === actionId ? updatedAction : action
      )
    });
  }, [step, onUpdate]);

  // 删除动作
  const deleteAction = useCallback((actionId: string) => {
    onUpdate({
      ...step,
      actions: step.actions.filter(action => action.id !== actionId)
    });
  }, [step, onUpdate]);

  // 更新循环
  const updateLoop = useCallback((loopId: string, updatedLoop: ParallelLoop) => {
    onUpdate({
      ...step,
      parallelLoops: step.parallelLoops.map(loop => 
        loop.id === loopId ? updatedLoop : loop
      )
    });
  }, [step, onUpdate]);

  // 删除循环
  const deleteLoop = useCallback((loopId: string) => {
    onUpdate({
      ...step,
      parallelLoops: step.parallelLoops.filter(loop => loop.id !== loopId)
    });
  }, [step, onUpdate]);

  // 计算属性
  const hasContent = step.actions.length > 0 || step.parallelLoops.length > 0;
  const actionCount = step.actions.length;
  const loopCount = step.parallelLoops.length;

  return {
    // 状态
    isExpanded,
    
    // 操作方法
    setIsExpanded,
    updateStepName,
    addAction,
    addDelay,
    addLoop,
    updateAction,
    deleteAction,
    updateLoop,
    deleteLoop,
    
    // 计算属性
    hasContent,
    actionCount,
    loopCount
  };
}
