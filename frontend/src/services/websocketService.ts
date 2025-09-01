import { io, Socket } from 'socket.io-client';
import type { DeviceState, DeviceCommand } from '../types/device';
import { useDeviceStore } from '../store/deviceStore';

/**
 * WebSocket服务
 * 负责与后端的实时通信
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private serverUrl = '';

  /**
   * 连接到WebSocket服务器
   */
  connect(serverUrl: string = 'http://localhost:8080'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.serverUrl = serverUrl;

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.setupEventHandlers();

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus(true);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnecting = false;
        this.updateConnectionStatus(false);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.updateConnectionStatus(false);
        
        if (reason === 'io server disconnect') {
          // 服务器主动断开，不自动重连
          return;
        }
        
        this.handleReconnect();
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateConnectionStatus(false);
  }

  /**
   * 发送设备控制命令
   */
  sendDeviceCommand(command: DeviceCommand): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('deviceControl', command);
  }

  /**
   * 请求设备状态更新
   */
  requestDeviceStates(): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('getDeviceStates');
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(): void {
    if (this.socket?.connected) {
      this.socket.emit('heartbeat');
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 设备状态更新
    this.socket.on('deviceStateUpdate', (deviceState: DeviceState) => {
      const { updateDeviceState } = useDeviceStore.getState();
      updateDeviceState(deviceState.deviceId, deviceState);
    });

    // 批量设备状态更新
    this.socket.on('deviceStatesBatchUpdate', (deviceStates: DeviceState[]) => {
      const { setDeviceStates } = useDeviceStore.getState();
      setDeviceStates(deviceStates);
    });

    // 设备配置更新
    this.socket.on('deviceConfigs', (configs) => {
      const { setDeviceConfigs } = useDeviceStore.getState();
      setDeviceConfigs(configs);
    });

    // 设备状态响应
    this.socket.on('deviceStates', (states) => {
      const { setDeviceStates } = useDeviceStore.getState();
      setDeviceStates(states);
    });

    // 连接状态更新
    this.socket.on('connectionStatusUpdate', (status) => {
      const { setConnectionStatus } = useDeviceStore.getState();
      setConnectionStatus({
        isConnected: true,
        connectionType: 'wifi',
        clientCount: status.totalConnections,
        maxClients: status.maxConnections,
        serverUrl: this.serverUrl
      });
    });

    // 系统消息
    this.socket.on('systemMessage', (message) => {
      console.log('System message:', message);
      // TODO: 显示系统消息通知
    });

    // 系统错误
    this.socket.on('systemError', (error) => {
      console.error('System error:', error);
      const { setError } = useDeviceStore.getState();
      setError(error.error);
    });

    // 命令执行结果
    this.socket.on('deviceControlSuccess', (result) => {
      console.log('Device control success:', result);
      // TODO: 显示成功通知
    });

    this.socket.on('deviceControlError', (error) => {
      console.error('Device control error:', error);
      const { setError } = useDeviceStore.getState();
      setError(error.error);
    });

    // 心跳响应
    this.socket.on('heartbeatAck', (data) => {
      console.debug('Heartbeat ack:', data);
    });

    // 连接建立确认
    this.socket.on('connectionEstablished', (data) => {
      console.log('Connection established:', data);
    });

    // 强制断开
    this.socket.on('forceDisconnect', (data) => {
      console.warn('Force disconnect:', data);
      this.disconnect();
    });
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      if (!this.socket?.connected) {
        this.socket?.connect();
      }
    }, delay);
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(isConnected: boolean): void {
    const { setConnectionStatus } = useDeviceStore.getState();
    setConnectionStatus({
      isConnected,
      connectionType: isConnected ? 'wifi' : 'none',
      clientCount: 0,
      maxClients: 4,
      serverUrl: this.serverUrl
    });
  }
}

// 创建单例实例
export const websocketService = new WebSocketService();

// 启动心跳
setInterval(() => {
  websocketService.sendHeartbeat();
}, 30000); // 每30秒发送一次心跳
