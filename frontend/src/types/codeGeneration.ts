/**
 * 代码生成相关的共享类型定义
 * 避免重复定义，统一管理
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GeneratedCodeResponse {
  success: boolean;
  data?: {
    code: string;
    deviceCount: number;
    generatedAt: string;
    devices: Array<{
      id: string;
      name: string;
      type: string;
      pin: number;
    }>;
    metadata?: {
      pwmDevices: number;
      digitalDevices: number;
      usedPins: number[];
      wifiConfig: {
        ssid: string;
        hasPassword: boolean;
      };
    };
    validation?: ValidationResult;
  };
  error?: string;
}

export interface CodeMetadata {
  deviceCount: number;
  pwmDevices: number;
  digitalDevices: number;
  usedPins: number[];
  wifiConfig: {
    ssid: string;
    hasPassword: boolean;
  };
}

export interface GeneratedCode {
  code: string;
  language: string;
  platform: string;
  generatedAt: Date;
  metadata: CodeMetadata;
  validation: ValidationResult;
}

export interface WifiConfig {
  ssid: string;
  password: string;
  channel?: number;
  maxConnections?: number;
}
