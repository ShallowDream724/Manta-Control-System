import { EventEmitter } from 'events';
import winston from 'winston';
import { DeviceConfig, DeviceCommand, DeviceState } from '../types/device';
import { DeviceStateManager } from './device/DeviceStateManager';
import { CommandProcessor } from './device/CommandProcessor';
import { ConflictDetector } from './device/ConflictDetector';

/**
 * 设备控制服务（重构版）
 * 协调各个子模块，提供统一的设备控制接口
 * 
 * 职责：
 * - 协调子模块工作
 * - 提供统一的外部接口
 * - 管理服务生命周期
 * - 事件转发和聚合
 */
export class DeviceControlService extends EventEmitter {
  private logger: winston.Logger;
  private stateManager: DeviceStateManager;
  private conflictDetector: ConflictDetector;
  private commandProcessor: CommandProcessor;
  private isInitialized = false;

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    
    // 初始化子模块
    this.stateManager = new DeviceStateManager(logger);
    this.conflictDetector = new ConflictDetector(this.stateManager, logger);
    this.commandProcessor = new CommandProcessor(
      this.stateManager,
      this.conflictDetector,
      logger
    );

    this.setupEventHandlers();
  }

  /**
   * 初始化服务
   */
  async initialize(deviceConfigs: DeviceConfig[]): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Device Control Service already initialized');
      return;
    }

    this.logger.info('Initializing Device Control Service');
    
    try {
      await this.stateManager.initialize(deviceConfigs);
      this.isInitialized = true;
      
      this.logger.info('Device Control Service initialized successfully');
      this.emit('initialized', deviceConfigs);
    } catch (error) {
      this.logger.error('Failed to initialize Device Control Service:', error);
      throw error;
    }
  }

  /**
   * 执行设备命令
   */
  async executeCommand(command: DeviceCommand): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.error('Service not initialized');
      return false;
    }

    try {
      const result = await this.commandProcessor.processCommand(command);
      return result.success;
    } catch (error) {
      this.logger.error('Command execution failed:', error);
      return false;
    }
  }

  /**
   * 获取设备状态
   */
  getDeviceState(deviceId: string): DeviceState | null {
    return this.stateManager.getDeviceState(deviceId);
  }

  /**
   * 获取所有设备状态
   */
  getAllDeviceStates(): DeviceState[] {
    return this.stateManager.getAllDeviceStates();
  }

  /**
   * 获取设备配置
   */
  getDeviceConfig(deviceId: string): DeviceConfig | null {
    return this.stateManager.getDeviceConfig(deviceId);
  }

  /**
   * 获取所有设备配置
   */
  getAllDeviceConfigs(): DeviceConfig[] {
    return this.stateManager.getAllDeviceConfigs();
  }

  /**
   * 设置设备在线状态
   */
  setDeviceOnlineStatus(deviceId: string, isOnline: boolean): void {
    this.stateManager.setDeviceOnlineStatus(deviceId, isOnline);
  }

  /**
   * 设置所有设备在线状态
   */
  setAllDevicesOnlineStatus(isOnline: boolean): void {
    this.stateManager.setAllDevicesOnlineStatus(isOnline);
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer(): void {
    setInterval(() => {
      this.conflictDetector.cleanupCommandQueues();
      this.commandProcessor.cleanupCommandHistory();
    }, 30000);

    this.logger.info('Cleanup timers started');
  }

  /**
   * 停止服务
   */
  stop(): void {
    this.stateManager.stop();
    this.isInitialized = false;
    this.logger.info('Device Control Service stopped');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 转发状态管理器事件
    this.stateManager.on('deviceStateChanged', (deviceState: DeviceState) => {
      this.emit('deviceStateChanged', deviceState);
    });

    this.stateManager.on('batchDeviceStateChanged', (deviceStates: DeviceState[]) => {
      this.emit('batchDeviceStateChanged', deviceStates);
    });

    // 转发命令处理器事件
    this.commandProcessor.on('commandExecuted', (command: DeviceCommand) => {
      this.emit('commandExecuted', command);
    });

    this.commandProcessor.on('commandFailed', (command: DeviceCommand, error: string) => {
      this.emit('commandFailed', command, error);
    });
  }
}
