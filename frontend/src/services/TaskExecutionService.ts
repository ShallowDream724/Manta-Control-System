import type { Task } from '../types/task-orchestrator';

/**
 * 前端任务执行服务
 * 负责与后端任务执行API通信
 */
export class TaskExecutionService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * 开始执行任务
   */
  async startTask(task: Task, estimatedDuration?: number): Promise<TaskExecutionResponse> {
    try {
      console.log('Starting task execution:', task.name);
      console.log('Task data:', JSON.stringify(task, null, 2));

      const response = await fetch(`${this.baseUrl}/task-execution/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          estimatedDuration
        })
      });

      const responseText = await response.text();
      console.log('Start task response:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage} - Response: ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }

      return JSON.parse(responseText);

    } catch (error) {
      console.error('Failed to start task:', error);
      throw error;
    }
  }

  /**
   * 停止任务执行
   */
  async stopTask(): Promise<TaskExecutionResponse> {
    try {
      console.log('Stopping task execution');

      const response = await fetch(`${this.baseUrl}/task-execution/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseText = await response.text();
      console.log('Stop task response:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage} - Response: ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }

      return JSON.parse(responseText);

    } catch (error) {
      console.error('Failed to stop task:', error);
      throw error;
    }
  }

  /**
   * 获取执行状态
   */
  async getStatus(): Promise<TaskStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/task-execution/status`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to get task status:', error);
      throw error;
    }
  }

  /**
   * 获取执行日志
   */
  async getLogs(options: LogQueryOptions = {}): Promise<LogQueryResponse> {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.level) params.append('level', options.level);
      if (options.source) params.append('source', options.source);
      if (options.category) params.append('category', options.category);
      if (options.search) params.append('search', options.search);

      const url = `${this.baseUrl}/task-execution/logs?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to get logs:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/task-execution/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// ==================== 类型定义 ====================

export interface TaskExecutionResponse {
  success: boolean;
  message?: string;
  taskId?: string;
  taskName?: string;
  executedCommands?: number;
  totalCommands?: number;
  status?: TaskExecutionStatus;
  error?: string;
}

export interface TaskStatusResponse {
  success: boolean;
  status: TaskExecutionStatus;
  timestamp: string;
  error?: string;
}

export interface TaskExecutionStatus {
  isRunning: boolean;
  totalCommands: number;
  executedCommands: number;
  upcomingCommands: number;
  nextExecution: number | null;
}

export interface LogQueryOptions {
  limit?: number;
  level?: 'error' | 'warn' | 'info' | 'debug';
  source?: 'backend' | 'arduino' | 'frontend';
  category?: 'system' | 'communication' | 'task_execution' | 'device_control' | 'user_action' | 'error_handling';
  search?: string;
}

export interface LogQueryResponse {
  success: boolean;
  logs: LogEntry[];
  total: number;
  limit: number;
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  source: 'backend' | 'arduino' | 'frontend';
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  meta?: any;
  category: string;
}

export interface HealthCheckResponse {
  success: boolean;
  service: string;
  status: 'healthy' | 'unhealthy';
  isRunning?: boolean;
  uptime?: number;
  timestamp: string;
  error?: string;
}

// 单例模式
export const taskExecutionService = new TaskExecutionService();
