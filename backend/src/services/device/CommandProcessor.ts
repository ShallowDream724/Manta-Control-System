import { EventEmitter } from 'events';
import winston from 'winston';
import { DeviceCommand, DeviceConfig } from '../../types/device';
import { DeviceStateManager } from './DeviceStateManager';
import { ConflictDetector } from './ConflictDetector';

/**
 * 命令处理器
 * 专门负责设备命令的处理和执行
 * 
 * 职责：
 * - 命令验证和预处理
 * - 命令执行协调
 * - 执行结果处理
 * - 命令历史记录
 */
export class CommandProcessor extends EventEmitter {
  private logger: winston.Logger;
  private stateManager: DeviceStateManager;
  private conflictDetector: ConflictDetector;
  private commandHistory: Map<string, DeviceCommand[]> = new Map();
  private executingCommands: Set<string> = new Set();

  constructor(
    stateManager: DeviceStateManager,
    conflictDetector: ConflictDetector,
    logger: winston.Logger
  ) {
    super();
    this.stateManager = stateManager;
    this.conflictDetector = conflictDetector;
    this.logger = logger;
  }

  /**
   * 处理设备命令
   */
  async processCommand(command: DeviceCommand): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      // 1. 验证命令
      const validationResult = this.validateCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          commandId: command.commandId,
          error: validationResult.error,
          processingTime: Date.now() - startTime
        };
      }

      // 2. 冲突检测
      const conflictResult = this.conflictDetector.checkConflict(command);
      if (conflictResult.hasConflict) {
        return {
          success: false,
          commandId: command.commandId,
          error: `Command rejected due to conflict: ${conflictResult.reason}`,
          processingTime: Date.now() - startTime
        };
      }

      // 3. 标记命令为执行中
      this.executingCommands.add(command.commandId);

      // 4. 锁定设备
      this.stateManager.lockDevice(command.deviceId);

      // 5. 执行命令
      const executionResult = await this.executeCommand(command);

      // 6. 更新设备状态
      if (executionResult.success) {
        this.stateManager.applyCommandToState(command);
      }

      // 7. 记录命令历史
      this.recordCommandHistory(command, executionResult.success);

      // 8. 清理
      this.executingCommands.delete(command.commandId);
      this.stateManager.unlockDevice(command.deviceId);

      // 9. 发送事件
      if (executionResult.success) {
        this.emit('commandExecuted', command);
      } else {
        this.emit('commandFailed', command, executionResult.error);
      }

      return {
        success: executionResult.success,
        commandId: command.commandId,
        error: executionResult.error,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.executingCommands.delete(command.commandId);
      this.stateManager.unlockDevice(command.deviceId);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Command processing error:', error);
      
      return {
        success: false,
        commandId: command.commandId,
        error: errorMessage,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 批量处理命令
   */
  async processBatchCommands(commands: DeviceCommand[]): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    for (const command of commands) {
      const result = await this.processCommand(command);
      results.push(result);
      
      // 如果命令失败且是关键命令，停止后续执行
      if (!result.success && this.isCriticalCommand(command)) {
        this.logger.warn(`Critical command failed, stopping batch execution: ${command.commandId}`);
        break;
      }
    }
    
    return results;
  }

  /**
   * 取消正在执行的命令
   */
  async cancelCommand(commandId: string): Promise<boolean> {
    if (!this.executingCommands.has(commandId)) {
      return false;
    }

    try {
      // TODO: 实现命令取消逻辑
      this.executingCommands.delete(commandId);
      this.logger.info(`Command cancelled: ${commandId}`);
      this.emit('commandCancelled', commandId);
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel command:', error);
      return false;
    }
  }

  /**
   * 获取命令历史
   */
  getCommandHistory(deviceId?: string, limit: number = 100): DeviceCommand[] {
    if (deviceId) {
      const history = this.commandHistory.get(deviceId) || [];
      return history.slice(-limit);
    }

    // 返回所有设备的命令历史
    const allHistory: DeviceCommand[] = [];
    for (const history of this.commandHistory.values()) {
      allHistory.push(...history);
    }

    // 按时间戳排序并限制数量
    return allHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 清理命令历史
   */
  cleanupCommandHistory(maxAge: number = 3600000): void {
    const cutoffTime = Date.now() - maxAge;
    
    for (const [deviceId, history] of this.commandHistory) {
      const filteredHistory = history.filter(cmd => cmd.timestamp > cutoffTime);
      this.commandHistory.set(deviceId, filteredHistory);
    }
    
    this.logger.debug('Command history cleaned up');
  }

  /**
   * 获取执行统计
   */
  getExecutionStatistics(): ExecutionStatistics {
    const totalCommands = Array.from(this.commandHistory.values())
      .reduce((total, history) => total + history.length, 0);
    
    const executingCount = this.executingCommands.size;
    
    return {
      totalCommandsProcessed: totalCommands,
      currentlyExecuting: executingCount,
      averageProcessingTime: this.calculateAverageProcessingTime(),
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * 验证命令
   */
  private validateCommand(command: DeviceCommand): ValidationResult {
    // 检查设备是否存在
    const device = this.stateManager.getDeviceConfig(command.deviceId);
    if (!device) {
      return {
        isValid: false,
        error: `Device ${command.deviceId} not found`
      };
    }

    // 检查命令参数
    switch (command.action) {
      case 'set_power':
        if (device.type !== 'pump') {
          return {
            isValid: false,
            error: 'set_power only valid for pump devices'
          };
        }
        if (typeof command.value !== 'number' || command.value < 0 || command.value > 100) {
          return {
            isValid: false,
            error: 'Power value must be between 0 and 100'
          };
        }
        break;

      case 'set_state':
        if (device.type !== 'valve') {
          return {
            isValid: false,
            error: 'set_state only valid for valve devices'
          };
        }
        if (typeof command.value !== 'boolean') {
          return {
            isValid: false,
            error: 'State value must be boolean'
          };
        }
        break;

      case 'timed_action':
        if (typeof command.duration !== 'number' || command.duration <= 0) {
          return {
            isValid: false,
            error: 'Duration must be a positive number'
          };
        }
        if (command.duration > 3600000) {
          return {
            isValid: false,
            error: 'Duration cannot exceed 1 hour'
          };
        }
        break;

      default:
        return {
          isValid: false,
          error: `Unknown action: ${command.action}`
        };
    }

    return { isValid: true };
  }

  /**
   * 执行命令
   */
  private async executeCommand(command: DeviceCommand): Promise<ExecutionResult> {
    try {
      this.logger.debug(`Executing command: ${command.commandId}`);
      
      // TODO: 实际的设备通信逻辑
      // 这里应该调用连接管理器发送命令到Arduino
      
      // 模拟命令执行
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 记录命令历史
   */
  private recordCommandHistory(command: DeviceCommand, success: boolean): void {
    const history = this.commandHistory.get(command.deviceId) || [];
    
    // 添加执行结果到命令对象
    const commandWithResult = {
      ...command,
      executionResult: {
        success,
        executedAt: Date.now()
      }
    };
    
    history.push(commandWithResult);
    
    // 限制历史记录数量
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.commandHistory.set(command.deviceId, history);
  }

  /**
   * 判断是否为关键命令
   */
  private isCriticalCommand(command: DeviceCommand): boolean {
    // 停止命令被认为是关键命令
    return (command.action === 'set_power' && command.value === 0) ||
           (command.action === 'set_state' && command.value === false);
  }

  /**
   * 计算平均处理时间
   */
  private calculateAverageProcessingTime(): number {
    // TODO: 实现平均处理时间计算
    return 0;
  }

  /**
   * 计算成功率
   */
  private calculateSuccessRate(): number {
    // TODO: 实现成功率计算
    return 0;
  }
}

export interface CommandResult {
  success: boolean;
  commandId: string;
  error?: string;
  processingTime: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
}

export interface ExecutionStatistics {
  totalCommandsProcessed: number;
  currentlyExecuting: number;
  averageProcessingTime: number;
  successRate: number;
}
