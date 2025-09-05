import winston from 'winston';
import { DeviceCommand } from '../../types/device';
import { DeviceStateManager } from './DeviceStateManager';

/**
 * 冲突检测器
 * 专门负责设备命令的冲突检测和防护
 * 
 * 职责：
 * - 50ms冲突窗口检测
 * - 设备锁定状态检查
 * - 命令优先级管理
 * - 安全规则验证
 */
export class ConflictDetector {
  private logger: winston.Logger;
  private stateManager: DeviceStateManager;
  private commandQueue: Map<string, DeviceCommand[]> = new Map();
  private conflictWindow = 50; // 50ms冲突检测窗口
  private safetyRules: SafetyRule[] = [];

  constructor(stateManager: DeviceStateManager, logger: winston.Logger) {
    this.stateManager = stateManager;
    this.logger = logger;
    this.initializeSafetyRules();
  }

  /**
   * 检测命令冲突
   */
  checkConflict(command: DeviceCommand): ConflictResult {
    // 1. 检查设备锁定状态
    const lockConflict = this.checkDeviceLock(command);
    if (lockConflict.hasConflict) {
      return lockConflict;
    }

    // 2. 检查时间窗口冲突
    const timeConflict = this.checkTimeWindowConflict(command);
    if (timeConflict.hasConflict) {
      return timeConflict;
    }

    // 3. 检查安全规则
    const safetyConflict = this.checkSafetyRules(command);
    if (safetyConflict.hasConflict) {
      return safetyConflict;
    }

    // 4. 检查逻辑冲突
    const logicConflict = this.checkLogicConflict(command);
    if (logicConflict.hasConflict) {
      return logicConflict;
    }

    // 记录命令到队列
    this.recordCommand(command);

    return { hasConflict: false };
  }

  /**
   * 添加安全规则
   */
  addSafetyRule(rule: SafetyRule): void {
    this.safetyRules.push(rule);
    this.logger.info(`Added safety rule: ${rule.name}`);
  }

  /**
   * 移除安全规则
   */
  removeSafetyRule(ruleName: string): void {
    const index = this.safetyRules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.safetyRules.splice(index, 1);
      this.logger.info(`Removed safety rule: ${ruleName}`);
    }
  }

  /**
   * 获取冲突统计
   */
  getConflictStatistics(): ConflictStatistics {
    const totalCommands = Array.from(this.commandQueue.values())
      .reduce((total, queue) => total + queue.length, 0);

    return {
      totalCommandsProcessed: totalCommands,
      conflictsDetected: 0, // TODO: 实现冲突计数
      conflictRate: 0, // TODO: 实现冲突率计算
      averageQueueLength: this.calculateAverageQueueLength()
    };
  }

  /**
   * 清理过期的命令队列
   */
  cleanupCommandQueues(): void {
    const now = Date.now();
    const maxAge = 60000; // 1分钟

    for (const [deviceId, queue] of this.commandQueue) {
      const filteredQueue = queue.filter(cmd => now - cmd.timestamp < maxAge);
      this.commandQueue.set(deviceId, filteredQueue);
    }

    this.logger.debug('Command queues cleaned up');
  }

  /**
   * 检查设备锁定状态
   */
  private checkDeviceLock(command: DeviceCommand): ConflictResult {
    if (this.stateManager.isDeviceLocked(command.deviceId)) {
      return {
        hasConflict: true,
        reason: 'Device is currently locked',
        conflictType: 'device_lock'
      };
    }

    return { hasConflict: false };
  }

  /**
   * 检查时间窗口冲突
   */
  private checkTimeWindowConflict(command: DeviceCommand): ConflictResult {
    const queue = this.commandQueue.get(command.deviceId) || [];
    const now = Date.now();

    // 检查冲突窗口内是否有其他命令
    const recentCommands = queue.filter(cmd => 
      now - cmd.timestamp < this.conflictWindow
    );

    if (recentCommands.length > 0) {
      const lastCommand = recentCommands[recentCommands.length - 1];
      return {
        hasConflict: true,
        reason: `Command within ${this.conflictWindow}ms window`,
        conflictType: 'time_window',
        conflictingCommand: lastCommand
      };
    }

    return { hasConflict: false };
  }

  /**
   * 检查安全规则
   */
  private checkSafetyRules(command: DeviceCommand): ConflictResult {
    for (const rule of this.safetyRules) {
      if (rule.applies(command)) {
        const violation = rule.check(command, this.stateManager);
        if (violation) {
          return {
            hasConflict: true,
            reason: violation,
            conflictType: 'safety_rule',
            ruleName: rule.name
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * 检查逻辑冲突
   */
  private checkLogicConflict(command: DeviceCommand): ConflictResult {
    const device = this.stateManager.getDeviceConfig(command.deviceId);
    if (!device) {
      return {
        hasConflict: true,
        reason: 'Device not found',
        conflictType: 'logic_error'
      };
    }

    // 检查设备是否在线
    const state = this.stateManager.getDeviceState(command.deviceId);
    if (!state || !state.isOnline) {
      return {
        hasConflict: true,
        reason: 'Device is offline',
        conflictType: 'device_offline'
      };
    }

    // 检查命令是否与当前状态冲突
    if (this.isRedundantCommand(command, state)) {
      return {
        hasConflict: true,
        reason: 'Command is redundant with current state',
        conflictType: 'redundant_command'
      };
    }

    return { hasConflict: false };
  }

  /**
   * 检查命令是否冗余
   */
  private isRedundantCommand(command: DeviceCommand, state: any): boolean {
    switch (command.action) {
      case 'set_power':
        return state.currentValue === command.value;
      case 'set_state':
        return state.currentValue === command.value;
      default:
        return false;
    }
  }

  /**
   * 记录命令到队列
   */
  private recordCommand(command: DeviceCommand): void {
    const queue = this.commandQueue.get(command.deviceId) || [];
    queue.push(command);

    // 限制队列长度
    if (queue.length > 100) {
      queue.splice(0, queue.length - 100);
    }

    this.commandQueue.set(command.deviceId, queue);
  }

  /**
   * 计算平均队列长度
   */
  private calculateAverageQueueLength(): number {
    const queues = Array.from(this.commandQueue.values());
    if (queues.length === 0) return 0;

    const totalLength = queues.reduce((sum, queue) => sum + queue.length, 0);
    return totalLength / queues.length;
  }

  /**
   * 初始化安全规则
   */
  private initializeSafetyRules(): void {
    // 最大功率限制规则
    this.addSafetyRule({
      name: 'max_power_limit',
      applies: (command) => command.action === 'set_power',
      check: (command) => {
        const power = command.value as number;
        if (power > 100) {
          return 'Power value exceeds maximum limit (100%)';
        }
        return null;
      }
    });

    // 最大运行时间限制规则
    this.addSafetyRule({
      name: 'max_duration_limit',
      applies: (command) => command.action === 'timed_action',
      check: (command) => {
        if (command.duration && command.duration > 3600000) {
          return 'Duration exceeds maximum limit (1 hour)';
        }
        return null;
      }
    });

    // 同时运行泵数量限制规则
    this.addSafetyRule({
      name: 'concurrent_pump_limit',
      applies: (command) => command.action === 'set_power' && (command.value as number) > 0,
      check: (command, stateManager) => {
        const allStates = stateManager.getAllDeviceStates();
        const activePumps = allStates.filter(state => {
          const device = stateManager.getDeviceConfig(state.deviceId);
          return device?.type === 'pwm' && (state.currentValue as number) > 0;
        });

        if (activePumps.length >= 4) { // 最多同时运行4个泵
          return 'Too many pumps running simultaneously';
        }
        return null;
      }
    });
  }
}

export interface ConflictResult {
  hasConflict: boolean;
  reason?: string;
  conflictType?: string;
  conflictingCommand?: DeviceCommand;
  ruleName?: string;
}

export interface SafetyRule {
  name: string;
  applies: (command: DeviceCommand) => boolean;
  check: (command: DeviceCommand, stateManager: DeviceStateManager) => string | null;
}

export interface ConflictStatistics {
  totalCommandsProcessed: number;
  conflictsDetected: number;
  conflictRate: number;
  averageQueueLength: number;
}
