import { EventEmitter } from 'events';
import winston from 'winston';
import { SocketConnectionManager, ClientInfo } from './SocketConnectionManager';
import { DeviceCommand } from '../../types/device';

/**
 * 客户端会话管理器
 * 专门负责客户端会话的管理和协调
 * 
 * 职责：
 * - 客户端权限管理
 * - 会话状态跟踪
 * - 操作冲突协调
 * - 客户端数据同步
 */
export class ClientSessionManager extends EventEmitter {
  private logger: winston.Logger;
  private connectionManager: SocketConnectionManager;
  private clientSessions: Map<string, ClientSession> = new Map();
  private operationLocks: Map<string, OperationLock> = new Map();
  private sessionCleanupTimer: NodeJS.Timeout | null = null;

  constructor(connectionManager: SocketConnectionManager, logger: winston.Logger) {
    super();
    this.connectionManager = connectionManager;
    this.logger = logger;
    this.setupEventHandlers();
  }

  /**
   * 启动会话管理器
   */
  start(): void {
    this.logger.info('Client Session Manager started');
    this.startSessionCleanup();
  }

  /**
   * 停止会话管理器
   */
  stop(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = null;
    }
    this.logger.info('Client Session Manager stopped');
  }

  /**
   * 处理客户端设备控制请求
   */
  async handleDeviceControlRequest(clientId: string, data: any): Promise<void> {
    try {
      const session = this.getOrCreateSession(clientId);
      this.updateSessionActivity(clientId);

      const { deviceId, action, value, duration } = data;

      // 验证请求数据
      if (!deviceId || !action || value === undefined) {
        this.sendErrorToClient(clientId, 'deviceControlError', {
          error: 'Missing required parameters',
          requestData: data
        });
        return;
      }

      // 检查操作权限
      if (!this.checkOperationPermission(clientId, deviceId, action)) {
        this.sendErrorToClient(clientId, 'deviceControlError', {
          error: 'Operation not permitted',
          reason: 'Another client is controlling this device'
        });
        return;
      }

      // 创建设备命令
      const command: DeviceCommand = {
        deviceId,
        action,
        value,
        duration,
        timestamp: Date.now(),
        commandId: `${clientId}_${Date.now()}`
      };

      // 记录操作
      this.recordClientOperation(clientId, command);

      // 发送命令执行事件
      this.emit('deviceControlRequest', clientId, command);

    } catch (error) {
      this.logger.error('Device control request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendErrorToClient(clientId, 'deviceControlError', {
        error: 'Internal server error',
        details: errorMessage
      });
    }
  }

  /**
   * 处理命令执行结果
   */
  handleCommandResult(command: DeviceCommand, success: boolean, error?: string): void {
    const clientId = this.extractClientIdFromCommand(command);
    if (!clientId) return;

    if (success) {
      this.sendToClient(clientId, 'deviceControlSuccess', {
        commandId: command.commandId,
        deviceId: command.deviceId,
        action: command.action,
        value: command.value
      });

      // 广播命令执行事件（除了发送者）
      this.broadcastToOthers(clientId, 'deviceCommandExecuted', {
        commandId: command.commandId,
        deviceId: command.deviceId,
        action: command.action,
        value: command.value,
        executedBy: clientId
      });

    } else {
      this.sendErrorToClient(clientId, 'deviceControlError', {
        error: 'Command execution failed',
        commandId: command.commandId,
        details: error
      });
    }

    // 释放操作锁
    this.releaseOperationLock(command.deviceId);
  }

  /**
   * 发送初始数据给客户端
   */
  sendInitialData(clientId: string, deviceConfigs: any[], deviceStates: any[]): void {
    this.sendToClient(clientId, 'deviceConfigs', deviceConfigs);
    this.sendToClient(clientId, 'deviceStates', deviceStates);
    
    const connectionStats = this.connectionManager.getConnectionStats();
    this.sendToClient(clientId, 'connectionStatus', {
      clientId,
      ...connectionStats
    });
  }

  /**
   * 获取会话统计
   */
  getSessionStatistics(): SessionStatistics {
    const sessions = Array.from(this.clientSessions.values());
    const now = Date.now();

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => now - s.lastActivity < 60000).length,
      totalOperations: sessions.reduce((sum, s) => sum + s.operationCount, 0),
      activeOperationLocks: this.operationLocks.size,
      averageSessionDuration: this.calculateAverageSessionDuration(sessions, now)
    };
  }

  /**
   * 获取或创建会话
   */
  private getOrCreateSession(clientId: string): ClientSession {
    let session = this.clientSessions.get(clientId);
    
    if (!session) {
      session = {
        clientId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        operationCount: 0,
        permissions: this.getDefaultPermissions(),
        recentOperations: []
      };
      
      this.clientSessions.set(clientId, session);
      this.logger.debug(`Created new session for client: ${clientId}`);
    }
    
    return session;
  }

  /**
   * 更新会话活动时间
   */
  private updateSessionActivity(clientId: string): void {
    const session = this.clientSessions.get(clientId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * 检查操作权限
   */
  private checkOperationPermission(clientId: string, deviceId: string, action: string): boolean {
    const session = this.clientSessions.get(clientId);
    if (!session) return false;

    // 检查基本权限
    if (!session.permissions.canControlDevices) {
      return false;
    }

    // 检查设备特定权限
    if (session.permissions.restrictedDevices?.includes(deviceId)) {
      return false;
    }

    // 检查操作锁
    const lock = this.operationLocks.get(deviceId);
    if (lock && lock.clientId !== clientId && Date.now() < lock.expiresAt) {
      return false;
    }

    // 创建操作锁
    this.createOperationLock(deviceId, clientId);
    return true;
  }

  /**
   * 创建操作锁
   */
  private createOperationLock(deviceId: string, clientId: string): void {
    const lock: OperationLock = {
      deviceId,
      clientId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5000 // 5秒锁定
    };
    
    this.operationLocks.set(deviceId, lock);
  }

  /**
   * 释放操作锁
   */
  private releaseOperationLock(deviceId: string): void {
    this.operationLocks.delete(deviceId);
  }

  /**
   * 记录客户端操作
   */
  private recordClientOperation(clientId: string, command: DeviceCommand): void {
    const session = this.clientSessions.get(clientId);
    if (!session) return;

    session.operationCount++;
    session.recentOperations.push({
      command,
      timestamp: Date.now()
    });

    // 限制最近操作记录数量
    if (session.recentOperations.length > 100) {
      session.recentOperations = session.recentOperations.slice(-100);
    }
  }

  /**
   * 从命令中提取客户端ID
   */
  private extractClientIdFromCommand(command: DeviceCommand): string | null {
    const parts = command.commandId.split('_');
    return parts.length > 1 ? parts[0] : null;
  }

  /**
   * 发送消息给客户端
   */
  private sendToClient(clientId: string, event: string, data: any): void {
    this.connectionManager.sendToClient(clientId, event, data);
  }

  /**
   * 发送错误消息给客户端
   */
  private sendErrorToClient(clientId: string, event: string, error: any): void {
    this.connectionManager.sendToClient(clientId, event, error);
  }

  /**
   * 广播消息给其他客户端
   */
  private broadcastToOthers(excludeClientId: string, event: string, data: any): void {
    const clients = this.connectionManager.getConnectedClients();
    for (const client of clients) {
      if (client.id !== excludeClientId) {
        this.sendToClient(client.id, event, data);
      }
    }
  }

  /**
   * 获取默认权限
   */
  private getDefaultPermissions(): ClientPermissions {
    return {
      canControlDevices: true,
      canViewLogs: true,
      canManageTasks: true,
      restrictedDevices: []
    };
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.connectionManager.on('clientConnected', (clientInfo: ClientInfo) => {
      this.getOrCreateSession(clientInfo.id);
    });

    this.connectionManager.on('clientDisconnected', (clientInfo: ClientInfo) => {
      this.handleClientDisconnection(clientInfo.id);
    });

    this.connectionManager.on('clientEvent', (clientId: string, event: string, ...args: any[]) => {
      this.handleClientEvent(clientId, event, ...args);
    });
  }

  /**
   * 处理客户端断开连接
   */
  private handleClientDisconnection(clientId: string): void {
    // 释放该客户端的所有操作锁
    for (const [deviceId, lock] of this.operationLocks) {
      if (lock.clientId === clientId) {
        this.operationLocks.delete(deviceId);
      }
    }

    // 保留会话一段时间以便重连
    setTimeout(() => {
      this.clientSessions.delete(clientId);
    }, 300000); // 5分钟后删除会话
  }

  /**
   * 处理客户端事件
   */
  private handleClientEvent(clientId: string, event: string, ...args: any[]): void {
    this.updateSessionActivity(clientId);

    switch (event) {
      case 'deviceControl':
        this.handleDeviceControlRequest(clientId, args[0]);
        break;
      case 'getDeviceStates':
        this.emit('getDeviceStates', clientId);
        break;
      default:
        this.emit('clientEvent', clientId, event, ...args);
        break;
    }
  }

  /**
   * 启动会话清理
   */
  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupExpiredLocks();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const sessionTimeout = 30 * 60 * 1000; // 30分钟

    for (const [clientId, session] of this.clientSessions) {
      if (now - session.lastActivity > sessionTimeout) {
        this.clientSessions.delete(clientId);
        this.logger.debug(`Cleaned up expired session: ${clientId}`);
      }
    }
  }

  /**
   * 清理过期锁
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();

    for (const [deviceId, lock] of this.operationLocks) {
      if (now > lock.expiresAt) {
        this.operationLocks.delete(deviceId);
      }
    }
  }

  /**
   * 计算平均会话时长
   */
  private calculateAverageSessionDuration(sessions: ClientSession[], now: number): number {
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (now - session.createdAt);
    }, 0);

    return totalDuration / sessions.length;
  }
}

export interface ClientSession {
  clientId: string;
  createdAt: number;
  lastActivity: number;
  operationCount: number;
  permissions: ClientPermissions;
  recentOperations: ClientOperation[];
}

export interface ClientPermissions {
  canControlDevices: boolean;
  canViewLogs: boolean;
  canManageTasks: boolean;
  restrictedDevices?: string[];
}

export interface ClientOperation {
  command: DeviceCommand;
  timestamp: number;
}

export interface OperationLock {
  deviceId: string;
  clientId: string;
  createdAt: number;
  expiresAt: number;
}

export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  totalOperations: number;
  activeOperationLocks: number;
  averageSessionDuration: number;
}
