import { Router } from 'express';
import { DeviceController } from '../controllers/DeviceController';

/**
 * 设备相关路由
 * 定义所有设备控制的HTTP API端点
 */
export function createDeviceRoutes(deviceController: DeviceController): Router {
  const router = Router();

  // 获取所有设备配置
  router.get('/', deviceController.getDevices);

  // 获取所有设备状态
  router.get('/status', deviceController.getAllDeviceStatus);

  // 获取特定设备状态
  router.get('/:deviceId/status', deviceController.getDeviceStatus);

  // 通用设备控制接口
  router.post('/:deviceId/control', deviceController.controlDevice);

  // 设置设备功率（泵专用）
  router.post('/:deviceId/power', deviceController.setDevicePower);

  // 设置设备状态（阀专用）
  router.post('/:deviceId/state', deviceController.setDeviceState);

  // 执行定时动作
  router.post('/:deviceId/timed_action', deviceController.executeTimedAction);

  // 停止所有设备
  router.post('/stop-all', deviceController.stopAllDevices);

  return router;
}
