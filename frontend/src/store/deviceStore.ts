import { create } from 'zustand';
import type { DeviceConfig, DeviceState, ConnectionStatus, SystemStatus } from '../types/device';

interface DeviceStore {
  // 设备配置
  deviceConfigs: DeviceConfig[];
  setDeviceConfigs: (configs: DeviceConfig[]) => void;
  
  // 设备状态
  deviceStates: DeviceState[];
  setDeviceStates: (states: DeviceState[]) => void;
  updateDeviceState: (deviceId: string, state: Partial<DeviceState>) => void;
  
  // 连接状态
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // 系统状态
  systemStatus: SystemStatus;
  setSystemStatus: (status: SystemStatus) => void;
  
  // 选中的设备
  selectedDeviceId: string | null;
  setSelectedDeviceId: (deviceId: string | null) => void;
  
  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // 错误状态
  error: string | null;
  setError: (error: string | null) => void;
  
  // 获取设备信息的辅助方法
  getDeviceConfig: (deviceId: string) => DeviceConfig | undefined;
  getDeviceState: (deviceId: string) => DeviceState | undefined;
  getOnlineDevices: () => DeviceState[];
  getOfflineDevices: () => DeviceState[];
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  // 初始状态
  deviceConfigs: [],
  deviceStates: [],
  connectionStatus: {
    isConnected: false,
    connectionType: 'none',
    clientCount: 0,
    maxClients: 4
  },
  systemStatus: {
    backend: {
      isRunning: false,
      version: '1.0.0',
      uptime: 0
    },
    arduino: {
      isConnected: false
    },
    network: {
      type: 'wifi',
      status: 'disconnected'
    }
  },
  selectedDeviceId: null,
  isLoading: false,
  error: null,

  // Actions
  setDeviceConfigs: (configs) => set({ deviceConfigs: configs }),
  
  setDeviceStates: (states) => set({ deviceStates: states }),
  
  updateDeviceState: (deviceId, stateUpdate) => set((state) => ({
    deviceStates: state.deviceStates.map(deviceState =>
      deviceState.deviceId === deviceId
        ? { ...deviceState, ...stateUpdate, lastUpdated: Date.now() }
        : deviceState
    )
  })),
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setSystemStatus: (status) => set({ systemStatus: status }),
  
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),

  // 辅助方法
  getDeviceConfig: (deviceId) => {
    return get().deviceConfigs.find(config => config.id === deviceId);
  },
  
  getDeviceState: (deviceId) => {
    return get().deviceStates.find(state => state.deviceId === deviceId);
  },
  
  getOnlineDevices: () => {
    return get().deviceStates.filter(state => state.isOnline);
  },
  
  getOfflineDevices: () => {
    return get().deviceStates.filter(state => !state.isOnline);
  }
}));
