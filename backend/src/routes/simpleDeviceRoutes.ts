import { Router } from 'express';

/**
 * 简化的设备路由
 * 用于测试路由问题
 */
export function createSimpleDeviceRoutes(): Router {
  const router = Router();

  // 获取所有设备配置
  router.get('/', (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 'test_device', name: 'Test Device', type: 'pump' }
      ]
    });
  });

  // 获取所有设备状态
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      data: [
        { deviceId: 'test_device', isOnline: false, currentValue: 0 }
      ]
    });
  });

  // 获取特定设备状态
  router.get('/:deviceId/status', (req, res) => {
    res.json({
      success: true,
      data: {
        deviceId: req.params.deviceId,
        isOnline: false,
        currentValue: 0
      }
    });
  });

  // 通用设备控制接口
  router.post('/:deviceId/control', (req, res) => {
    res.json({
      success: true,
      data: {
        commandId: 'test_command',
        message: 'Command executed successfully'
      }
    });
  });

  return router;
}
