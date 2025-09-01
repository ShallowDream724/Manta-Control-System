import winston from 'winston';
import { SerialConnectionManager, SerialConfig } from './SerialConnectionManager';
import { WiFiConnectionManager, WiFiConfig } from './WiFiConnectionManager';
import { ConnectionConfig } from '../../types/device';

/**
 * 连接管理器工厂
 * 负责创建和管理不同类型的连接管理器
 * 
 * 职责：
 * - 根据配置创建合适的连接管理器
 * - 提供统一的连接接口
 * - 管理连接切换逻辑
 */
export class ConnectionManagerFactory {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  /**
   * 创建连接管理器
   */
  createConnectionManager(config: ConnectionConfig): IConnectionManager {
    switch (config.type) {
      case 'serial':
        if (!config.serial) {
          throw new Error('Serial configuration is required for serial connection');
        }
        return new SerialConnectionManager(config.serial, this.logger);

      case 'wifi':
        if (!config.wifi) {
          throw new Error('WiFi configuration is required for WiFi connection');
        }
        return new WiFiConnectionManager(config.wifi, this.logger);

      default:
        throw new Error(`Unsupported connection type: ${config.type}`);
    }
  }

  /**
   * 创建自动切换连接管理器
   */
  createAutoSwitchManager(configs: ConnectionConfig[]): AutoSwitchConnectionManager {
    return new AutoSwitchConnectionManager(configs, this.logger);
  }
}

/**
 * 连接管理器接口
 * 定义所有连接管理器必须实现的方法
 */
export interface IConnectionManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendCommand(command: any): Promise<boolean>;
  getConnectionState(): any;
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

/**
 * 自动切换连接管理器
 * 支持在多种连接方式之间自动切换
 */
export class AutoSwitchConnectionManager {
  private logger: winston.Logger;
  private configs: ConnectionConfig[];
  private currentManager: IConnectionManager | null = null;
  private currentConfigIndex = 0;
  private factory: ConnectionManagerFactory;

  constructor(configs: ConnectionConfig[], logger: winston.Logger) {
    this.configs = configs;
    this.logger = logger;
    this.factory = new ConnectionManagerFactory(logger);
  }

  /**
   * 启动自动切换管理器
   */
  async start(): Promise<void> {
    this.logger.info('Starting Auto Switch Connection Manager');
    await this.tryNextConnection();
  }

  /**
   * 停止管理器
   */
  async stop(): Promise<void> {
    if (this.currentManager) {
      await this.currentManager.stop();
      this.currentManager = null;
    }
  }

  /**
   * 发送命令
   */
  async sendCommand(command: any): Promise<boolean> {
    if (!this.currentManager) {
      this.logger.error('No active connection manager');
      return false;
    }

    return await this.currentManager.sendCommand(command);
  }

  /**
   * 获取当前连接状态
   */
  getConnectionState(): any {
    if (!this.currentManager) {
      return { status: 'disconnected', type: null };
    }

    return this.currentManager.getConnectionState();
  }

  /**
   * 尝试下一个连接配置
   */
  private async tryNextConnection(): Promise<void> {
    if (this.currentConfigIndex >= this.configs.length) {
      this.logger.error('All connection methods failed');
      return;
    }

    const config = this.configs[this.currentConfigIndex];
    this.logger.info(`Trying connection method: ${config.type}`);

    try {
      if (this.currentManager) {
        await this.currentManager.stop();
      }

      this.currentManager = this.factory.createConnectionManager(config);
      this.setupManagerEvents();
      await this.currentManager.start();

    } catch (error) {
      this.logger.error(`Connection method ${config.type} failed:`, error);
      this.currentConfigIndex++;
      setTimeout(() => this.tryNextConnection(), 2000);
    }
  }

  /**
   * 设置管理器事件处理
   */
  private setupManagerEvents(): void {
    if (!this.currentManager) return;

    this.currentManager.on('connected', () => {
      this.logger.info('Connection established successfully');
      this.currentConfigIndex = 0; // 重置索引，下次优先尝试第一个配置
    });

    this.currentManager.on('disconnected', () => {
      this.logger.warn('Connection lost, trying next method');
      this.currentConfigIndex++;
      setTimeout(() => this.tryNextConnection(), 1000);
    });

    this.currentManager.on('error', (error: Error) => {
      this.logger.error('Connection error:', error);
      this.currentConfigIndex++;
      setTimeout(() => this.tryNextConnection(), 2000);
    });
  }
}
