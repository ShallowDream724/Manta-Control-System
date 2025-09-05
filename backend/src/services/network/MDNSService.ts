/**
 * mDNS服务
 * 提供fish.local域名解析，让同热点设备能访问fish:8080
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import * as mdns from 'mdns-js';
import * as os from 'os';

/**
 * mDNS服务配置
 */
interface MDNSConfig {
  serviceName: string;
  serviceType: string;
  port: number;
  hostname: string;
  txtRecord?: Record<string, string>;
}

/**
 * mDNS服务状态
 */
interface MDNSStatus {
  isRunning: boolean;
  serviceName: string;
  hostname: string;
  port: number;
  ipAddresses: string[];
  lastUpdate: number;
}

/**
 * mDNS服务类
 */
export class MDNSService extends EventEmitter {
  private logger: winston.Logger;
  private config: MDNSConfig;
  private advertisement: any = null;
  private browser: any = null;
  private status: MDNSStatus;
  private isInitialized = false;

  constructor(config: MDNSConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.status = {
      isRunning: false,
      serviceName: config.serviceName,
      hostname: config.hostname,
      port: config.port,
      ipAddresses: [],
      lastUpdate: 0
    };
  }

  /**
   * 启动mDNS服务
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting mDNS service...');

      // 获取本机IP地址
      const ipAddresses = this.getLocalIPAddresses();
      this.status.ipAddresses = ipAddresses;

      // 创建mDNS广告
      await this.createAdvertisement();

      // 启动服务浏览器（可选）
      this.startServiceBrowser();

      this.status.isRunning = true;
      this.status.lastUpdate = Date.now();
      this.isInitialized = true;

      this.logger.info(`mDNS service started successfully`);
      this.logger.info(`Service available at: ${this.config.hostname}.local:${this.config.port}`);
      this.logger.info(`IP addresses: ${ipAddresses.join(', ')}`);

      this.emit('started', this.status);

    } catch (error) {
      this.logger.error('Failed to start mDNS service:', error);
      this.status.isRunning = false;
      throw error;
    }
  }

  /**
   * 停止mDNS服务
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping mDNS service...');

      // 停止广告
      if (this.advertisement) {
        this.advertisement.stop();
        this.advertisement = null;
      }

      // 停止浏览器
      if (this.browser) {
        this.browser.stop();
        this.browser = null;
      }

      this.status.isRunning = false;
      this.status.lastUpdate = Date.now();
      this.isInitialized = false;

      this.logger.info('mDNS service stopped');
      this.emit('stopped');

    } catch (error) {
      this.logger.error('Error stopping mDNS service:', error);
      throw error;
    }
  }

  /**
   * 重启mDNS服务
   */
  async restart(): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }

  /**
   * 获取服务状态
   */
  getStatus(): MDNSStatus {
    return { ...this.status };
  }

  /**
   * 更新服务配置
   */
  async updateConfig(newConfig: Partial<MDNSConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // 如果关键配置改变，重启服务
    if (
      newConfig.serviceName !== oldConfig.serviceName ||
      newConfig.port !== oldConfig.port ||
      newConfig.hostname !== oldConfig.hostname
    ) {
      if (this.isInitialized) {
        await this.restart();
      }
    }
  }

  /**
   * 创建mDNS广告
   */
  private async createAdvertisement(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 创建服务广告
        this.advertisement = mdns.createAdvertisement(
          mdns.tcp(this.config.serviceType),
          this.config.port,
          {
            name: this.config.serviceName,
            host: this.config.hostname,
            txt: this.config.txtRecord || {}
          }
        );

        // 检查advertisement对象是否有on方法
        if (this.advertisement && typeof this.advertisement.on === 'function') {
          // 监听广告事件
          this.advertisement.on('ready', () => {
            this.logger.info(`mDNS advertisement ready: ${this.config.serviceName}`);
            resolve();
          });

          this.advertisement.on('error', (error: Error) => {
            this.logger.error('mDNS advertisement error:', error);
            reject(error);
          });
        } else {
          // 如果没有事件监听，直接解析
          this.logger.info(`mDNS advertisement created: ${this.config.serviceName}`);
          resolve();
        }

        // 启动广告
        if (this.advertisement && typeof this.advertisement.start === 'function') {
          this.advertisement.start();
        }

      } catch (error) {
        this.logger.error('Failed to create mDNS advertisement:', error);
        reject(error);
      }
    });
  }

  /**
   * 启动服务浏览器（使用降级策略）
   */
  private startServiceBrowser(): void {
    try {
      // 尝试使用mdns-js浏览器
      this.browser = mdns.createBrowser(mdns.tcp(this.config.serviceType));

      // 设置超时保护
      const browserTimeout = setTimeout(() => {
        this.logger.warn('mDNS browser initialization timeout, using fallback');
        this.useFallbackBrowser();
      }, 5000);

      // 检查browser对象是否有所需方法
      if (this.browser && typeof this.browser.on === 'function') {
        this.browser.on('ready', () => {
          clearTimeout(browserTimeout);
          this.logger.debug('mDNS browser ready');
          if (typeof this.browser.discover === 'function') {
            this.browser.discover();
          }
        });

        this.browser.on('update', (data: any) => {
          this.logger.debug('mDNS service discovered:', data);
          this.emit('serviceDiscovered', data);
        });

        this.browser.on('error', (error: Error) => {
          clearTimeout(browserTimeout);
          this.logger.error('mDNS browser error:', error);
          this.useFallbackBrowser();
        });

        // 启动浏览器
        if (typeof this.browser.start === 'function') {
          this.browser.start();
          this.logger.debug('mDNS browser started successfully');
        } else {
          clearTimeout(browserTimeout);
          this.useFallbackBrowser();
        }
      } else {
        clearTimeout(browserTimeout);
        this.useFallbackBrowser();
      }

    } catch (error) {
      this.logger.error('Failed to start mDNS browser:', error);
      this.useFallbackBrowser();
    }
  }

  /**
   * 使用降级浏览器（基于网络扫描）
   */
  private useFallbackBrowser(): void {
    this.logger.info('Using fallback mDNS browser implementation');

    // 定期扫描网络中的mDNS服务
    const fallbackInterval = setInterval(() => {
      this.performNetworkScan();
    }, 30000); // 每30秒扫描一次

    // 存储定时器以便清理
    (this as any).fallbackInterval = fallbackInterval;
  }

  /**
   * 执行网络扫描（降级方案）
   */
  private async performNetworkScan(): Promise<void> {
    try {
      // 简单的网络扫描实现
      const { exec } = require('child_process');
      const platform = process.platform;

      let command: string;
      if (platform === 'win32') {
        command = 'arp -a';
      } else {
        command = 'arp -a | grep -E "([0-9]{1,3}\\.){3}[0-9]{1,3}"';
      }

      exec(command, (error: any, stdout: string) => {
        if (!error && stdout) {
          this.logger.debug('Network scan completed');
          // 这里可以解析ARP表来发现设备
          // 暂时只记录扫描完成
        }
      });
    } catch (error) {
      this.logger.debug('Network scan failed:', error);
    }
  }

  /**
   * 获取本机IP地址
   */
  private getLocalIPAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const interfaceName in interfaces) {
      const networkInterface = interfaces[interfaceName];
      if (networkInterface) {
        for (const address of networkInterface) {
          // 只获取IPv4地址，排除回环地址
          if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
          }
        }
      }
    }

    return addresses;
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(): Promise<boolean> {
    try {
      // 检查广告是否正在运行
      if (!this.advertisement || !this.status.isRunning) {
        return false;
      }

      // 更新IP地址
      const currentIPs = this.getLocalIPAddresses();
      if (JSON.stringify(currentIPs) !== JSON.stringify(this.status.ipAddresses)) {
        this.status.ipAddresses = currentIPs;
        this.status.lastUpdate = Date.now();
        this.logger.info(`IP addresses updated: ${currentIPs.join(', ')}`);
        this.emit('ipAddressChanged', currentIPs);
      }

      return true;

    } catch (error) {
      this.logger.error('mDNS health check failed:', error);
      return false;
    }
  }

  /**
   * 获取服务URL
   */
  getServiceURL(): string {
    return `http://${this.config.hostname}.local:${this.config.port}`;
  }

  /**
   * 获取所有可用的访问URL
   */
  getAllAccessURLs(): string[] {
    const urls: string[] = [];
    
    // 添加mDNS URL
    urls.push(this.getServiceURL());
    
    // 添加IP地址URL
    for (const ip of this.status.ipAddresses) {
      urls.push(`http://${ip}:${this.config.port}`);
    }
    
    return urls;
  }
}

/**
 * 创建默认的mDNS服务实例
 */
export function createMDNSService(port: number, logger: winston.Logger): MDNSService {
  const config: MDNSConfig = {
    serviceName: 'FishControl Backend',
    serviceType: 'http',
    port: port,
    hostname: 'fish',
    txtRecord: {
      version: '1.0.0',
      service: 'manta-control',
      description: 'Manta Control Ultra Backend Service'
    }
  };

  return new MDNSService(config, logger);
}
