import { Request, Response } from 'express';
import { Logger } from 'winston';
import { DeviceConfigService } from '../services/DeviceConfigService';
import { ArduinoCodeGenerationService } from '../services/code-generation/CodeGenerationService';
import type { DeviceConfig } from '../types/device';
import fs from 'fs/promises';
import path from 'path';

/**
 * 设备配置控制器
 * 处理设备配置的CRUD操作
 */
export class DeviceConfigController {
  private codeGenerator: ArduinoCodeGenerationService;

  constructor(
    private deviceConfigService: DeviceConfigService,
    private logger: Logger
  ) {
    this.codeGenerator = new ArduinoCodeGenerationService(logger);
  }

  /**
   * 获取所有设备配置
   */
  async getAllConfigs(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Getting all device configurations');
      
      const configs = await this.deviceConfigService.getAllConfigs();
      
      res.json({
        success: true,
        data: configs,
        count: configs.length
      });
    } catch (error) {
      this.logger.error('Failed to get device configurations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device configurations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 根据ID获取设备配置
   */
  async getConfigById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info(`Getting device configuration for ID: ${id}`);
      
      const config = await this.deviceConfigService.getConfigById(id);
      
      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Device configuration not found',
          message: `No configuration found for device ID: ${id}`
        });
        return;
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      this.logger.error(`Failed to get device configuration for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 创建新的设备配置
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const deviceConfig: DeviceConfig = req.body;
      this.logger.info(`Creating device configuration for: ${deviceConfig.id}`);
      
      // 验证配置
      const validation = this.validateDeviceConfig(deviceConfig);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid device configuration',
          message: validation.errors.join(', ')
        });
        return;
      }

      const createdConfig = await this.deviceConfigService.createConfig(deviceConfig);
      
      res.status(201).json({
        success: true,
        data: createdConfig,
        message: 'Device configuration created successfully'
      });
    } catch (error) {
      this.logger.error('Failed to create device configuration:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Device configuration already exists',
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create device configuration',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * 更新设备配置
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deviceConfig: DeviceConfig = req.body;
      
      this.logger.info(`Updating device configuration for: ${id}`);
      
      // 确保ID匹配
      if (deviceConfig.id !== id) {
        res.status(400).json({
          success: false,
          error: 'ID mismatch',
          message: 'Device ID in URL does not match ID in request body'
        });
        return;
      }

      // 验证配置
      const validation = this.validateDeviceConfig(deviceConfig);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid device configuration',
          message: validation.errors.join(', ')
        });
        return;
      }

      const updatedConfig = await this.deviceConfigService.updateConfig(id, deviceConfig);
      
      if (!updatedConfig) {
        res.status(404).json({
          success: false,
          error: 'Device configuration not found',
          message: `No configuration found for device ID: ${id}`
        });
        return;
      }

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Device configuration updated successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to update device configuration for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to update device configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 删除设备配置
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info(`Deleting device configuration for: ${id}`);
      
      const deleted = await this.deviceConfigService.deleteConfig(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Device configuration not found',
          message: `No configuration found for device ID: ${id}`
        });
        return;
      }

      res.json({
        success: true,
        message: 'Device configuration deleted successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to delete device configuration for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete device configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 验证设备配置
   */
  private validateDeviceConfig(config: DeviceConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 必填字段验证
    if (!config.id?.trim()) {
      errors.push('Device ID is required');
    }

    if (!config.name?.trim()) {
      errors.push('Device name is required');
    }

    if (!config.type) {
      errors.push('Device type is required');
    } else if (!['pump', 'valve'].includes(config.type)) {
      errors.push('Device type must be "pump" or "valve"');
    }

    if (config.pin === undefined || config.pin === null) {
      errors.push('Pin number is required');
    } else if (config.pin < 0 || config.pin > 20) {
      errors.push('Pin number must be between 0 and 20');
    }

    // PWM特定验证
    if (config.type === 'pwm') {
      if (!config.pwmFrequency || config.pwmFrequency < 1) {
        errors.push('PWM frequency must be greater than 0');
      }

      if (config.maxPower !== undefined && (config.maxPower < 0 || config.maxPower > 100)) {
        errors.push('Max power must be between 0 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 批量导入设备配置
   */
  async importConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs: DeviceConfig[] = req.body;
      this.logger.info(`Importing ${configs.length} device configurations`);
      
      if (!Array.isArray(configs)) {
        res.status(400).json({
          success: false,
          error: 'Invalid request format',
          message: 'Request body must be an array of device configurations'
        });
        return;
      }

      // 验证所有配置
      const validationResults = configs.map((config, index) => ({
        index,
        config,
        validation: this.validateDeviceConfig(config)
      }));

      const invalidConfigs = validationResults.filter(r => !r.validation.isValid);
      if (invalidConfigs.length > 0) {
        res.status(400).json({
          success: false,
          imported: 0,
          errors: invalidConfigs.map(r =>
            `设备 ${r.config.id} (索引 ${r.index}): ${r.validation.errors.join(', ')}`
          )
        });
        return;
      }

      const importedConfigs = await this.deviceConfigService.importConfigs(configs);
      
      res.json({
        success: true,
        imported: importedConfigs.length,
        errors: [],
        message: 'Device configurations imported successfully'
      });
    } catch (error) {
      this.logger.error('Failed to import device configurations:', error);
      res.status(500).json({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * 导出设备配置
   */
  async exportConfigs(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Exporting device configurations');
      
      const configs = await this.deviceConfigService.getAllConfigs();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="device-configs.json"');
      
      res.json({
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        deviceConfigs: configs
      });
    } catch (error) {
      this.logger.error('Failed to export device configurations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export device configurations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 生成Arduino代码
   * POST /api/device-configs/generate-arduino
   */
  generateArduinoCode = async (req: Request, res: Response): Promise<void> => {
    try {
      this.logger.info('Generating Arduino code...');

      // 使用前端传递的设备配置，而不是后端存储的配置
      const { devices: frontendDevices, wifiConfig: frontendWifiConfig } = req.body;

      if (!frontendDevices || !Array.isArray(frontendDevices) || frontendDevices.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No devices provided in request body'
        });
        return;
      }

      // 使用原始的设备ID（不再重写为 device_pwm_X/device_digital_X）
      const devicesWithArduinoIds = frontendDevices;

      // WiFi配置优先级：前端传入 > 配置文件 > 默认
      const wifiConfig = await this.getWifiConfig(frontendWifiConfig);

      // 生成Arduino代码
      const result = await this.codeGenerator.generateCode(devicesWithArduinoIds, wifiConfig);

      this.logger.info(`Arduino code generated successfully for ${devicesWithArduinoIds.length} devices`);

      res.json({
        success: true,
        data: {
          code: result.code,
          deviceCount: devicesWithArduinoIds.length,
          generatedAt: result.generatedAt.toISOString(),
          devices: devicesWithArduinoIds.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            pin: d.pin
          })),
          metadata: result.metadata,
          validation: result.validation
        }
      });

    } catch (error) {
      this.logger.error('Failed to generate Arduino code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate Arduino code'
      });
    }
  };

  /**
   * 读取WiFi配置（前端传入 > config/devices.json > 默认值）
   */
  private async getWifiConfig(frontendWifiConfig?: { ssid?: string; password?: string }) {
    // 1) 前端传入
    if (frontendWifiConfig?.ssid) {
      return {
        ssid: frontendWifiConfig.ssid,
        password: frontendWifiConfig.password || ''
      };
    }

    // 2) 配置文件
    try {
      const configPath = path.join('config', 'devices.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed?.wifiConfig?.ssid) {
        return {
          ssid: String(parsed.wifiConfig.ssid),
          password: String(parsed.wifiConfig.password || '')
        };
      }
    } catch (e) {
      // 忽略读取失败，走默认
      this.logger.warn('No wifiConfig found in config/devices.json, using defaults');
    }

    // 3) 默认
    return {
      ssid: 'FishControl_WiFi',
      password: 'fish2025'
    };
  }

  /**
   * 为设备生成标准化的Arduino ID
   */
  private generateArduinoIds(devices: DeviceConfig[]): DeviceConfig[] {
    const pwmCount = { count: 0 };
    const digitalCount = { count: 0 };

    return devices.map(device => {
      let arduinoId: string;

      if (device.type === 'pwm') {
        pwmCount.count++;
        arduinoId = `device_pwm_${pwmCount.count}`;
      } else {
        digitalCount.count++;
        arduinoId = `device_digital_${digitalCount.count}`;
      }

      return {
        ...device,
        id: arduinoId
      };
    });
  }
}
