import { Request, Response } from 'express';
import { Logger } from 'winston';
import { TaskExecutionService } from '../services/TaskExecutionService';
import type { Task } from '../types/task';

/**
 * 任务执行控制器
 * 处理任务执行相关的HTTP请求
 */
export class TaskExecutionController {
  constructor(
    private taskExecutionService: TaskExecutionService,
    private logger: Logger,
    private unifiedLogService?: any // 临时类型，避免循环依赖
  ) {}

  /**
   * 开始执行任务
   * POST /api/task-execution/start
   */
  startTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { task, estimatedDuration }: { task: Task, estimatedDuration?: number } = req.body;
      
      this.logger.info(`Received task execution request: ${task.name}`);
      this.logger.info(`Task details: ${JSON.stringify(task, null, 2)}`);
      
      // 验证任务结构
      if (!task || !task.id || !task.name || !Array.isArray(task.steps)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task structure',
          message: 'Task must have id, name, and steps array'
        });
        return;
      }

      // 检查是否有任务正在执行
      const status = this.taskExecutionService.getScheduleStatus();
      if (status.isRunning) {
        res.status(409).json({
          success: false,
          error: 'Task already running',
          message: 'Please stop the current task before starting a new one',
          currentStatus: status
        });
        return;
      }

      // 开始执行任务
      await this.taskExecutionService.executeTask(task, estimatedDuration);
      
      const newStatus = this.taskExecutionService.getScheduleStatus();
      
      this.logger.info(`Task execution started successfully: ${task.name}`);
      this.logger.info(`Task has ${newStatus.totalSteps} steps, currently on step ${newStatus.currentStep}`);
      
      res.json({
        success: true,
        message: 'Task execution started',
        taskId: task.id,
        taskName: task.name,
        status: newStatus
      });

    } catch (error) {
      this.logger.error('Failed to start task execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start task execution',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 停止任务执行
   * POST /api/task-execution/stop
   */
  stopTask = async (req: Request, res: Response): Promise<void> => {
    try {
      this.logger.info('Received task stop request');
      
      const statusBefore = this.taskExecutionService.getScheduleStatus();
      
      if (!statusBefore.isRunning) {
        res.status(400).json({
          success: false,
          error: 'No task running',
          message: 'There is no task currently running',
          status: statusBefore
        });
        return;
      }

      // 停止执行
      this.taskExecutionService.stopExecution();
      
      const statusAfter = this.taskExecutionService.getScheduleStatus();
      
      this.logger.info('Task execution stopped successfully');
      this.logger.info(`Task was on step ${statusBefore.currentStep}/${statusBefore.totalSteps} when stopped`);

      res.json({
        success: true,
        message: 'Task execution stopped',
        currentStep: statusAfter.currentStep,
        totalSteps: statusAfter.totalSteps,
        status: statusAfter
      });

    } catch (error) {
      this.logger.error('Failed to stop task execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop task execution',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 获取执行状态
   * GET /api/task-execution/status
   */
  getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.taskExecutionService.getScheduleStatus();
      
      // 删除状态查询日志，避免频繁输出
      
      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get task execution status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get task execution status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 获取执行历史/日志
   * GET /api/task-execution/logs
   */
  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        limit = 100,
        offset = 0,
        level,
        source,
        category,
        search
      } = req.query;

      // 删除日志查询日志，避免频繁输出

      if (!this.unifiedLogService) {
        // 如果没有统一日志服务，返回基本日志
        res.json({
          success: true,
          logs: [
            {
              id: 'demo_log_1',
              timestamp: Date.now(),
              level: 'info',
              message: '统一日志服务未连接，显示基本日志',
              source: 'backend',
              category: 'system'
            }
          ],
          total: 1,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: false
        });
        return;
      }

      // 从统一日志服务获取日志
      const result = this.unifiedLogService.getLogs({
        limit: Number(limit),
        offset: Number(offset),
        level: level as string,
        source: source as string,
        category: category as string,
        search: search as string
      });

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      this.logger.error('Failed to get execution logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get execution logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 健康检查
   * GET /api/task-execution/health
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.taskExecutionService.getScheduleStatus();
      
      res.json({
        success: true,
        service: 'TaskExecutionService',
        status: 'healthy',
        isRunning: status.isRunning,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        service: 'TaskExecutionService',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };
}
