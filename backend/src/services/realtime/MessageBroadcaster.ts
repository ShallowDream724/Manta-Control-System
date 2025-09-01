import { EventEmitter } from 'events';
import winston from 'winston';
import { SocketConnectionManager } from './SocketConnectionManager';
import { DeviceState, DeviceCommand } from '../../types/device';

/**
 * 消息广播器
 * 专门负责实时消息的广播和分发
 * 
 * 职责：
 * - 设备状态广播
 * - 系统消息广播
 * - 选择性消息发送
 * - 消息队列管理
 */
export class MessageBroadcaster extends EventEmitter {
  private logger: winston.Logger;
  private connectionManager: SocketConnectionManager;
  private messageQueue: BroadcastMessage[] = [];
  private isProcessingQueue = false;
  private queueProcessingInterval = 100; // 100ms

  constructor(connectionManager: SocketConnectionManager, logger: winston.Logger) {
    super();
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  /**
   * 启动消息广播器
   */
  start(): void {
    this.logger.info('Message Broadcaster started');
    this.startQueueProcessing();
  }

  /**
   * 停止消息广播器
   */
  stop(): void {
    this.isProcessingQueue = false;
    this.logger.info('Message Broadcaster stopped');
  }

  /**
   * 广播设备状态更新
   */
  broadcastDeviceState(deviceState: DeviceState): void {
    const message: BroadcastMessage = {
      type: 'device_state',
      event: 'deviceStateUpdate',
      data: deviceState,
      timestamp: Date.now(),
      priority: MessagePriority.HIGH
    };

    this.queueMessage(message);
    this.logger.debug(`Queued device state broadcast: ${deviceState.deviceId}`);
  }

  /**
   * 批量广播设备状态
   */
  broadcastBatchDeviceStates(deviceStates: DeviceState[]): void {
    const message: BroadcastMessage = {
      type: 'device_states_batch',
      event: 'deviceStatesBatchUpdate',
      data: deviceStates,
      timestamp: Date.now(),
      priority: MessagePriority.HIGH
    };

    this.queueMessage(message);
    this.logger.debug(`Queued batch device states broadcast: ${deviceStates.length} devices`);
  }

  /**
   * 广播系统消息
   */
  broadcastSystemMessage(message: string, level: MessageLevel = 'info'): void {
    const broadcastMessage: BroadcastMessage = {
      type: 'system_message',
      event: 'systemMessage',
      data: {
        message,
        level,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      priority: this.getSystemMessagePriority(level)
    };

    this.queueMessage(broadcastMessage);
    this.logger.debug(`Queued system message broadcast: ${level} - ${message}`);
  }

  /**
   * 广播命令执行结果
   */
  broadcastCommandResult(command: DeviceCommand, success: boolean, error?: string): void {
    const message: BroadcastMessage = {
      type: 'command_result',
      event: 'commandExecutionResult',
      data: {
        commandId: command.commandId,
        deviceId: command.deviceId,
        success,
        error,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      priority: MessagePriority.MEDIUM
    };

    this.queueMessage(message);
  }

  /**
   * 广播任务执行状态
   */
  broadcastTaskStatus(taskId: string, status: any): void {
    const message: BroadcastMessage = {
      type: 'task_status',
      event: 'taskStatusUpdate',
      data: {
        taskId,
        status,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      priority: MessagePriority.MEDIUM
    };

    this.queueMessage(message);
  }

  /**
   * 发送消息给特定客户端
   */
  sendToClient(clientId: string, event: string, data: any): boolean {
    return this.connectionManager.sendToClient(clientId, event, data);
  }

  /**
   * 发送消息给特定设备类型的客户端
   */
  sendToDeviceType(deviceType: 'desktop' | 'mobile' | 'tablet', event: string, data: any): void {
    const clients = this.connectionManager.getConnectedClients();
    const targetClients = clients.filter(client => client.deviceType === deviceType);

    for (const client of targetClients) {
      this.connectionManager.sendToClient(client.id, event, data);
    }

    this.logger.debug(`Sent message to ${targetClients.length} ${deviceType} clients`);
  }

  /**
   * 广播连接状态更新
   */
  broadcastConnectionStatus(): void {
    const stats = this.connectionManager.getConnectionStats();
    const message: BroadcastMessage = {
      type: 'connection_status',
      event: 'connectionStatusUpdate',
      data: stats,
      timestamp: Date.now(),
      priority: MessagePriority.LOW
    };

    this.queueMessage(message);
  }

  /**
   * 广播错误消息
   */
  broadcastError(error: string, details?: any): void {
    const message: BroadcastMessage = {
      type: 'error',
      event: 'systemError',
      data: {
        error,
        details,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      priority: MessagePriority.CRITICAL
    };

    this.queueMessage(message);
    this.logger.error(`Broadcasting error: ${error}`, details);
  }

  /**
   * 获取消息队列统计
   */
  getQueueStatistics(): QueueStatistics {
    const priorityCounts = this.messageQueue.reduce((counts, msg) => {
      counts[msg.priority] = (counts[msg.priority] || 0) + 1;
      return counts;
    }, {} as Record<MessagePriority, number>);

    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessingQueue,
      priorityCounts,
      oldestMessageAge: this.getOldestMessageAge()
    };
  }

  /**
   * 清理过期消息
   */
  cleanupExpiredMessages(): void {
    const now = Date.now();
    const maxAge = 60000; // 1分钟

    const initialLength = this.messageQueue.length;
    this.messageQueue = this.messageQueue.filter(msg => now - msg.timestamp < maxAge);
    
    const removedCount = initialLength - this.messageQueue.length;
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired messages`);
    }
  }

  /**
   * 将消息加入队列
   */
  private queueMessage(message: BroadcastMessage): void {
    this.messageQueue.push(message);
    
    // 按优先级排序
    this.messageQueue.sort((a, b) => {
      const priorityOrder = {
        [MessagePriority.CRITICAL]: 0,
        [MessagePriority.HIGH]: 1,
        [MessagePriority.MEDIUM]: 2,
        [MessagePriority.LOW]: 3
      };
      
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // 限制队列长度
    if (this.messageQueue.length > 1000) {
      this.messageQueue = this.messageQueue.slice(0, 1000);
      this.logger.warn('Message queue truncated due to size limit');
    }
  }

  /**
   * 开始队列处理
   */
  private startQueueProcessing(): void {
    this.isProcessingQueue = true;
    this.processQueue();
  }

  /**
   * 处理消息队列
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessingQueue) {
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.processMessage(message);
      }

      // 等待下一个处理周期
      await new Promise(resolve => setTimeout(resolve, this.queueProcessingInterval));
    }
  }

  /**
   * 处理单个消息
   */
  private async processMessage(message: BroadcastMessage): Promise<void> {
    try {
      this.connectionManager.broadcast(message.event, message.data);
      this.emit('messageBroadcast', message);
      
      this.logger.debug(`Broadcasted message: ${message.type}`);
    } catch (error) {
      this.logger.error('Failed to broadcast message:', error);
      this.emit('broadcastError', message, error);
    }
  }

  /**
   * 获取系统消息优先级
   */
  private getSystemMessagePriority(level: MessageLevel): MessagePriority {
    switch (level) {
      case 'error':
        return MessagePriority.CRITICAL;
      case 'warning':
        return MessagePriority.HIGH;
      case 'info':
        return MessagePriority.MEDIUM;
      default:
        return MessagePriority.LOW;
    }
  }

  /**
   * 获取最旧消息的年龄
   */
  private getOldestMessageAge(): number {
    if (this.messageQueue.length === 0) return 0;
    
    const oldestMessage = this.messageQueue[this.messageQueue.length - 1];
    return Date.now() - oldestMessage.timestamp;
  }
}

export interface BroadcastMessage {
  type: string;
  event: string;
  data: any;
  timestamp: number;
  priority: MessagePriority;
}

export enum MessagePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export type MessageLevel = 'info' | 'warning' | 'error';

export interface QueueStatistics {
  queueLength: number;
  isProcessing: boolean;
  priorityCounts: Record<MessagePriority, number>;
  oldestMessageAge: number;
}
