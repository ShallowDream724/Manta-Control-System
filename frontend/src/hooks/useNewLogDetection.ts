import { useState, useEffect, useCallback, useRef } from 'react';
import { taskExecutionService } from '../services/TaskExecutionService';

/**
 * 新日志检测Hook
 * 智能检测新日志，避免频繁请求
 */
export function useNewLogDetection() {
  const [hasNewLogs, setHasNewLogs] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const [isChecking, setIsChecking] = useState(false);
  const [isTaskExecuting, setIsTaskExecuting] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 检查新日志 - 带防抖和条件检查
   */
  const checkNewLogs = useCallback(async (force: boolean = false) => {
    // 防止重复检查
    if (isChecking) return;

    // 如果没有任务执行且不是强制检查，跳过
    if (!isTaskExecuting && !force) return;

    setIsChecking(true);

    try {
      // 获取最近的日志，优先检查错误和警告
      const response = await taskExecutionService.getLogs({
        limit: 10, // 减少请求数据量
      });

      if (response.success && response.logs.length > 0) {
        // 检查是否有比上次检查时间更新的日志
        const newLogs = response.logs.filter(log =>
          log.timestamp > lastCheckTime
        );

        if (newLogs.length > 0) {
          // 如果有错误或警告级别的新日志，立即显示红点
          const hasImportantLogs = newLogs.some(log =>
            log.level === 'error' || log.level === 'warn'
          );

          // 或者有任务执行相关的日志
          const hasTaskLogs = newLogs.some(log =>
            log.category === 'task_execution' ||
            log.category === 'device_control' ||
            log.source === 'arduino'
          );

          if (hasImportantLogs || hasTaskLogs) {
            setHasNewLogs(true);
          }
        }
      }
    } catch (error) {
      // 静默处理错误，避免控制台噪音
      if (force) {
        console.error('检查新日志失败:', error);
      }
    } finally {
      setIsChecking(false);
    }
  }, [lastCheckTime, isChecking, isTaskExecuting]);

  /**
   * 标记日志为已读
   */
  const markLogsAsRead = useCallback(() => {
    setHasNewLogs(false);
    setLastCheckTime(Date.now());
  }, []);

  /**
   * 重置检测状态
   */
  const resetDetection = useCallback(() => {
    setHasNewLogs(false);
    setLastCheckTime(Date.now());
  }, []);

  /**
   * 设置任务执行状态
   */
  const setTaskExecutionStatus = useCallback((executing: boolean) => {
    setIsTaskExecuting(executing);

    if (executing) {
      // 任务开始执行时，立即检查一次
      checkNewLogs(true);
    }
  }, [checkNewLogs]);

  /**
   * 手动检查新日志
   */
  const manualCheck = useCallback(() => {
    checkNewLogs(true);
  }, [checkNewLogs]);

  // 智能定期检查新日志
  useEffect(() => {
    // 清除之前的定时器
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const scheduleNextCheck = () => {
      // 根据任务执行状态调整检查频率
      const interval = isTaskExecuting ? 5000 : 60000; // 执行时5秒，空闲时60秒

      checkTimeoutRef.current = setTimeout(() => {
        checkNewLogs();
        scheduleNextCheck(); // 递归调度下次检查
      }, interval);
    };

    // 立即检查一次（仅在强制或任务执行时）
    if (isTaskExecuting) {
      checkNewLogs();
    }

    // 调度下次检查
    scheduleNextCheck();

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [checkNewLogs, isTaskExecuting]);

  return {
    hasNewLogs,
    markLogsAsRead,
    resetDetection,
    setTaskExecutionStatus,
    manualCheck,
    isTaskExecuting
  };
}

export default useNewLogDetection;
