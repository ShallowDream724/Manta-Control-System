/**
 * 循环容器逻辑Hook
 * 提供循环相关的所有业务逻辑，与UI层分离
 */

import { useState, useCallback } from 'react';
import type { ParallelLoop, SubStep } from '../../../../types/task-orchestrator';
import type { DeviceConfig } from '../../../../types';
import { createTaskAction, createDelayAction, createSubStep, updateLoopName } from '../../../../utils/task-orchestrator';

export interface UseLoopLogicProps {
  loop: ParallelLoop;
  devices: DeviceConfig[];
  onUpdate: (loop: ParallelLoop) => void;
}

export interface UseLoopLogicReturn {
  // 状态
  isExpanded: boolean;
  isEditing: boolean;
  editIterations: number;
  editIntervalSeconds: number;
  
  // 操作方法
  setIsExpanded: (expanded: boolean) => void;
  setIsEditing: (editing: boolean) => void;
  setEditIterations: (iterations: number) => void;
  setEditIntervalSeconds: (seconds: number) => void;
  saveLoopEdit: () => void;
  cancelLoopEdit: () => void;
  addSubStep: () => void;
  updateSubStep: (subStepId: string, updatedSubStep: SubStep) => void;
  deleteSubStep: (subStepId: string) => void;
  addActionToSubStep: (subStepId: string, deviceId: string) => void;
  addDelayToSubStep: (subStepId: string) => void;
  
  // 计算属性
  hasContent: boolean;
  subStepCount: number;
  totalActionCount: number;
}

/**
 * 循环逻辑Hook
 */
export function useLoopLogic({ loop, devices, onUpdate }: UseLoopLogicProps): UseLoopLogicReturn {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editIterations, setEditIterations] = useState(loop.iterations);
  const [editIntervalSeconds, setEditIntervalSeconds] = useState(loop.intervalMs / 1000);

  // 保存循环编辑
  const saveLoopEdit = useCallback(() => {
    const updatedLoop = updateLoopName({
      ...loop,
      iterations: editIterations,
      intervalMs: editIntervalSeconds * 1000
    });
    onUpdate(updatedLoop);
    setIsEditing(false);
  }, [loop, editIterations, editIntervalSeconds, onUpdate]);

  // 取消循环编辑
  const cancelLoopEdit = useCallback(() => {
    setEditIterations(loop.iterations);
    setEditIntervalSeconds(loop.intervalMs / 1000);
    setIsEditing(false);
  }, [loop.iterations, loop.intervalMs]);

  // 添加子步骤
  const addSubStep = useCallback(() => {
    const newSubStep = createSubStep(`子步骤 ${loop.subSteps.length + 1}`);
    onUpdate({
      ...loop,
      subSteps: [...loop.subSteps, newSubStep]
    });
  }, [loop, onUpdate]);

  // 更新子步骤
  const updateSubStep = useCallback((subStepId: string, updatedSubStep: SubStep) => {
    onUpdate({
      ...loop,
      subSteps: loop.subSteps.map(subStep => 
        subStep.id === subStepId ? updatedSubStep : subStep
      )
    });
  }, [loop, onUpdate]);

  // 删除子步骤
  const deleteSubStep = useCallback((subStepId: string) => {
    onUpdate({
      ...loop,
      subSteps: loop.subSteps.filter(subStep => subStep.id !== subStepId)
    });
  }, [loop, onUpdate]);

  // 向子步骤添加动作
  const addActionToSubStep = useCallback((subStepId: string, deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const newAction = createTaskAction(device);
    const updatedSubSteps = loop.subSteps.map(subStep => {
      if (subStep.id === subStepId) {
        return {
          ...subStep,
          actions: [...subStep.actions, newAction]
        };
      }
      return subStep;
    });

    onUpdate({
      ...loop,
      subSteps: updatedSubSteps
    });
  }, [loop, devices, onUpdate]);

  // 向子步骤添加延时
  const addDelayToSubStep = useCallback((subStepId: string) => {
    const newDelay = createDelayAction(3);
    const updatedSubSteps = loop.subSteps.map(subStep => {
      if (subStep.id === subStepId) {
        return {
          ...subStep,
          actions: [...subStep.actions, newDelay]
        };
      }
      return subStep;
    });

    onUpdate({
      ...loop,
      subSteps: updatedSubSteps
    });
  }, [loop, onUpdate]);

  // 计算属性
  const hasContent = loop.subSteps.length > 0;
  const subStepCount = loop.subSteps.length;
  const totalActionCount = loop.subSteps.reduce((total, subStep) => {
    return total + subStep.actions.length;
  }, 0);

  return {
    // 状态
    isExpanded,
    isEditing,
    editIterations,
    editIntervalSeconds,
    
    // 操作方法
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
    addDelayToSubStep,
    
    // 计算属性
    hasContent,
    subStepCount,
    totalActionCount
  };
}
