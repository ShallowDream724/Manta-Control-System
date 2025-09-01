import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDeviceStore } from '../store/deviceStore';
import { websocketService } from '../services/websocketService';
import type { DeviceCommand } from '../types/device';
import {
  PowerIcon,
  StopIcon,
  PlayIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

/**
 * 控制面板页面
 * 实时显示和控制所有设备
 */
export function ControlPanel() {
  const {
    deviceConfigs,
    deviceStates,
    connectionStatus,
    selectedDeviceId,
    setSelectedDeviceId,
    setError
  } = useDeviceStore();

  const [controlValues, setControlValues] = useState<Record<string, number | boolean>>({});
  const [timedActions, setTimedActions] = useState<Record<string, number>>({});

  useEffect(() => {
    // 初始化控制值
    const initialValues: Record<string, number | boolean> = {};
    deviceStates.forEach(state => {
      initialValues[state.deviceId] = state.currentValue;
    });
    setControlValues(initialValues);
  }, [deviceStates]);

  const handleDeviceControl = async (deviceId: string, action: string, value: number | boolean, duration?: number) => {
    if (!connectionStatus.isConnected) {
      setError('未连接到服务器');
      return;
    }

    try {
      const command: DeviceCommand = {
        deviceId,
        action: action as any,
        value,
        duration,
        timestamp: Date.now(),
        commandId: `cmd_${Date.now()}`
      };

      websocketService.sendDeviceCommand(command);
      
      // 乐观更新UI
      setControlValues(prev => ({
        ...prev,
        [deviceId]: value
      }));
    } catch (error) {
      console.error('Device control failed:', error);
      setError(error instanceof Error ? error.message : '设备控制失败');
    }
  };

  const handlePowerChange = (deviceId: string, power: number) => {
    setControlValues(prev => ({
      ...prev,
      [deviceId]: power
    }));
  };

  const handlePowerCommit = (deviceId: string) => {
    const power = controlValues[deviceId] as number;
    handleDeviceControl(deviceId, 'set_power', power);
  };

  const handleStateToggle = (deviceId: string) => {
    const currentState = controlValues[deviceId] as boolean;
    const newState = !currentState;
    handleDeviceControl(deviceId, 'set_state', newState);
  };

  const handleTimedAction = (deviceId: string) => {
    const duration = timedActions[deviceId] || 1000; // 默认1秒
    const config = deviceConfigs.find(c => c.id === deviceId);
    if (!config) return;

    const newValue = config.type === 'pump' ? 100 : true; // 泵设为100%，阀设为开

    handleDeviceControl(deviceId, 'timed_action', newValue, duration);
  };

  const handleStopAll = async () => {
    try {
      // 停止所有泵
      const pumpConfigs = deviceConfigs.filter(c => c.type === 'pump');
      for (const config of pumpConfigs) {
        await handleDeviceControl(config.id, 'set_power', 0);
      }

      // 关闭所有阀
      const valveConfigs = deviceConfigs.filter(c => c.type === 'valve');
      for (const config of valveConfigs) {
        await handleDeviceControl(config.id, 'set_state', false);
      }
    } catch (error) {
      console.error('Stop all failed:', error);
      setError('停止所有设备失败');
    }
  };

  const getDeviceState = (deviceId: string) => {
    return deviceStates.find(state => state.deviceId === deviceId);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">控制面板</h1>
          <p className="mt-1 text-sm text-gray-500">
            实时控制所有设备
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleStopAll}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <StopIcon className="h-4 w-4 mr-2" />
            停止所有
          </button>
          <button
            onClick={() => websocketService.requestDeviceStates()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            刷新状态
          </button>
        </div>
      </div>

      {/* 连接状态提示 */}
      {!connectionStatus.isConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                未连接到服务器，无法控制设备
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 设备控制卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deviceConfigs.map((config, index) => {
          const state = getDeviceState(config.id);
          const currentValue = controlValues[config.id] ?? state?.currentValue ?? 0;
          const isSelected = selectedDeviceId === config.id;

          return (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                isSelected ? 'border-blue-500' : 'border-transparent'
              } ${!state?.isOnline ? 'opacity-60' : ''}`}
              onClick={() => setSelectedDeviceId(config.id)}
            >
              <div className="p-6">
                {/* 设备标题 */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                    <p className="text-sm text-gray-500">
                      {config.type === 'pump' ? '泵' : '电磁阀'} - 引脚 {config.pin}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    state?.isOnline ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                </div>

                {/* 当前状态显示 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">当前状态:</span>
                    <span className={`font-medium ${
                      state?.isOnline ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {config.type === 'pump' 
                        ? `${state?.currentValue || 0}%`
                        : state?.currentValue ? '开启' : '关闭'
                      }
                    </span>
                  </div>
                  {state?.lastUpdate && (
                    <div className="text-xs text-gray-400 mt-1">
                      更新时间: {new Date(state.lastUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* 控制界面 */}
                {state?.isOnline && (
                  <div className="space-y-4">
                    {config.type === 'pump' ? (
                      // 泵控制
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          功率设置 ({currentValue}%)
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentValue as number}
                            onChange={(e) => handlePowerChange(config.id, parseInt(e.target.value))}
                            onMouseUp={() => handlePowerCommit(config.id)}
                            onTouchEnd={() => handlePowerCommit(config.id)}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <button
                            onClick={() => handleDeviceControl(config.id, 'set_power', 0)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="停止"
                          >
                            <StopIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 阀控制
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          开关控制
                        </label>
                        <button
                          onClick={() => handleStateToggle(config.id)}
                          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                            currentValue
                              ? 'text-white bg-green-600 hover:bg-green-700'
                              : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {currentValue ? (
                            <>
                              <PowerIcon className="h-4 w-4 mr-2" />
                              开启
                            </>
                          ) : (
                            <>
                              <StopIcon className="h-4 w-4 mr-2" />
                              关闭
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* 定时动作 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        定时动作
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0.1"
                          max="3600"
                          step="0.1"
                          value={(timedActions[config.id] || 1000) / 1000}
                          onChange={(e) => setTimedActions(prev => ({
                            ...prev,
                            [config.id]: parseFloat(e.target.value) * 1000
                          }))}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="秒"
                        />
                        <button
                          onClick={() => handleTimedAction(config.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {config.type === 'pump' ? '全功率运行指定时间' : '开启指定时间后自动关闭'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 离线状态 */}
                {!state?.isOnline && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">设备离线</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 无设备提示 */}
      {deviceConfigs.length === 0 && (
        <div className="text-center py-12">
          <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无设备</h3>
          <p className="mt-1 text-sm text-gray-500">
            请检查设备配置或连接状态
          </p>
        </div>
      )}
    </div>
  );
}
