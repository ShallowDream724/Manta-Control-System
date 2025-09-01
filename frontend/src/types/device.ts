/**
 * 设备相关类型定义
 */

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

export interface DeviceState {
  deviceId: string;
  isOnline: boolean;
  currentValue: number | boolean;
  lastUpdate: number;
  isLocked: boolean;
  lockExpiry?: number;
}

export interface DeviceCommand {
  deviceId: string;
  action: 'set_power' | 'set_state' | 'timed_action';
  value: number | boolean;
  duration?: number;
  timestamp: number;
  commandId: string;
}

export interface CommandResult {
  success: boolean;
  commandId: string;
  error?: string;
  processingTime: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  connectionType: 'wifi' | 'serial' | 'none';
  clientCount: number;
  maxClients: number;
  serverUrl?: string;
}

export interface SystemStatus {
  backend: {
    isRunning: boolean;
    version: string;
    uptime: number;
  };
  arduino: {
    isConnected: boolean;
    model?: string;
    firmware?: string;
  };
  network: {
    type: 'wifi' | 'serial';
    status: 'connected' | 'connecting' | 'disconnected';
    signalStrength?: number;
  };
}
