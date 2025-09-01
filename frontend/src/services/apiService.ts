import type { DeviceConfig, DeviceState, DeviceCommand, SystemStatus } from '../types/device';

/**
 * API服务
 * 负责与后端的HTTP API通信
 */
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  /**
   * 设置基础URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * 获取基础URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await this.request<any>('/');
    return {
      backend: {
        isRunning: true,
        version: response.version,
        uptime: 0
      },
      arduino: {
        isConnected: false
      },
      network: {
        type: 'wifi',
        status: 'connected'
      }
    };
  }

  /**
   * 获取健康检查
   */
  async getHealth(): Promise<any> {
    return this.request('/health');
  }

  /**
   * 获取所有设备信息（旧API）
   */
  async getDevices(): Promise<DeviceConfig[]> {
    const response = await this.request<{ success: boolean; data: DeviceConfig[] }>('/api/devices');
    return response.data;
  }

  /**
   * 获取所有设备状态
   */
  async getDeviceStates(): Promise<DeviceState[]> {
    const response = await this.request<{ success: boolean; data: DeviceState[] }>('/api/devices/status');
    return response.data;
  }

  /**
   * 获取特定设备状态
   */
  async getDeviceState(deviceId: string): Promise<DeviceState> {
    const response = await this.request<{ success: boolean; data: DeviceState }>(`/api/devices/${deviceId}/status`);
    return response.data;
  }

  /**
   * 控制设备
   */
  async controlDevice(deviceId: string, command: Omit<DeviceCommand, 'deviceId' | 'timestamp' | 'commandId'>): Promise<any> {
    return this.request(`/api/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }

  /**
   * 设置设备功率（泵专用）
   */
  async setDevicePower(deviceId: string, power: number): Promise<any> {
    return this.request(`/api/devices/${deviceId}/power`, {
      method: 'POST',
      body: JSON.stringify({ power }),
    });
  }

  /**
   * 设置设备状态（阀专用）
   */
  async setDeviceState(deviceId: string, state: boolean): Promise<any> {
    return this.request(`/api/devices/${deviceId}/state`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  }

  /**
   * 执行定时动作
   */
  async executeTimedAction(deviceId: string, action: string, value: number | boolean, duration: number): Promise<any> {
    return this.request(`/api/devices/${deviceId}/timed_action`, {
      method: 'POST',
      body: JSON.stringify({ action, value, duration }),
    });
  }

  /**
   * 停止所有设备
   */
  async stopAllDevices(): Promise<any> {
    return this.request('/api/devices/stop-all', {
      method: 'POST',
    });
  }

  // TODO: 任务相关API待重新实现

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // 设备配置管理
  /**
   * 获取所有设备配置
   */
  async getDeviceConfigs(): Promise<DeviceConfig[]> {
    const response = await this.request<{ success: boolean; data: DeviceConfig[] }>('/api/device-configs');
    return response.data;
  }

  /**
   * 创建设备配置
   */
  async createDeviceConfig(config: DeviceConfig): Promise<DeviceConfig> {
    const response = await this.request<{ success: boolean; data: DeviceConfig }>('/api/device-configs', {
      method: 'POST',
      body: JSON.stringify(config)
    });
    return response.data;
  }

  /**
   * 更新设备配置
   */
  async updateDeviceConfig(config: DeviceConfig): Promise<DeviceConfig> {
    const response = await this.request<{ success: boolean; data: DeviceConfig }>(`/api/device-configs/${config.id}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
    return response.data;
  }

  /**
   * 删除设备配置
   */
  async deleteDeviceConfig(deviceId: string): Promise<void> {
    await this.request(`/api/device-configs/${deviceId}`, {
      method: 'DELETE'
    });
  }

  /**
   * 导入设备配置
   */
  async importDeviceConfigs(configs: DeviceConfig[]): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const response = await this.request<{ success: boolean; imported: number; errors: string[] }>('/api/device-configs/import', {
      method: 'POST',
      body: JSON.stringify(configs)
    });
    return response;
  }

  /**
   * 导出设备配置
   */
  async exportDeviceConfigs(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/device-configs/export`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }
}

// 创建单例实例
export const apiService = new ApiService();
