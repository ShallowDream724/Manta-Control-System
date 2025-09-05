// 设备分组类型定义
export interface DeviceGroup {
  id: string;                    // 分组唯一ID
  name: string;                  // 分组名称
  color: string;                 // 分组颜色
  icon: string;                  // 分组图标
  description?: string;          // 分组描述
}

// 可配置设备相关类型定义
export interface DeviceConfig {
  id: string;                    // 设备唯一ID
  name: string;                  // 用户自定义设备名称
  type: 'pwm' | 'digital';       // 设备类型：PWM或数字设备
  pin: number;                   // Arduino引脚号 (0-99)
  icon?: string;                 // 设备图标ID
  description?: string;          // 设备描述
  groupId?: string;              // 所属分组ID
}

// 默认设备分组
export const DEFAULT_DEVICE_GROUPS: DeviceGroup[] = [
  { id: 'inflate', name: '充气泵', color: '#3B82F6', icon: 'bolt', description: '用于充气的PWM设备' },
  { id: 'deflate', name: '抽气泵', color: '#EF4444', icon: 'fire', description: '用于抽气的PWM设备' },
  { id: 'valve', name: '电磁阀', color: '#10B981', icon: 'cog', description: '用于控制气流的数字设备' }
];

// 默认设备配置 - 仿生蝠鲼控制系统的6个设备
export const DEFAULT_DEVICES: DeviceConfig[] = [
  { id: 'pump1', name: '充气泵1', type: 'pwm', pin: 5, icon: 'bolt', groupId: 'inflate' },
  { id: 'pump2', name: '充气泵2', type: 'pwm', pin: 6, icon: 'bolt', groupId: 'inflate' },
  { id: 'pump3', name: '抽气泵1', type: 'pwm', pin: 10, icon: 'fire', groupId: 'deflate' },
  { id: 'pump4', name: '抽气泵2', type: 'pwm', pin: 11, icon: 'fire', groupId: 'deflate' },
  { id: 'valve1', name: '电磁阀1', type: 'digital', pin: 2, icon: 'cog', groupId: 'valve' },
  { id: 'valve2', name: '电磁阀2', type: 'digital', pin: 4, icon: 'cog', groupId: 'valve' }
];

// 配置验证结果
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 设备运行时状态
export interface Device {
  id: string;
  config: DeviceConfig;
  isOnline: boolean;
  currentState: DeviceState;
  lastUpdated: Date;
}

export interface DeviceState {
  isActive: boolean;
  power?: number; // 0-100, 仅泵类设备
  duration?: number; // 定时时长(秒), 0表示常开/常闭
  remainingTime?: number; // 剩余时间(秒)
}

export interface DeviceCommand {
  deviceId: string;
  action: 'start' | 'stop' | 'set_power' | 'set_timer';
  power?: number;
  duration?: number;
  timestamp: Date;
  clientId: string;
}

// 任务编排相关类型
export interface TaskAction {
  id: string;
  deviceId: string;
  power?: number;
  duration: number;
  delay?: number; // 延迟执行时间(秒)
}

export interface TaskStep {
  id: string;
  name: string;
  actions: TaskAction[];
  loops: TaskLoop[];
}

export interface TaskLoop {
  id: string;
  name: string;
  iterations: number; // 循环次数, -1表示无限循环
  interval: number; // 循环间隔(秒)
  steps: TaskSubStep[];
}

export interface TaskSubStep {
  id: string;
  name: string;
  actions: TaskAction[];
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  steps: TaskStep[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  currentLoop?: {
    stepId: string;
    loopId: string;
    iteration: number;
    subStep: number;
  };
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-100
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, any>;
}

// 系统状态相关类型
export interface SystemStatus {
  isConnected: boolean;
  arduinoOnline: boolean;
  connectedClients: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastHeartbeat: Date;
}

export interface ConflictInfo {
  type: 'device_busy' | 'task_running' | 'command_conflict';
  deviceId?: string;
  taskId?: string;
  conflictingClient?: string;
  message: string;
  timestamp: Date;
}

// 响应式设计相关类型
export type BreakpointType = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveConfig {
  breakpoint: BreakpointType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'device_update' | 'task_update' | 'system_status' | 'conflict_alert' | 'log_message';
  payload: any;
  timestamp: Date;
  clientId?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// 系统配置类型
export interface SystemConfig {
  devices: DeviceConfig[];
  network: {
    wifiSSID: string;
    wifiPassword: string;
    serverPort: number;
    enableMDNS: boolean;
  };
  features: {
    enableTaskScheduler: boolean;
    enableConflictDetection: boolean;
    enableLogging: boolean;
    maxConcurrentTasks: number;
  };
}

// Arduino代码生成相关类型
export interface ArduinoCodeTemplate {
  deviceDefinitions: string;
  setupCode: string;
  loopCode: string;
  wifiCode: string;
  deviceControlFunctions: string;
}

export interface CodeGenerationOptions {
  includeWiFi: boolean;
  includeLogging: boolean;
  includeHeartbeat: boolean;
  baudRate: number;
}

// 日志相关类型
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  source: 'frontend' | 'backend' | 'arduino';
  category: string;
  message: string;
  details?: Record<string, any>;
}

export interface LogFilter {
  level?: string[];
  source?: string[];
  category?: string[];
  startTime?: Date;
  endTime?: Date;
  search?: string;
}

// 用户界面状态类型
export interface UIState {
  currentPage: string;
  sidebarOpen: boolean;
  modalOpen: boolean;
  loading: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

// 触摸手势类型
export interface TouchGesture {
  type: 'tap' | 'long_press' | 'swipe' | 'pinch';
  startPosition: { x: number; y: number };
  endPosition?: { x: number; y: number };
  duration: number;
  force?: number;
}

// PWA相关类型
export interface PWAConfig {
  enableOffline: boolean;
  enableNotifications: boolean;
  enableInstallPrompt: boolean;
  cacheStrategy: 'cache_first' | 'network_first' | 'stale_while_revalidate';
}

// 动画配置类型
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  repeat?: number;
  direction?: 'normal' | 'reverse' | 'alternate';
}

// 主题配置类型
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
}
