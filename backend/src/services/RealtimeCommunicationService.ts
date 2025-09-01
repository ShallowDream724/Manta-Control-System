import { Server as HttpServer } from 'http';
import winston from 'winston';
import { DeviceControlService } from './DeviceControlService';
import { SocketConnectionManager } from './realtime/SocketConnectionManager';
import { MessageBroadcaster } from './realtime/MessageBroadcaster';
import { ClientSessionManager } from './realtime/ClientSessionManager';
import { DeviceState, DeviceCommand } from '../types/device';

/**
 * 实时通信服务（重构版）
 * 协调各个子模块，提供统一的实时通信接口
 * 
 * 职责：
 * - 协调子模块工作
 * - 提供统一的外部接口
 * - 管理服务生命周期
 * - 事件转发和聚合
 */
export class RealtimeCommunicationService {
  private logger: winston.Logger;
  private deviceControlService: DeviceControlService;
  private connectionManager: SocketConnectionManager;
  private messageBroadcaster: MessageBroadcaster;
  private sessionManager: ClientSessionManager;

  constructor(
    httpServer: HttpServer,
    deviceControlService: DeviceControlService,
    logger: winston.Logger
  ) {
    this.logger = logger;
    this.deviceControlService = deviceControlService;
    
    // 初始化子模块
    this.connectionManager = new SocketConnectionManager(httpServer, logger);
    this.messageBroadcaster = new MessageBroadcaster(this.connectionManager, logger);
    this.sessionManager = new ClientSessionManager(this.connectionManager, logger);

    this.setupEventHandlers();
  }

  /**
   * 启动实时通信服务
   */
  start(): void {
    this.logger.info('Starting Realtime Communication Service');
    
    this.connectionManager.start();
    this.messageBroadcaster.start();
    this.sessionManager.start();
    
    this.logger.info('Realtime Communication Service started');
  }

  /**
   * 停止实时通信服务
   */
  stop(): void {
    this.logger.info('Stopping Realtime Communication Service');
    
    this.sessionManager.stop();
    this.messageBroadcaster.stop();
    this.connectionManager.stop();
    
    this.logger.info('Realtime Communication Service stopped');
  }

  /**
   * 广播设备状态更新
   */
  broadcastDeviceState(deviceState: DeviceState): void {
    this.messageBroadcaster.broadcastDeviceState(deviceState);
  }

  /**
   * 广播系统消息
   */
  broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    this.messageBroadcaster.broadcastSystemMessage(message, level);
  }

  /**
   * 获取连接的客户端信息
   */
  getConnectedClients(): any[] {
    return this.connectionManager.getConnectedClients();
  }

  /**
   * 启动非活跃连接清理
   */
  startInactivityCleanup(): void {
    this.logger.info('Inactivity cleanup started');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监听设备控制服务事件
    this.deviceControlService.on('deviceStateChanged', (deviceState: DeviceState) => {
      this.broadcastDeviceState(deviceState);
    });

    this.deviceControlService.on('batchDeviceStateChanged', (deviceStates: DeviceState[]) => {
      this.messageBroadcaster.broadcastBatchDeviceStates(deviceStates);
    });

    this.deviceControlService.on('commandExecuted', (command: DeviceCommand) => {
      this.messageBroadcaster.broadcastCommandResult(command, true);
      this.sessionManager.handleCommandResult(command, true);
    });

    this.deviceControlService.on('commandFailed', (command: DeviceCommand, error: string) => {
      this.messageBroadcaster.broadcastCommandResult(command, false, error);
      this.sessionManager.handleCommandResult(command, false, error);
    });

    // 监听连接管理器事件
    this.connectionManager.on('clientConnected', (clientInfo: any) => {
      this.logger.info(`Client connected: ${clientInfo.id}`);
      
      // 发送初始数据
      const deviceConfigs = this.deviceControlService.getAllDeviceConfigs();
      const deviceStates = this.deviceControlService.getAllDeviceStates();
      this.sessionManager.sendInitialData(clientInfo.id, deviceConfigs, deviceStates);
    });

    this.connectionManager.on('clientDisconnected', (clientInfo: any, reason: string) => {
      this.logger.info(`Client disconnected: ${clientInfo.id}, reason: ${reason}`);
    });

    // 监听会话管理器事件
    this.sessionManager.on('deviceControlRequest', async (clientId: string, command: DeviceCommand) => {
      const success = await this.deviceControlService.executeCommand(command);
      this.sessionManager.handleCommandResult(command, success);
    });

    this.sessionManager.on('getDeviceStates', (clientId: string) => {
      const deviceStates = this.deviceControlService.getAllDeviceStates();
      this.connectionManager.sendToClient(clientId, 'deviceStates', deviceStates);
    });
  }
}
