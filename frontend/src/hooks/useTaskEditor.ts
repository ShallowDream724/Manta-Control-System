/**
 * 任务编辑器状态管理Hook
 * 封装所有任务编辑相关的状态和操作逻辑
 */

import { useState, useCallback, useEffect } from 'react';
import type { Task, Step } from '../types/task-orchestrator';
import { generateId, createStep, validateTask } from '../utils/task-orchestrator';
import type { DeviceConfig, DeviceGroup } from '../types';
import { DEFAULT_DEVICES, DEFAULT_DEVICE_GROUPS } from '../types';

export interface TaskEditorState {
  // 核心数据
  currentTask: Task;
  devices: DeviceConfig[];
  groups: DeviceGroup[];
  
  // UI状态
  isPreviewOpen: boolean;
  isExecuting: boolean;
  selectedStepId?: string;
  selectedActionId?: string;
  
  // 验证状态
  validationErrors: any[];
  isValid: boolean;
}

export interface TaskEditorActions {
  // 任务操作
  updateTaskName: (name: string) => void;
  resetTask: () => void;
  
  // 步骤操作
  addStep: () => void;
  updateStep: (stepId: string, updatedStep: Step) => void;
  deleteStep: (stepId: string) => void;
  moveStep: (fromIndex: number, toIndex: number) => void;
  
  // UI操作
  setPreviewOpen: (open: boolean) => void;
  setExecuting: (executing: boolean) => void;
  setSelectedStep: (stepId?: string) => void;
  setSelectedAction: (actionId?: string) => void;
  
  // 执行操作
  executeTask: () => void;
  stopTask: () => void;
  
  // 数据持久化
  saveToLocal: () => void;
  loadFromLocal: () => void;
  exportTask: () => string;
  importTask: (taskData: string) => boolean;
}

/**
 * 任务编辑器Hook
 * 提供完整的任务编辑状态管理和操作方法
 */
export function useTaskEditor(): TaskEditorState & TaskEditorActions {
  // 核心状态
  const [currentTask, setCurrentTask] = useState<Task>(() => {
    // 尝试从localStorage恢复
    const saved = localStorage.getItem('taskEditor_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          updatedAt: Date.now()
        };
      } catch (e) {
        console.warn('Failed to parse saved task:', e);
      }
    }
    
    // 创建新任务
    return {
      id: generateId(),
      name: '新任务',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  const [devices] = useState<DeviceConfig[]>(DEFAULT_DEVICES);
  const [groups] = useState<DeviceGroup[]>(DEFAULT_DEVICE_GROUPS);
  
  // UI状态
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string>();
  const [selectedActionId, setSelectedActionId] = useState<string>();
  
  // 验证状态
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isValid, setIsValid] = useState(true);

  // 自动保存到localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('taskEditor_draft', JSON.stringify(currentTask));
    }, 1000); // 1秒后保存

    return () => clearTimeout(timer);
  }, [currentTask]);

  // 自动验证
  useEffect(() => {
    const validation = validateTask(currentTask, devices);
    setValidationErrors(validation.errors);
    setIsValid(validation.isValid);
  }, [currentTask, devices]);

  // 任务操作
  const updateTaskName = useCallback((name: string) => {
    setCurrentTask(prev => ({
      ...prev,
      name,
      updatedAt: Date.now()
    }));
  }, []);

  const resetTask = useCallback(() => {
    setCurrentTask({
      id: generateId(),
      name: '新任务',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setSelectedStepId(undefined);
    setSelectedActionId(undefined);
  }, []);

  // 步骤操作
  const addStep = useCallback(() => {
    const newStep = createStep(`步骤 ${currentTask.steps.length + 1}`);
    setCurrentTask(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: Date.now()
    }));
  }, [currentTask.steps.length]);

  const updateStep = useCallback((stepId: string, updatedStep: Step) => {
    setCurrentTask(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? updatedStep : step
      ),
      updatedAt: Date.now()
    }));
  }, []);

  const deleteStep = useCallback((stepId: string) => {
    setCurrentTask(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
      updatedAt: Date.now()
    }));
    
    // 清除选中状态
    if (selectedStepId === stepId) {
      setSelectedStepId(undefined);
    }
  }, [selectedStepId]);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentTask(prev => {
      const newSteps = [...prev.steps];
      const [movedStep] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, movedStep);
      
      return {
        ...prev,
        steps: newSteps,
        updatedAt: Date.now()
      };
    });
  }, []);

  // UI操作
  const setPreviewOpen = useCallback((open: boolean) => {
    setIsPreviewOpen(open);
  }, []);

  const setExecuting = useCallback((executing: boolean) => {
    setIsExecuting(executing);
  }, []);

  const setSelectedStep = useCallback((stepId?: string) => {
    setSelectedStepId(stepId);
  }, []);

  const setSelectedAction = useCallback((actionId?: string) => {
    setSelectedActionId(actionId);
  }, []);

  // 执行操作
  const executeTask = useCallback(() => {
    if (!isValid || currentTask.steps.length === 0) {
      return;
    }
    
    setIsExecuting(!isExecuting);
    // TODO: 实际执行逻辑
  }, [isValid, currentTask.steps.length, isExecuting]);

  const stopTask = useCallback(() => {
    setIsExecuting(false);
    // TODO: 停止执行逻辑
  }, []);

  // 数据持久化
  const saveToLocal = useCallback(() => {
    localStorage.setItem('taskEditor_saved', JSON.stringify(currentTask));
  }, [currentTask]);

  const loadFromLocal = useCallback(() => {
    const saved = localStorage.getItem('taskEditor_saved');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentTask({
          ...parsed,
          updatedAt: Date.now()
        });
        return true;
      } catch (e) {
        console.error('Failed to load task:', e);
        return false;
      }
    }
    return false;
  }, []);

  const exportTask = useCallback(() => {
    return JSON.stringify(currentTask, null, 2);
  }, [currentTask]);

  const importTask = useCallback((taskData: string) => {
    try {
      const parsed = JSON.parse(taskData);
      // 简单验证
      if (parsed.id && parsed.name && Array.isArray(parsed.steps)) {
        setCurrentTask({
          ...parsed,
          updatedAt: Date.now()
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import task:', e);
      return false;
    }
  }, []);

  return {
    // 状态
    currentTask,
    devices,
    groups,
    isPreviewOpen,
    isExecuting,
    selectedStepId,
    selectedActionId,
    validationErrors,
    isValid,
    
    // 操作
    updateTaskName,
    resetTask,
    addStep,
    updateStep,
    deleteStep,
    moveStep,
    setPreviewOpen,
    setExecuting,
    setSelectedStep,
    setSelectedAction,
    executeTask,
    stopTask,
    saveToLocal,
    loadFromLocal,
    exportTask,
    importTask
  };
}
