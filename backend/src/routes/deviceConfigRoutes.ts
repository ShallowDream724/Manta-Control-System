import { Router } from 'express';
import { DeviceConfigController } from '../controllers/DeviceConfigController';

/**
 * 创建设备配置路由
 */
export function createDeviceConfigRoutes(controller: DeviceConfigController): Router {
  const router = Router();

  // 获取所有设备配置
  router.get('/', (req, res) => controller.getAllConfigs(req, res));

  // 获取配置统计信息
  router.get('/stats', async (req, res) => {
    try {
      // 这里可以添加统计信息的获取逻辑
      res.json({
        success: true,
        data: {
          message: 'Stats endpoint - to be implemented'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get stats'
      });
    }
  });

  // 导出配置
  router.get('/export', (req, res) => controller.exportConfigs(req, res));

  // 根据ID获取设备配置
  router.get('/:id', (req, res) => controller.getConfigById(req, res));

  // 创建新的设备配置
  router.post('/', (req, res) => controller.createConfig(req, res));

  // 批量导入设备配置
  router.post('/import', (req, res) => controller.importConfigs(req, res));

  // 更新设备配置
  router.put('/:id', (req, res) => controller.updateConfig(req, res));

  // 删除设备配置
  router.delete('/:id', (req, res) => controller.deleteConfig(req, res));

  return router;
}
