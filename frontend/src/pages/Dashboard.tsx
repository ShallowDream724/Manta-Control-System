import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDeviceStore } from '../store/deviceStore';
import { apiService } from '../services/apiService';
import { websocketService } from '../services/websocketService';
import {
  CpuChipIcon,
  WifiIcon,
  ClockIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

/**
 * 仪表盘页面
 * 显示系统概览和关键指标
 */
export function Dashboard() {
  const {
    deviceConfigs,
    deviceStates,
    connectionStatus,
    systemStatus,
    isLoading,
    setIsLoading,
    setError,
    getOnlineDevices,
    getOfflineDevices
  } = useDeviceStore();

  // TODO: 任务相关功能待重新实现
  const executions: any[] = [];
  const getRunningExecutions = () => [];
  const getCompletedExecutions = () => [];

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    setIsLoading(true);
    try {
      // 测试连接
      const isConnected = await apiService.testConnection();
      if (!isConnected) {
        throw new Error('无法连接到后端服务');
      }

      // 连接WebSocket (如果还没连接)
      if (!websocketService.isConnected()) {
        await websocketService.connect();
      }

      // 获取初始数据
      await Promise.all([
        loadDeviceData(),
        loadSystemStatus()
      ]);
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      setError(error instanceof Error ? error.message : '初始化失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeviceData = async () => {
    try {
      const [configs, states] = await Promise.all([
        apiService.getDeviceConfigs(),
        apiService.getDeviceStates()
      ]);
      
      useDeviceStore.getState().setDeviceConfigs(configs);
      useDeviceStore.getState().setDeviceStates(states);
    } catch (error) {
      console.error('Failed to load device data:', error);
      throw error;
    }
  };

  const loadSystemStatus = async () => {
    try {
      const status = await apiService.getSystemStatus();
      useDeviceStore.getState().setSystemStatus(status);
    } catch (error) {
      console.error('Failed to load system status:', error);
      throw error;
    }
  };

  const onlineDevices = getOnlineDevices();
  const offlineDevices = getOfflineDevices();
  const runningExecutions = getRunningExecutions();
  const completedExecutions = getCompletedExecutions();

  const stats = [
    {
      name: '在线设备',
      value: onlineDevices.length,
      total: deviceConfigs.length,
      icon: CpuChipIcon,
      color: 'green'
    },
    {
      name: '离线设备',
      value: offlineDevices.length,
      total: deviceConfigs.length,
      icon: ExclamationTriangleIcon,
      color: 'red'
    },
    {
      name: '运行中任务',
      value: runningExecutions.length,
      total: executions.length,
      icon: PlayIcon,
      color: 'blue'
    },
    {
      name: '已完成任务',
      value: completedExecutions.length,
      total: executions.length,
      icon: StopIcon,
      color: 'gray'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="mt-1 text-sm text-gray-500">
          系统概览和关键指标
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className={`text-2xl font-semibold text-${stat.color}-600`}>
                        {stat.value}
                      </div>
                      {stat.total > 0 && (
                        <div className="ml-2 text-sm text-gray-500">
                          / {stat.total}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 系统状态 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white shadow rounded-lg"
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              系统状态
            </h3>
            <div className="space-y-4">
              {/* 连接状态 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <WifiIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">网络连接</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  connectionStatus.isConnected
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus.isConnected ? '已连接' : '未连接'}
                </span>
              </div>

              {/* 后端状态 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CpuChipIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">后端服务</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  systemStatus.backend.isRunning
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {systemStatus.backend.isRunning ? '运行中' : '已停止'}
                </span>
              </div>

              {/* Arduino状态 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CpuChipIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Arduino</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  systemStatus.arduino.isConnected
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {systemStatus.arduino.isConnected ? '已连接' : '未连接'}
                </span>
              </div>

              {/* 运行时间 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">运行时间</span>
                </div>
                <span className="text-sm text-gray-500">
                  {Math.floor(systemStatus.backend.uptime / 3600)}h {Math.floor((systemStatus.backend.uptime % 3600) / 60)}m
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 设备概览 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white shadow rounded-lg"
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              设备概览
            </h3>
            <div className="space-y-3">
              {deviceConfigs.length === 0 ? (
                <p className="text-sm text-gray-500">暂无设备配置</p>
              ) : (
                deviceConfigs.map((config) => {
                  const state = deviceStates.find(s => s.deviceId === config.id);
                  return (
                    <div key={config.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{config.name}</p>
                        <p className="text-xs text-gray-500">{config.type === 'pump' ? '泵' : '阀'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          state?.isOnline
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {state?.isOnline ? '在线' : '离线'}
                        </span>
                        {state?.isOnline && (
                          <span className="text-xs text-gray-500">
                            {config.type === 'pump' 
                              ? `${state.currentValue}%`
                              : state.currentValue ? '开' : '关'
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
