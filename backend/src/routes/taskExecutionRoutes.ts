import { Router } from 'express';
import { TaskExecutionController } from '../controllers/TaskExecutionController';

/**
 * 创建任务执行路由
 */
export function createTaskExecutionRoutes(controller: TaskExecutionController): Router {
  const router = Router();

  // 开始执行任务
  router.post('/start', (req, res) => controller.startTask(req, res));

  // 停止任务执行
  router.post('/stop', (req, res) => controller.stopTask(req, res));

  // 获取执行状态
  router.get('/status', (req, res) => controller.getStatus(req, res));

  // 获取执行日志
  router.get('/logs', (req, res) => controller.getLogs(req, res));

  // 健康检查
  router.get('/health', (req, res) => controller.healthCheck(req, res));

  return router;
}
