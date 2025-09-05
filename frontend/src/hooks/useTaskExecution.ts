import { useState, useCallback, useEffect } from 'react';
import { taskExecutionService, type TaskExecutionStatus, type LogEntry } from '../services/TaskExecutionService';
import type { Task } from '../types/task-orchestrator';
import { calculateTaskDuration } from '../utils/task-orchestrator';

/**
 * 任务执行Hook
 * 统一管理任务执行状态和操作
 */
export function useTaskExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<TaskExecutionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 开始执行任务
   */
  const startTask = useCallback(async (task: Task): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // 计算任务预计时长，传递给后端
      const estimatedDuration = calculateTaskDuration(task);
      console.log(`Task estimated duration: ${estimatedDuration}ms (${Math.round(estimatedDuration/1000)}s)`);

      const response = await taskExecutionService.startTask(task, estimatedDuration);

      if (response.success) {
        setIsExecuting(true);
        setExecutionStatus(response.status || null);
        return true;
      } else {
        throw new Error(response.error || '任务启动失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 停止任务执行
   */
  const stopTask = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await taskExecutionService.stopTask();
      
      if (response.success) {
        setIsExecuting(false);
        setExecutionStatus(response.status || null);
        return true;
      } else {
        throw new Error(response.error || '任务停止失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 刷新执行状态
   */
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await taskExecutionService.getStatus();

      if (response.success) {
        setExecutionStatus(response.status);
        // 关键修复：根据后端状态更新执行状态
        setIsExecuting(response.status.isRunning);

        // 如果任务完成，清除错误状态
        if (!response.status.isRunning && error) {
          setError(null);
        }
      }
    } catch (err) {
      console.error('Failed to refresh status:', err);
      // 不设置错误状态，避免干扰用户操作
    }
  }, [error]);

  /**
   * 获取日志
   */
  const fetchLogs = useCallback(async (options: {
    limit?: number;
    level?: 'error' | 'warn' | 'info' | 'debug';
    source?: 'backend' | 'arduino' | 'frontend';
    search?: string;
  } = {}): Promise<void> => {
    try {
      const response = await taskExecutionService.getLogs(options);
      
      if (response.success) {
        setLogs(response.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, []);

  /**
   * 清空错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsExecuting(false);
    setExecutionStatus(null);
    setError(null);
    setLogs([]);
    setIsLoading(false);
  }, []);

  // 自动刷新状态（当任务执行时）
  useEffect(() => {
    // 启动时先检查一次状态
    refreshStatus();

    if (!isExecuting) return;

    const interval = setInterval(() => {
      refreshStatus();
    }, 1000); // 每秒刷新一次

    return () => clearInterval(interval);
  }, [isExecuting, refreshStatus]);

  // 删除自动日志轮询 - 避免无意义刷屏
  // 日志页面会有自己的刷新逻辑

  return {
    // 状态
    isExecuting,
    executionStatus,
    error,
    logs,
    isLoading,

    // 操作
    startTask,
    stopTask,
    refreshStatus,
    fetchLogs,
    clearError,
    reset,

    // 计算属性
    progress: executionStatus ? {
      completed: executionStatus.executedCommands,
      total: executionStatus.totalCommands,
      percentage: executionStatus.totalCommands > 0 
        ? Math.round((executionStatus.executedCommands / executionStatus.totalCommands) * 100)
        : 0
    } : null,

    nextExecutionTime: executionStatus?.nextExecution 
      ? new Date(executionStatus.nextExecution)
      : null
  };
}

export default useTaskExecution;
