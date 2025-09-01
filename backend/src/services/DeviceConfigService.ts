import fs from 'fs/promises';
import path from 'path';
import { Logger } from 'winston';
import type { DeviceConfig } from '../types/device';

/**
 * 设备配置服务
 * 管理设备配置的存储和检索
 */
export class DeviceConfigService {
  private configFilePath: string;
  private configs: Map<string, DeviceConfig> = new Map();

  constructor(
    private logger: Logger,
    configDir: string = 'config'
  ) {
    this.configFilePath = path.join(configDir, 'devices.json');
  }

  /**
   * 初始化服务，加载配置文件
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing DeviceConfigService...');
      await this.loadConfigs();
      this.logger.info(`Loaded ${this.configs.size} device configurations`);
    } catch (error) {
      this.logger.error('Failed to initialize DeviceConfigService:', error);
      throw error;
    }
  }

  /**
   * 从文件加载配置
   */
  private async loadConfigs(): Promise<void> {
    try {
      const data = await fs.readFile(this.configFilePath, 'utf-8');
      const configData = JSON.parse(data);
      
      if (configData.devices && Array.isArray(configData.devices)) {
        this.configs.clear();
        configData.devices.forEach((device: DeviceConfig) => {
          this.configs.set(device.id, device);
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn('Device config file not found, starting with empty configuration');
        this.configs.clear();
      } else {
        this.logger.error('Failed to load device configurations:', error);
        throw error;
      }
    }
  }

  /**
   * 保存配置到文件
   */
  private async saveConfigs(): Promise<void> {
    try {
      const configData = {
        boardType: "Arduino UNO R4 WiFi",
        devices: Array.from(this.configs.values()),
        wifiConfig: {
          ssid: "FishControl_WiFi",
          password: "fish2025"
        },
        lastUpdated: new Date().toISOString()
      };

      // 确保目录存在
      const configDir = path.dirname(this.configFilePath);
      await fs.mkdir(configDir, { recursive: true });

      await fs.writeFile(this.configFilePath, JSON.stringify(configData, null, 2), 'utf-8');
      this.logger.info('Device configurations saved successfully');
    } catch (error) {
      this.logger.error('Failed to save device configurations:', error);
      throw error;
    }
  }

  /**
   * 获取所有设备配置
   */
  async getAllConfigs(): Promise<DeviceConfig[]> {
    return Array.from(this.configs.values());
  }

  /**
   * 根据ID获取设备配置
   */
  async getConfigById(id: string): Promise<DeviceConfig | undefined> {
    return this.configs.get(id);
  }

  /**
   * 创建新的设备配置
   */
  async createConfig(config: DeviceConfig): Promise<DeviceConfig> {
    // 检查ID是否已存在
    if (this.configs.has(config.id)) {
      throw new Error(`Device configuration with ID '${config.id}' already exists`);
    }

    // 检查引脚是否已被占用
    const existingPin = Array.from(this.configs.values()).find(c => c.pin === config.pin);
    if (existingPin) {
      throw new Error(`Pin ${config.pin} is already used by device '${existingPin.id}'`);
    }

    // 添加时间戳
    const configWithTimestamp = {
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.set(config.id, configWithTimestamp);
    await this.saveConfigs();

    this.logger.info(`Created device configuration: ${config.id}`);
    return configWithTimestamp;
  }

  /**
   * 更新设备配置
   */
  async updateConfig(id: string, config: DeviceConfig): Promise<DeviceConfig | null> {
    const existingConfig = this.configs.get(id);
    if (!existingConfig) {
      return null;
    }

    // 检查引脚是否被其他设备占用
    const existingPin = Array.from(this.configs.values()).find(c => c.pin === config.pin && c.id !== id);
    if (existingPin) {
      throw new Error(`Pin ${config.pin} is already used by device '${existingPin.id}'`);
    }

    // 保留创建时间，更新修改时间
    const updatedConfig = {
      ...config,
      createdAt: existingConfig.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.set(id, updatedConfig);
    await this.saveConfigs();

    this.logger.info(`Updated device configuration: ${id}`);
    return updatedConfig;
  }

  /**
   * 删除设备配置
   */
  async deleteConfig(id: string): Promise<boolean> {
    const deleted = this.configs.delete(id);
    
    if (deleted) {
      await this.saveConfigs();
      this.logger.info(`Deleted device configuration: ${id}`);
    }

    return deleted;
  }

  /**
   * 批量导入设备配置
   */
  async importConfigs(configs: DeviceConfig[]): Promise<DeviceConfig[]> {
    const importedConfigs: DeviceConfig[] = [];
    const timestamp = new Date().toISOString();

    // 验证所有配置
    const usedPins = new Set<number>();
    const usedIds = new Set<string>();

    for (const config of configs) {
      // 检查ID重复
      if (usedIds.has(config.id)) {
        throw new Error(`Duplicate device ID in import: ${config.id}`);
      }
      usedIds.add(config.id);

      // 检查引脚重复
      if (usedPins.has(config.pin)) {
        throw new Error(`Duplicate pin in import: ${config.pin}`);
      }
      usedPins.add(config.pin);

      // 检查与现有配置的冲突
      const existingConfig = this.configs.get(config.id);
      if (existingConfig) {
        throw new Error(`Device ID '${config.id}' already exists`);
      }

      const existingPin = Array.from(this.configs.values()).find(c => c.pin === config.pin);
      if (existingPin) {
        throw new Error(`Pin ${config.pin} is already used by device '${existingPin.id}'`);
      }
    }

    // 导入所有配置
    for (const config of configs) {
      const configWithTimestamp = {
        ...config,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      this.configs.set(config.id, configWithTimestamp);
      importedConfigs.push(configWithTimestamp);
    }

    await this.saveConfigs();
    this.logger.info(`Imported ${importedConfigs.length} device configurations`);

    return importedConfigs;
  }

  /**
   * 检查引脚是否可用
   */
  async isPinAvailable(pin: number, excludeDeviceId?: string): Promise<boolean> {
    const existingDevice = Array.from(this.configs.values()).find(
      config => config.pin === pin && config.id !== excludeDeviceId
    );
    return !existingDevice;
  }

  /**
   * 检查设备ID是否可用
   */
  async isIdAvailable(id: string): Promise<boolean> {
    return !this.configs.has(id);
  }

  /**
   * 获取已使用的引脚列表
   */
  async getUsedPins(): Promise<number[]> {
    return Array.from(this.configs.values()).map(config => config.pin);
  }

  /**
   * 根据类型获取设备配置
   */
  async getConfigsByType(type: 'pump' | 'valve'): Promise<DeviceConfig[]> {
    return Array.from(this.configs.values()).filter(config => config.type === type);
  }

  /**
   * 根据控制模式获取设备配置
   */
  async getConfigsByMode(mode: 'pwm' | 'digital'): Promise<DeviceConfig[]> {
    return Array.from(this.configs.values()).filter(config => config.mode === mode);
  }

  /**
   * 获取配置统计信息
   */
  async getConfigStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byMode: Record<string, number>;
    usedPins: number[];
  }> {
    const configs = Array.from(this.configs.values());
    
    const byType: Record<string, number> = {};
    const byMode: Record<string, number> = {};

    configs.forEach(config => {
      byType[config.type] = (byType[config.type] || 0) + 1;
      byMode[config.mode] = (byMode[config.mode] || 0) + 1;
    });

    return {
      total: configs.length,
      byType,
      byMode,
      usedPins: configs.map(c => c.pin).sort((a, b) => a - b)
    };
  }

  /**
   * 重新加载配置文件
   */
  async reloadConfigs(): Promise<void> {
    await this.loadConfigs();
    this.logger.info('Device configurations reloaded from file');
  }
}
