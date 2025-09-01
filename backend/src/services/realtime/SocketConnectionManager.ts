import { EventEmitter } from 'events';
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import winston from 'winston';

/**
 * Socket连接管理器
 * 专门负责WebSocket连接的管理和维护
 * 
 * 职责：
 * - Socket.io服务器初始化
 * - 客户端连接管理
 * - 连接数限制控制
 * - 连接状态监控
 */
export class SocketConnectionManager extends EventEmitter {
  private io: Server;
  private logger: winston.Logger;
  private connectedClients: Map<string, ClientInfo> = new Map();
  private maxConnections = 4; // 1台电脑 + 3台手机
  private inactivityTimeout = 5 * 60 * 1000; // 5分钟
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer, logger: winston.Logger) {
    super();
    this.logger = logger;
    
    // 初始化Socket.io服务器
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
  }

  /**
   * 启动连接管理器
   */
  start(): void {
    this.logger.info('Socket Connection Manager started');
    this.startInactivityCleanup();
  }

  /**
   * 停止连接管理器
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.io.close();
    this.logger.info('Socket Connection Manager stopped');
  }

  /**
   * 获取Socket.io服务器实例
   */
  getServer(): Server {
    return this.io;
  }

  /**
   * 广播消息到所有客户端
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    this.logger.debug(`Broadcasted event: ${event}`);
  }

  /**
   * 发送消息到特定客户端
   */
  sendToClient(clientId: string, event: string, data: any): boolean {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
      this.logger.debug(`Sent event to client ${clientId}: ${event}`);
      return true;
    }
    
    this.logger.warn(`Client ${clientId} not found`);
    return false;
  }

  /**
   * 获取连接的客户端信息
   */
  getConnectedClients(): ClientInfo[] {
    return Array.from(this.connectedClients.values());
  }

  /**
   * 获取连接统计
   */
  getConnectionStats(): ConnectionStats {
    const clients = Array.from(this.connectedClients.values());
    const now = Date.now();
    
    return {
      totalConnections: clients.length,
      maxConnections: this.maxConnections,
      activeConnections: clients.filter(c => now - c.lastActivity < 60000).length,
      deviceTypes: this.getDeviceTypeDistribution(clients),
      averageConnectionDuration: this.calculateAverageConnectionDuration(clients, now)
    };
  }

  /**
   * 强制断开客户端连接
   */
  disconnectClient(clientId: string, reason: string = 'Forced disconnect'): boolean {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit('forceDisconnect', { reason });
      socket.disconnect();
      this.logger.info(`Forcefully disconnected client ${clientId}: ${reason}`);
      return true;
    }
    
    return false;
  }

  /**
   * 设置最大连接数
   */
  setMaxConnections(max: number): void {
    this.maxConnections = max;
    this.logger.info(`Max connections updated to: ${max}`);
  }

  /**
   * 设置Socket.io事件处理器
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket);
    });
  }

  /**
   * 处理客户端连接
   */
  private handleClientConnection(socket: Socket): void {
    // 检查连接数限制
    if (this.connectedClients.size >= this.maxConnections) {
      this.logger.warn(`Connection rejected: maximum connections (${this.maxConnections}) reached`);
      socket.emit('connectionRejected', {
        reason: 'Maximum connections reached',
        maxConnections: this.maxConnections
      });
      socket.disconnect();
      return;
    }

    const clientInfo: ClientInfo = {
      id: socket.id,
      connectedAt: Date.now(),
      userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
      ip: socket.handshake.address,
      lastActivity: Date.now()
    };

    this.connectedClients.set(socket.id, clientInfo);
    this.logger.info(`Client connected: ${socket.id} (${this.connectedClients.size}/${this.maxConnections})`);

    // 设置客户端事件处理器
    this.setupClientEventHandlers(socket);

    // 发送连接确认
    socket.emit('connectionEstablished', {
      clientId: socket.id,
      serverTime: Date.now(),
      maxConnections: this.maxConnections
    });

    // 通知其他组件
    this.emit('clientConnected', clientInfo);
    this.broadcastConnectionStatus();
  }

  /**
   * 设置客户端事件处理器
   */
  private setupClientEventHandlers(socket: Socket): void {
    // 处理心跳
    socket.on('heartbeat', () => {
      this.handleHeartbeat(socket);
    });

    // 处理客户端信息更新
    socket.on('updateClientInfo', (data) => {
      this.handleClientInfoUpdate(socket, data);
    });

    // 处理断开连接
    socket.on('disconnect', (reason) => {
      this.handleClientDisconnection(socket, reason);
    });

    // 处理错误
    socket.on('error', (error) => {
      this.logger.error(`Socket error for client ${socket.id}:`, error);
      this.emit('clientError', socket.id, error);
    });

    // 转发其他事件到上层
    socket.onAny((event, ...args) => {
      if (!['heartbeat', 'updateClientInfo', 'disconnect', 'error'].includes(event)) {
        this.updateClientActivity(socket.id);
        this.emit('clientEvent', socket.id, event, ...args);
      }
    });
  }

  /**
   * 处理心跳
   */
  private handleHeartbeat(socket: Socket): void {
    this.updateClientActivity(socket.id);
    socket.emit('heartbeatAck', { timestamp: Date.now() });
  }

  /**
   * 处理客户端信息更新
   */
  private handleClientInfoUpdate(socket: Socket, data: any): void {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      if (data.deviceType) clientInfo.deviceType = data.deviceType;
      if (data.browserInfo) clientInfo.browserInfo = data.browserInfo;
      
      this.updateClientActivity(socket.id);
      this.logger.debug(`Updated client info for ${socket.id}`);
      this.emit('clientInfoUpdated', clientInfo);
    }
  }

  /**
   * 处理客户端断开连接
   */
  private handleClientDisconnection(socket: Socket, reason: string): void {
    const clientInfo = this.connectedClients.get(socket.id);
    this.connectedClients.delete(socket.id);
    
    this.logger.info(`Client disconnected: ${socket.id}, reason: ${reason} (${this.connectedClients.size}/${this.maxConnections})`);
    
    if (clientInfo) {
      this.emit('clientDisconnected', clientInfo, reason);
    }
    
    this.broadcastConnectionStatus();
  }

  /**
   * 更新客户端活动时间
   */
  private updateClientActivity(clientId: string): void {
    const clientInfo = this.connectedClients.get(clientId);
    if (clientInfo) {
      clientInfo.lastActivity = Date.now();
    }
  }

  /**
   * 广播连接状态
   */
  private broadcastConnectionStatus(): void {
    const stats = this.getConnectionStats();
    this.broadcast('connectionStatusUpdate', stats);
  }

  /**
   * 启动非活跃连接清理
   */
  private startInactivityCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();

      for (const [clientId, clientInfo] of this.connectedClients) {
        if (now - clientInfo.lastActivity > this.inactivityTimeout) {
          this.logger.warn(`Disconnecting inactive client: ${clientId}`);
          this.disconnectClient(clientId, 'Inactivity timeout');
        }
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 获取设备类型分布
   */
  private getDeviceTypeDistribution(clients: ClientInfo[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const client of clients) {
      const type = client.deviceType || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * 计算平均连接时长
   */
  private calculateAverageConnectionDuration(clients: ClientInfo[], now: number): number {
    if (clients.length === 0) return 0;
    
    const totalDuration = clients.reduce((sum, client) => {
      return sum + (now - client.connectedAt);
    }, 0);
    
    return totalDuration / clients.length;
  }
}

export interface ClientInfo {
  id: string;
  connectedAt: number;
  userAgent: string;
  ip: string;
  lastActivity: number;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browserInfo?: string;
}

export interface ConnectionStats {
  totalConnections: number;
  maxConnections: number;
  activeConnections: number;
  deviceTypes: Record<string, number>;
  averageConnectionDuration: number;
}
