import { EventEmitter } from 'events';
import winston from 'winston';
import { DeviceConfig, DeviceState, DeviceCommand } from '../../types/device';

/**
 * 设备状态管理器
 * 专门负责设备状态的管理和同步
 * 
 * 职责：
 * - 设备状态存储和更新
 * - 状态变化通知
 * - 设备配置管理
 * - 状态持久化
 */
export class DeviceStateManager extends EventEmitter {
  private logger: winston.Logger;
  private devices: Map<string, DeviceConfig> = new Map();
  private deviceStates: Map<string, DeviceState> = new Map();
  private stateUpdateTimer: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
  }

  /**
   * 初始化设备配置
   */
  async initialize(deviceConfigs: DeviceConfig[]): Promise<void> {
    this.logger.info('Initializing Device State Manager');
    
    for (const config of deviceConfigs) {
      this.devices.set(config.id, config);
      this.deviceStates.set(config.id, {
        deviceId: config.id,
        // TODO: BUG - 硬编码为false，需要实现Arduino设备连接检测逻辑
        // 当前所有设备都显示为离线，需要：
        // 1. 实现Arduino串口通信
        // 2. 添加设备心跳检测
        // 3. 根据实际连接状态更新isOnline
        isOnline: false,
        currentValue: this.getDefaultValue(config),
        lastUpdate: 0,
        isLocked: false
      });
    }
    
    this.startStateUpdateTimer();
    this.logger.info(`Initialized ${deviceConfigs.length} devices`);
    this.emit('initialized', deviceConfigs);
  }

  /**
   * 获取设备配置
   */
  getDeviceConfig(deviceId: string): DeviceConfig | null {
    return this.devices.get(deviceId) || null;
  }

  /**
   * 获取所有设备配置
   */
  getAllDeviceConfigs(): DeviceConfig[] {
    return Array.from(this.devices.values());
  }

  /**
   * 获取设备状态
   */
  getDeviceState(deviceId: string): DeviceState | null {
    return this.deviceStates.get(deviceId) || null;
  }

  /**
   * 获取所有设备状态
   */
  getAllDeviceStates(): DeviceState[] {
    return Array.from(this.deviceStates.values());
  }

  /**
   * 更新设备状态
   */
  updateDeviceState(deviceId: string, updates: Partial<DeviceState>): void {
    const currentState = this.deviceStates.get(deviceId);
    if (!currentState) {
      this.logger.error(`Device ${deviceId} not found`);
      return;
    }

    const newState: DeviceState = {
      ...currentState,
      ...updates,
      lastUpdate: Date.now()
    };

    this.deviceStates.set(deviceId, newState);
    this.logger.debug(`Device state updated: ${deviceId}`, updates);
    this.emit('deviceStateChanged', newState);
  }

  /**
   * 批量更新设备状态
   */
  batchUpdateDeviceStates(updates: Array<{ deviceId: string; updates: Partial<DeviceState> }>): void {
    const changedStates: DeviceState[] = [];

    for (const { deviceId, updates: stateUpdates } of updates) {
      const currentState = this.deviceStates.get(deviceId);
      if (!currentState) {
        this.logger.error(`Device ${deviceId} not found`);
        continue;
      }

      const newState: DeviceState = {
        ...currentState,
        ...stateUpdates,
        lastUpdate: Date.now()
      };

      this.deviceStates.set(deviceId, newState);
      changedStates.push(newState);
    }

    this.logger.debug(`Batch updated ${changedStates.length} device states`);
    this.emit('batchDeviceStateChanged', changedStates);
  }

  /**
   * 设置设备在线状态
   */
  setDeviceOnlineStatus(deviceId: string, isOnline: boolean): void {
    this.updateDeviceState(deviceId, { isOnline });
  }

  /**
   * 批量设置设备在线状态
   */
  setAllDevicesOnlineStatus(isOnline: boolean): void {
    const updates = Array.from(this.devices.keys()).map(deviceId => ({
      deviceId,
      updates: { isOnline }
    }));

    this.batchUpdateDeviceStates(updates);
  }

  /**
   * 锁定设备
   */
  lockDevice(deviceId: string, duration: number = 50): void {
    const lockExpiry = Date.now() + duration;
    this.updateDeviceState(deviceId, {
      isLocked: true,
      lockExpiry
    });

    // 自动解锁
    setTimeout(() => {
      this.unlockDevice(deviceId);
    }, duration);
  }

  /**
   * 解锁设备
   */
  unlockDevice(deviceId: string): void {
    this.updateDeviceState(deviceId, {
      isLocked: false,
      lockExpiry: undefined
    });
  }

  /**
   * 检查设备是否被锁定
   */
  isDeviceLocked(deviceId: string): boolean {
    const state = this.deviceStates.get(deviceId);
    if (!state || !state.isLocked) {
      return false;
    }

    // 检查锁定是否过期
    if (state.lockExpiry && Date.now() > state.lockExpiry) {
      this.unlockDevice(deviceId);
      return false;
    }

    return true;
  }

  /**
   * 应用命令到设备状态
   */
  applyCommandToState(command: DeviceCommand): void {
    const device = this.devices.get(command.deviceId);
    if (!device) {
      this.logger.error(`Device ${command.deviceId} not found`);
      return;
    }

    let newValue: number | boolean;

    switch (command.action) {
      case 'set_power':
        if (device.type !== 'pwm') {
          this.logger.error('set_power only valid for PWM devices');
          return;
        }
        newValue = command.value as number;
        break;

      case 'set_state':
        if (device.type !== 'digital') {
          this.logger.error('set_state only valid for digital devices');
          return;
        }
        newValue = command.value as boolean;
        break;

      case 'timed_action':
        newValue = command.value;
        // 设置定时器恢复状态
        if (command.duration) {
          setTimeout(() => {
            const defaultValue = this.getDefaultValue(device);
            this.updateDeviceState(command.deviceId, { currentValue: defaultValue });
          }, command.duration);
        }
        break;

      default:
        this.logger.error(`Unknown action: ${command.action}`);
        return;
    }

    this.updateDeviceState(command.deviceId, { currentValue: newValue });
  }

  /**
   * 重置设备状态
   */
  resetDeviceState(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      this.logger.error(`Device ${deviceId} not found`);
      return;
    }

    const defaultValue = this.getDefaultValue(device);
    this.updateDeviceState(deviceId, {
      currentValue: defaultValue,
      isLocked: false,
      lockExpiry: undefined
    });
  }

  /**
   * 重置所有设备状态
   */
  resetAllDeviceStates(): void {
    for (const deviceId of this.devices.keys()) {
      this.resetDeviceState(deviceId);
    }
  }

  /**
   * 获取设备默认值
   */
  private getDefaultValue(device: DeviceConfig): number | boolean {
    return device.type === 'pwm' ? 0 : false;
  }

  /**
   * 启动状态更新定时器
   */
  private startStateUpdateTimer(): void {
    // 定期清理过期的锁定状态
    this.stateUpdateTimer = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;

      for (const [deviceId, state] of this.deviceStates) {
        if (state.isLocked && state.lockExpiry && now > state.lockExpiry) {
          this.unlockDevice(deviceId);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.logger.debug('Cleaned up expired device locks');
      }
    }, 1000); // 每秒检查一次
  }

  /**
   * 停止状态管理器
   */
  stop(): void {
    if (this.stateUpdateTimer) {
      clearInterval(this.stateUpdateTimer);
      this.stateUpdateTimer = null;
    }
    this.logger.info('Device State Manager stopped');
  }

  /**
   * 获取设备统计信息
   */
  getDeviceStatistics(): DeviceStatistics {
    const states = this.getAllDeviceStates();
    const total = states.length;
    const online = states.filter(s => s.isOnline).length;
    const locked = states.filter(s => s.isLocked).length;
    const active = states.filter(s => {
      const device = this.devices.get(s.deviceId);
      if (!device) return false;
      return device.type === 'pwm' ? (s.currentValue as number) > 0 : (s.currentValue as boolean);
    }).length;

    return {
      total,
      online,
      offline: total - online,
      locked,
      active,
      inactive: total - active
    };
  }
}

export interface DeviceStatistics {
  total: number;
  online: number;
  offline: number;
  locked: number;
  active: number;
  inactive: number;
}
