// 设备相关类型定义

export interface DeviceConfig {
  id: string;
  name: string;
  type: 'pump' | 'valve';
  pin: number;
  mode: 'pwm' | 'digital';
  pwmFrequency?: number;
  maxPower?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceCommand {
  deviceId: string;
  action: 'set_power' | 'set_state' | 'timed_action';
  value: number | boolean;
  duration?: number; // 定时动作持续时间（毫秒）
  timestamp: number;
  commandId: string;
}

export interface DeviceState {
  deviceId: string;
  isOnline: boolean;
  currentValue: number | boolean;
  lastUpdate: number;
  isLocked: boolean; // 设备是否被锁定（防止冲突）
  lockExpiry?: number; // 锁定过期时间
}

export interface ConnectionConfig {
  type: 'serial' | 'wifi';
  serial?: {
    port: string;
    baudRate: number;
    autoDetect: boolean;
  };
  wifi?: {
    ssid: string;
    password: string;
    ip: string;
    port: number;
  };
}

export interface ArduinoInfo {
  boardType: string;
  firmwareVersion: string;
  serialNumber: string;
  capabilities: string[];
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface ConnectionState {
  status: ConnectionStatus;
  type: 'serial' | 'wifi' | null;
  lastConnected?: number;
  errorMessage?: string;
  retryCount: number;
}
