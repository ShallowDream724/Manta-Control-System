import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import winston from 'winston';
import { ConnectionState, ConnectionStatus, DeviceCommand } from '../../types/device';

/**
 * 串口连接管理器
 * 专门负责Arduino设备的串口连接管理
 * 
 * 职责：
 * - 串口扫描和连接
 * - 设备自动识别
 * - 连接状态监控
 * - 数据收发处理
 */
export class SerialConnectionManager extends EventEmitter {
  private logger: winston.Logger;
  private serialPort: SerialPort | null = null;
  private connectionState: ConnectionState;
  private config: SerialConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: SerialConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.connectionState = {
      status: ConnectionStatus.DISCONNECTED,
      type: 'serial',
      retryCount: 0
    };
  }

  /**
   * 启动串口连接
   */
  async start(): Promise<void> {
    this.logger.info('Starting Serial Connection Manager');
    await this.connectSerial();
  }

  /**
   * 停止串口连接
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Serial Connection Manager');
    
    this.clearTimers();
    
    if (this.serialPort && this.serialPort.isOpen) {
      await this.closeSerialPort();
    }
    
    this.updateConnectionState(ConnectionStatus.DISCONNECTED);
  }

  /**
   * 发送命令到设备
   */
  async sendCommand(command: DeviceCommand): Promise<boolean> {
    if (this.connectionState.status !== ConnectionStatus.CONNECTED) {
      this.logger.error('Cannot send command: device not connected');
      return false;
    }

    try {
      const commandStr = this.formatCommand(command);
      await this.writeToSerial(commandStr);
      this.logger.debug(`Command sent: ${commandStr}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send command:', error);
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * 扫描可用串口
   */
  async scanSerialPorts(): Promise<string[]> {
    try {
      const ports = await SerialPort.list();
      const arduinoPorts = ports
        .filter(port => this.isArduinoPort(port))
        .map(port => port.path);
      
      this.logger.info(`Found ${arduinoPorts.length} potential Arduino ports:`, arduinoPorts);
      return arduinoPorts;
    } catch (error) {
      this.logger.error('Failed to scan serial ports:', error);
      return [];
    }
  }

  /**
   * 连接串口
   */
  private async connectSerial(): Promise<void> {
    this.updateConnectionState(ConnectionStatus.CONNECTING);

    try {
      let portPath = this.config.port;
      
      // 如果启用自动检测，扫描可用端口
      if (this.config.autoDetect) {
        const availablePorts = await this.scanSerialPorts();
        if (availablePorts.length === 0) {
          throw new Error('No Arduino devices found');
        }
        portPath = availablePorts[0];
      }

      this.serialPort = new SerialPort({
        path: portPath,
        baudRate: this.config.baudRate,
        autoOpen: false
      });

      this.setupSerialEventHandlers();
      await this.openSerialPort();
      
    } catch (error) {
      this.logger.error('Serial connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateConnectionState(ConnectionStatus.ERROR, errorMessage);
      this.scheduleReconnect();
    }
  }

  /**
   * 设置串口事件处理器
   */
  private setupSerialEventHandlers(): void {
    if (!this.serialPort) return;

    this.serialPort.on('open', () => {
      this.logger.info('Serial port opened successfully');
      this.updateConnectionState(ConnectionStatus.CONNECTED);
      this.startHeartbeat();
      this.emit('connected');
    });

    this.serialPort.on('data', (data) => {
      this.handleSerialData(data);
    });

    this.serialPort.on('error', (error) => {
      this.logger.error('Serial port error:', error);
      this.updateConnectionState(ConnectionStatus.ERROR, error.message);
      this.emit('error', error);
      this.scheduleReconnect();
    });

    this.serialPort.on('close', () => {
      this.logger.warn('Serial port closed');
      this.updateConnectionState(ConnectionStatus.DISCONNECTED);
      this.emit('disconnected');
      this.scheduleReconnect();
    });
  }

  /**
   * 打开串口
   */
  private async openSerialPort(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.serialPort) {
        reject(new Error('Serial port not initialized'));
        return;
      }

      this.serialPort.open((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 关闭串口
   */
  private async closeSerialPort(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.serialPort) {
        resolve();
        return;
      }

      this.serialPort.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 处理串口数据
   */
  private handleSerialData(data: Buffer): void {
    const message = data.toString().trim();
    this.logger.debug(`Received from device: ${message}`);
    this.emit('data', message);
  }

  /**
   * 向串口写入数据
   */
  private async writeToSerial(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.serialPort || !this.serialPort.isOpen) {
        reject(new Error('Serial port not open'));
        return;
      }

      this.serialPort.write(data + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 格式化命令
   */
  private formatCommand(command: DeviceCommand): string {
    const parts = [
      'SET',
      command.deviceId,
      command.action,
      command.value.toString()
    ];
    
    if (command.duration !== undefined) {
      parts.push(command.duration.toString());
    }
    
    return parts.join(':');
  }

  /**
   * 判断是否为Arduino端口
   */
  private isArduinoPort(port: any): boolean {
    const arduinoVendors = ['2341', '1A86', '0403'];
    const arduinoProducts = ['0043', '0001', '6001'];
    
    return arduinoVendors.includes(port.vendorId) || 
           arduinoProducts.includes(port.productId) ||
           (port.manufacturer && port.manufacturer.toLowerCase().includes('arduino'));
  }

  /**
   * 更新连接状态
   */
  private updateConnectionState(status: ConnectionStatus, errorMessage?: string): void {
    this.connectionState = {
      ...this.connectionState,
      status,
      errorMessage,
      lastConnected: status === ConnectionStatus.CONNECTED ? Date.now() : this.connectionState.lastConnected
    };
    
    this.emit('connectionStateChanged', this.connectionState);
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    const delay = Math.min(5000 * Math.pow(2, this.connectionState.retryCount), 30000);
    this.connectionState.retryCount++;
    
    this.logger.info(`Scheduling reconnect in ${delay}ms (attempt ${this.connectionState.retryCount})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectSerial();
    }, delay);
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.logger.debug('Heartbeat check');
      // TODO: 发送心跳命令
    }, 5000);
  }

  /**
   * 清理定时器
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export interface SerialConfig {
  port: string;
  baudRate: number;
  autoDetect: boolean;
}
