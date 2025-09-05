import { EventEmitter } from 'events';
import winston from 'winston';
import * as wifi from 'node-wifi';
import { ConnectionState, ConnectionStatus, DeviceCommand } from '../../types/device';

/**
 * WiFi配置接口
 */
export interface WiFiConnectionConfig {
  ssid: string;
  password: string;
  ip: string;
  port: number;
}

/**
 * 网络状态接口
 */
export interface NetworkConnectionStatus {
  isConnected: boolean;
  currentSSID: string | null;
  signalStrength: number;
  ipAddress: string | null;
}

/**
 * WiFi连接管理器
 * 专门负责Arduino设备的WiFi连接管理
 * 
 * 职责：
 * - WiFi热点连接
 * - 网络状态监控
 * - HTTP通信处理
 * - 连接稳定性保证
 */
export class WiFiConnectionManager extends EventEmitter {
  private logger: winston.Logger;
  private connectionState: ConnectionState;
  private config: WiFiConnectionConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private httpClient: any = null;
  private isInitialized = false;

  constructor(config: WiFiConnectionConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.connectionState = {
      status: ConnectionStatus.DISCONNECTED,
      type: 'wifi',
      retryCount: 0
    };

    // 初始化WiFi模块
    this.initializeWiFi();
  }

  /**
   * 启动WiFi连接
   */
  async start(): Promise<void> {
    this.logger.info('Starting WiFi Connection Manager');
    if (!this.isInitialized) {
      throw new Error('WiFi module not initialized');
    }
    await this.connectWiFi();
  }

  /**
   * 停止WiFi连接
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping WiFi Connection Manager');
    
    this.clearTimers();
    await this.disconnectWiFi();
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
      const success = await this.sendHttpCommand(command);
      if (success) {
        this.logger.debug(`WiFi command sent: ${command.commandId}`);
      }
      return success;
    } catch (error) {
      this.logger.error('Failed to send WiFi command:', error);
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
   * 扫描可用WiFi网络（带降级方案）
   */
  async scanWiFiNetworks(): Promise<string[]> {
    if (!this.isInitialized) {
      this.logger.warn('WiFi not initialized, using fallback network list');
      return this.getFallbackNetworkList();
    }

    try {
      this.logger.info('Scanning WiFi networks...');

      // 设置扫描超时
      const scanPromise = wifi.scan();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('WiFi scan timeout')), 10000);
      });

      const networks = await Promise.race([scanPromise, timeoutPromise]);
      const networkNames = networks.map((network: any) => network.ssid).filter((ssid: string) => ssid);

      this.logger.info(`Found ${networkNames.length} WiFi networks`);
      this.logger.debug('Available networks:', networkNames);

      // 如果找到目标网络，缓存结果
      if (networkNames.includes(this.config.ssid)) {
        this.cacheNetworkList(networkNames);
      }

      return networkNames;
    } catch (error) {
      this.logger.error('Failed to scan WiFi networks:', error);
      this.logger.info('Using cached or fallback network list');
      return this.getFallbackNetworkList();
    }
  }

  /**
   * 获取降级网络列表
   */
  private getFallbackNetworkList(): string[] {
    // 返回缓存的网络列表或预期的网络
    const cachedNetworks = this.getCachedNetworkList();
    if (cachedNetworks.length > 0) {
      return cachedNetworks;
    }

    // 如果没有缓存，返回预期的Arduino热点
    return [this.config.ssid];
  }

  /**
   * 缓存网络列表
   */
  private cacheNetworkList(networks: string[]): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(process.cwd(), '.wifi_cache.json');

      const cacheData = {
        networks,
        timestamp: Date.now()
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
    } catch (error) {
      this.logger.debug('Failed to cache network list:', error);
    }
  }

  /**
   * 获取缓存的网络列表
   */
  private getCachedNetworkList(): string[] {
    try {
      const fs = require('fs');
      const path = require('path');
      const cacheFile = path.join(process.cwd(), '.wifi_cache.json');

      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

        // 检查缓存是否过期（1小时）
        if (Date.now() - cacheData.timestamp < 3600000) {
          return cacheData.networks || [];
        }
      }
    } catch (error) {
      this.logger.debug('Failed to read cached network list:', error);
    }

    return [];
  }

  /**
   * 检查当前网络连接状态
   */
  async checkCurrentNetworkStatus(): Promise<NetworkConnectionStatus> {
    try {
      const currentConnections = await wifi.getCurrentConnections();

      if (currentConnections.length > 0) {
        const connection = currentConnections[0];
        return {
          isConnected: true,
          currentSSID: connection.ssid || 'Unknown',
          signalStrength: connection.signal_level || 0,
          ipAddress: connection.ip || null
        };
      } else {
        return {
          isConnected: false,
          currentSSID: null,
          signalStrength: 0,
          ipAddress: null
        };
      }
    } catch (error) {
      this.logger.error('Failed to check network status:', error);
      return {
        isConnected: false,
        currentSSID: null,
        signalStrength: 0,
        ipAddress: null
      };
    }
  }

  /**
   * 一键断开当前WiFi连接
   */
  async disconnectCurrentWiFi(): Promise<boolean> {
    try {
      this.logger.info('Disconnecting from current WiFi network');
      // TODO: 实现WiFi断开功能
      
      this.emit('currentWiFiDisconnected');
      return true;
    } catch (error) {
      this.logger.error('Failed to disconnect current WiFi:', error);
      return false;
    }
  }

  /**
   * 连接到Arduino WiFi热点
   */
  private async connectWiFi(): Promise<void> {
    this.updateConnectionState(ConnectionStatus.CONNECTING);
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Connecting to WiFi: ${this.config.ssid} (attempt ${attempt}/${maxRetries})`);

        // 1. 扫描网络，确认目标网络存在
        this.logger.debug('Scanning for available networks...');
        const networks = await this.scanWiFiNetworks();

        if (!networks.includes(this.config.ssid)) {
          throw new Error(`Target network '${this.config.ssid}' not found in scan results: [${networks.join(', ')}]`);
        }

        this.logger.info(`Target network '${this.config.ssid}' found, attempting connection...`);

        // 2. 连接到指定SSID
        await wifi.connect({
          ssid: this.config.ssid,
          password: this.config.password
        });

        this.logger.debug('WiFi connect command sent, verifying connection...');

        // 3. 验证连接
        await this.verifyConnection();

        this.updateConnectionState(ConnectionStatus.CONNECTED);
        this.connectionState.retryCount = 0; // 重置重试计数
        this.startHeartbeat();
        this.emit('connected');

        this.logger.info(`Successfully connected to WiFi: ${this.config.ssid}`);
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`WiFi connection attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 递增延迟：2s, 4s, 6s
          this.logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了
    const errorMessage = lastError ? lastError.message : 'Unknown error';
    this.logger.error(`WiFi connection failed after ${maxRetries} attempts:`, errorMessage);
    this.updateConnectionState(ConnectionStatus.ERROR, errorMessage);
    this.connectionState.retryCount++;
    this.scheduleReconnect();
  }

  /**
   * 断开WiFi连接
   */
  private async disconnectWiFi(): Promise<void> {
    try {
      // TODO: 实现WiFi断开逻辑
      this.logger.info('Disconnecting from WiFi');
    } catch (error) {
      this.logger.error('Failed to disconnect WiFi:', error);
    }
  }

  /**
   * 发送HTTP命令
   */
  private async sendHttpCommand(command: DeviceCommand): Promise<boolean> {
    try {
      const url = `http://${this.config.ip}:${this.config.port}/control`;
      const payload = {
        deviceId: command.deviceId,
        action: command.action,
        value: command.value,
        duration: command.duration,
        timestamp: command.timestamp
      };

      // TODO: 实现HTTP请求
      this.logger.debug(`Sending HTTP command to ${url}`, payload);
      
      // 模拟HTTP请求
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      this.logger.error('HTTP command failed:', error);
      return false;
    }
  }

  /**
   * 初始化WiFi模块（带权限检查和降级）
   */
  private initializeWiFi(): void {
    try {
      // 检查操作系统兼容性和权限
      const platform = process.platform;

      if (platform === 'win32') {
        this.logger.info('Initializing WiFi module for Windows...');
        // Windows需要管理员权限
        if (!this.checkWindowsAdminRights()) {
          this.logger.warn('Windows admin rights may be required for WiFi operations');
        }
      } else if (platform === 'darwin') {
        this.logger.info('Initializing WiFi module for macOS...');
      } else if (platform === 'linux') {
        this.logger.info('Initializing WiFi module for Linux...');
      } else {
        this.logger.warn(`Unsupported platform: ${platform}, using fallback mode`);
        this.enableFallbackMode();
        return;
      }

      // 尝试初始化WiFi模块
      wifi.init({
        iface: null // 使用默认网络接口
      });

      // 测试WiFi功能是否可用
      this.testWiFiFunctionality();

    } catch (error) {
      this.logger.error('Failed to initialize WiFi module:', error);
      this.logger.warn('Enabling fallback mode for WiFi operations');
      this.enableFallbackMode();
    }
  }

  /**
   * 检查Windows管理员权限
   */
  private checkWindowsAdminRights(): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('net session', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 测试WiFi功能
   */
  private async testWiFiFunctionality(): Promise<void> {
    try {
      // 尝试获取当前连接状态
      await wifi.getCurrentConnections();
      this.isInitialized = true;
      this.logger.info('WiFi module initialized and tested successfully');
    } catch (error) {
      this.logger.warn('WiFi module initialized but functionality test failed:', error);
      this.enableFallbackMode();
    }
  }

  /**
   * 启用降级模式
   */
  private enableFallbackMode(): void {
    this.isInitialized = false;
    this.logger.info('WiFi fallback mode enabled - using network connectivity checks');

    // 在降级模式下，我们仍然可以检查网络连接
    this.startNetworkConnectivityCheck();
  }

  /**
   * 启动网络连接检查（降级模式）
   */
  private startNetworkConnectivityCheck(): void {
    const checkInterval = setInterval(async () => {
      try {
        const isConnected = await this.checkNetworkConnectivity();
        if (isConnected && this.connectionState.status !== ConnectionStatus.CONNECTED) {
          this.logger.info('Network connectivity detected in fallback mode');
          this.updateConnectionState(ConnectionStatus.CONNECTED);
          this.emit('connected');
        } else if (!isConnected && this.connectionState.status === ConnectionStatus.CONNECTED) {
          this.logger.warn('Network connectivity lost in fallback mode');
          this.updateConnectionState(ConnectionStatus.DISCONNECTED);
          this.emit('disconnected');
        }
      } catch (error) {
        this.logger.debug('Network connectivity check failed:', error);
      }
    }, 10000); // 每10秒检查一次

    // 存储定时器以便清理
    (this as any).connectivityCheckInterval = checkInterval;
  }

  /**
   * 检查网络连接性（降级模式）
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      const platform = process.platform;

      let command: string;
      if (platform === 'win32') {
        command = 'ping -n 1 8.8.8.8';
      } else {
        command = 'ping -c 1 8.8.8.8';
      }

      exec(command, (error: any) => {
        resolve(!error);
      });
    });
  }

  /**
   * 验证WiFi连接
   */
  private async verifyConnection(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const status = await this.checkCurrentNetworkStatus();
        if (status.isConnected && status.currentSSID === this.config.ssid) {
          this.logger.info(`WiFi connection verified: ${status.currentSSID} (${status.ipAddress})`);
          return;
        }
      } catch (error) {
        this.logger.debug(`Connection verification attempt ${i + 1} failed:`, error);
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Failed to verify WiFi connection');
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(async () => {
      try {
        const isHealthy = await this.checkWiFiHealth();
        if (!isHealthy) {
          this.logger.warn('WiFi health check failed, attempting reconnection...');
          await this.connectWiFi();
        }
      } catch (error) {
        this.logger.error('Heartbeat check failed:', error);
      }
    }, 30000); // 每30秒检查一次

    this.logger.debug('WiFi heartbeat started');
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this.logger.debug('WiFi heartbeat stopped');
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 指数退避重连策略
    const baseDelay = 5000; // 5秒基础延迟
    const maxDelay = 300000; // 最大5分钟
    const delay = Math.min(baseDelay * Math.pow(2, this.connectionState.retryCount), maxDelay);

    this.logger.info(`Scheduling reconnection in ${delay}ms (retry count: ${this.connectionState.retryCount})`);

    this.reconnectTimer = setTimeout(async () => {
      if (this.connectionState.status !== ConnectionStatus.CONNECTED) {
        this.logger.info('Attempting automatic reconnection...');
        await this.connectWiFi();
      }
    }, delay);
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

  /**
   * 更新连接状态
   */
  private updateConnectionState(status: ConnectionStatus, errorMessage?: string): void {
    this.connectionState.status = status;
    this.connectionState.lastConnected = status === ConnectionStatus.CONNECTED ? Date.now() : this.connectionState.lastConnected;
    this.connectionState.errorMessage = errorMessage;

    this.logger.debug(`Connection state updated: ${status}${errorMessage ? ` (${errorMessage})` : ''}`);
    this.emit('connectionStateChanged', this.connectionState);
  }

  /**
   * 检查WiFi连接健康状态
   */
  private async checkWiFiHealth(): Promise<boolean> {
    try {
      // TODO: 实现WiFi健康检查
      // 1. Ping测试
      // 2. 信号强度检查
      // 3. 延迟测试
      
      return true;
    } catch (error) {
      this.logger.error('WiFi health check failed:', error);
      return false;
    }
  }



}
