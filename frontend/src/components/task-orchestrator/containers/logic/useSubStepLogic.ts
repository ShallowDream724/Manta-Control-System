/**
 * 子步骤逻辑Hook
 * 提供子步骤相关的所有业务逻辑，与UI层分离
 * 
 * 设计理念：
 * 1. 从桌面端LoopContainer中提取子步骤逻辑
 * 2. 提供统一的子步骤管理接口
 * 3. 支持桌面端和移动端复用
 * 4. 保持与useStepLogic、useDelayLogic一致的设计模式
 */

import { useCallback } from 'react';
import type { SubStep, TaskAction, DelayAction } from '../../../../types/task-orchestrator';
import type { DeviceConfig } from '../../../../types';

export interface UseSubStepLogicProps {
  subStep: SubStep;
  devices: DeviceConfig[];
  onUpdate: (subStep: SubStep) => void;
  onAddActionToSubStep: (subStepId: string, deviceId: string) => void;
  onAddDelayToSubStep: (subStepId: string) => void;
}

export interface UseSubStepLogicReturn {
  // 操作方法
  updateSubStepName: (name: string) => void;
  updateAction: (actionId: string, updatedAction: TaskAction | DelayAction) => void;
  deleteAction: (actionId: string) => void;
  handleAddAction: (deviceId: string) => void;
  handleAddDelay: () => void;
  
  // 计算属性
  actionCount: number;
  hasActions: boolean;
}

/**
 * 子步骤逻辑Hook
 * 
 * 核心特性：
 * 1. 统一的子步骤管理逻辑
 * 2. 与父级循环的通信接口
 * 3. 动作的增删改查
 * 4. 嵌套限制控制(不允许循环)
 */
export function useSubStepLogic({
  subStep,
  devices: _devices,
  onUpdate,
  onAddActionToSubStep,
  onAddDelayToSubStep
}: UseSubStepLogicProps): UseSubStepLogicReturn {

  // 更新子步骤名称
  const updateSubStepName = useCallback((name: string) => {
    onUpdate({ ...subStep, name });
  }, [subStep, onUpdate]);

  // 更新动作
  const updateAction = useCallback((actionId: string, updatedAction: TaskAction | DelayAction) => {
    onUpdate({
      ...subStep,
      actions: subStep.actions.map(action => 
        action.id === actionId ? updatedAction : action
      )
    });
  }, [subStep, onUpdate]);

  // 删除动作
  const deleteAction = useCallback((actionId: string) => {
    onUpdate({
      ...subStep,
      actions: subStep.actions.filter(action => action.id !== actionId)
    });
  }, [subStep, onUpdate]);

  // 包装函数：添加动作到当前子步骤
  const handleAddAction = useCallback((deviceId: string) => {
    onAddActionToSubStep(subStep.id, deviceId);
  }, [subStep.id, onAddActionToSubStep]);

  // 包装函数：添加延时到当前子步骤
  const handleAddDelay = useCallback(() => {
    onAddDelayToSubStep(subStep.id);
  }, [subStep.id, onAddDelayToSubStep]);

  // 计算属性
  const actionCount = subStep.actions.length;
  const hasActions = actionCount > 0;

  return {
    // 操作方法
    updateSubStepName,
    updateAction,
    deleteAction,
    handleAddAction,
    handleAddDelay,
    
    // 计算属性
    actionCount,
    hasActions
  };
}
