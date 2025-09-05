import { Router } from 'express';
import { ArduinoLogController } from '../controllers/ArduinoLogController';

/**
 * 创建Arduino日志路由
 */
export function createArduinoLogRoutes(controller: ArduinoLogController): Router {
  const router = Router();

  // 接收单条日志
  router.post('/', (req, res) => controller.receiveLog(req, res));

  // 接收批量日志
  router.post('/batch', (req, res) => controller.receiveBatchLogs(req, res));

  // 健康检查
  router.get('/health', (req, res) => controller.healthCheck(req, res));

  return router;
}
