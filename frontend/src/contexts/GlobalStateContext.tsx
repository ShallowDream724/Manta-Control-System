import React, { createContext, useContext, useEffect, useState } from 'react';
import { taskExecutionService, type TaskExecutionStatus } from '../services/TaskExecutionService';

/**
 * 全局状态管理 - 避免重复请求
 */
interface GlobalState {
  // 任务执行状态
  taskStatus: TaskExecutionStatus | null;
  isTaskExecuting: boolean;
  
  // 日志状态
  hasNewLogs: boolean;
  lastLogCheck: number;
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
}

interface GlobalStateContextType extends GlobalState {
  // 方法
  refreshTaskStatus: () => Promise<void>;
  markLogsAsRead: () => void;
  setError: (error: string | null) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

/**
 * 全局状态提供者
 */
export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GlobalState>({
    taskStatus: null,
    isTaskExecuting: false,
    hasNewLogs: false,
    lastLogCheck: 0,
    isLoading: false,
    error: null
  });

  // 刷新任务状态
  const refreshTaskStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await taskExecutionService.getStatus();
      if (response.success) {
        setState(prev => ({
          ...prev,
          taskStatus: response.status,
          isTaskExecuting: response.status.isRunning,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Failed to refresh task status:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  };

  // 检查新日志
  const checkNewLogs = async () => {
    try {
      const response = await taskExecutionService.getLogs({ limit: 1 });
      if (response.success && response.logs.length > 0) {
        const latestLogTime = response.logs[0].timestamp;
        if (latestLogTime > state.lastLogCheck) {
          setState(prev => ({ ...prev, hasNewLogs: true }));
        }
      }
    } catch (error) {
      console.error('Failed to check new logs:', error);
    }
  };

  // 标记日志已读
  const markLogsAsRead = () => {
    setState(prev => ({
      ...prev,
      hasNewLogs: false,
      lastLogCheck: Date.now()
    }));
  };

  // 设置错误
  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  // 自动刷新任务状态
  useEffect(() => {
    // 初始加载
    refreshTaskStatus();

    // 定期刷新
    const interval = setInterval(() => {
      refreshTaskStatus();
    }, 2000); // 每2秒刷新任务状态

    return () => clearInterval(interval);
  }, []);

  // 自动检查新日志
  useEffect(() => {
    // 只在任务执行时检查新日志
    if (!state.isTaskExecuting) return;

    const interval = setInterval(() => {
      checkNewLogs();
    }, 5000); // 每5秒检查新日志

    return () => clearInterval(interval);
  }, [state.isTaskExecuting, state.lastLogCheck]);

  const contextValue: GlobalStateContextType = {
    ...state,
    refreshTaskStatus,
    markLogsAsRead,
    setError
  };

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
}

/**
 * 使用全局状态的Hook
 */
export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return context;
}
