/**
 * 延时容器逻辑Hook
 * 提供延时相关的所有业务逻辑，与UI层分离
 */

import { useState, useCallback } from 'react';
import type { DelayAction, TaskAction, ParallelLoop } from '../../../../types/task-orchestrator';
import type { DeviceConfig } from '../../../../types';
import { createTaskAction, createDelayAction, createParallelLoop, updateDelayName } from '../../../../utils/task-orchestrator';

export interface UseDelayLogicProps {
  delay: DelayAction;
  devices: DeviceConfig[];
  onUpdate: (delay: DelayAction) => void;
  depth?: number;
  disableLoop?: boolean;
}

export interface UseDelayLogicReturn {
  // 状态
  isExpanded: boolean;
  isEditing: boolean;
  editDelaySeconds: number;
  
  // 操作方法
  setIsExpanded: (expanded: boolean) => void;
  setIsEditing: (editing: boolean) => void;
  setEditDelaySeconds: (seconds: number) => void;
  saveDelayEdit: () => void;
  cancelDelayEdit: () => void;
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
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    icon: string;
    borderB: string;
  };
}

/**
 * 延时逻辑Hook
 */
export function useDelayLogic({ 
  delay, 
  devices, 
  onUpdate, 
  depth = 0, 
  disableLoop = false 
}: UseDelayLogicProps): UseDelayLogicReturn {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editDelaySeconds, setEditDelaySeconds] = useState(delay.delayMs / 1000);

  // 根据嵌套深度选择颜色主题
  const getColorTheme = (depth: number) => {
    const themes = [
      { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-600', icon: 'text-orange-600', borderB: 'border-orange-200' },
      { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-600', icon: 'text-amber-600', borderB: 'border-amber-200' },
      { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-600', icon: 'text-yellow-600', borderB: 'border-yellow-200' },
      { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-600', icon: 'text-lime-600', borderB: 'border-lime-200' }
    ];
    return themes[depth % themes.length];
  };

  const colorTheme = getColorTheme(depth);

  // 保存延时编辑
  const saveDelayEdit = useCallback(() => {
    // 统一到0.1s精度，避免浮点误差
    const normalizedMs = Math.round(editDelaySeconds * 10) * 100; // (sec*10)->tenths, *100 -> ms
    const updatedDelay = updateDelayName({
      ...delay,
      delayMs: normalizedMs
    });
    onUpdate(updatedDelay);
    setIsEditing(false);
  }, [delay, editDelaySeconds, onUpdate]);

  // 取消延时编辑
  const cancelDelayEdit = useCallback(() => {
    setEditDelaySeconds(delay.delayMs / 1000);
    setIsEditing(false);
  }, [delay.delayMs]);

  // 添加动作
  const addAction = useCallback((deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const newAction = createTaskAction(device);
    onUpdate({
      ...delay,
      actions: [...delay.actions, newAction]
    });
  }, [delay, devices, onUpdate]);

  // 添加延时
  const addDelay = useCallback(() => {
    const newDelay = createDelayAction(3);
    onUpdate({
      ...delay,
      actions: [...delay.actions, newDelay]
    });
  }, [delay, onUpdate]);

  // 添加循环
  const addLoop = useCallback(() => {
    if (disableLoop) return;
    
    const newLoop = createParallelLoop(3);
    onUpdate({
      ...delay,
      parallelLoops: [...delay.parallelLoops, newLoop]
    });
  }, [delay, onUpdate, disableLoop]);

  // 更新动作
  const updateAction = useCallback((actionId: string, updatedAction: TaskAction | DelayAction) => {
    onUpdate({
      ...delay,
      actions: delay.actions.map(action => 
        action.id === actionId ? updatedAction : action
      )
    });
  }, [delay, onUpdate]);

  // 删除动作
  const deleteAction = useCallback((actionId: string) => {
    onUpdate({
      ...delay,
      actions: delay.actions.filter(action => action.id !== actionId)
    });
  }, [delay, onUpdate]);

  // 更新循环
  const updateLoop = useCallback((loopId: string, updatedLoop: ParallelLoop) => {
    onUpdate({
      ...delay,
      parallelLoops: delay.parallelLoops.map(loop => 
        loop.id === loopId ? updatedLoop : loop
      )
    });
  }, [delay, onUpdate]);

  // 删除循环
  const deleteLoop = useCallback((loopId: string) => {
    onUpdate({
      ...delay,
      parallelLoops: delay.parallelLoops.filter(loop => loop.id !== loopId)
    });
  }, [delay, onUpdate]);

  // 计算属性
  const hasContent = delay.actions.length > 0 || delay.parallelLoops.length > 0;
  const actionCount = delay.actions.length;
  const loopCount = delay.parallelLoops.length;

  return {
    // 状态
    isExpanded,
    isEditing,
    editDelaySeconds,
    
    // 操作方法
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
    
    // 计算属性
    hasContent,
    actionCount,
    loopCount,
    colorTheme
  };
}
