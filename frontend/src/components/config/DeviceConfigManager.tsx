import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';

import type { DeviceConfig, DeviceGroup } from '../../types';
import { DEFAULT_DEVICES, DEFAULT_DEVICE_GROUPS } from '../../types';
import {
  validateDeviceConfig,
  exportDeviceConfig,
  importDeviceConfig,
  resetToDefaultConfig
} from '../../utils/deviceConfig';
import DeviceConfigCard from './DeviceConfigCard';
import DeviceConfigForm from './DeviceConfigForm';
import ConfigImportExport from './ConfigImportExport';
import DeviceGroupManager from './DeviceGroupManager';
import ArduinoCodeGenerator from './ArduinoCodeGenerator';

/**
 * 设备配置管理主界面
 * 支持设备配置的增删改查、导入导出、验证等功能
 */
export default function DeviceConfigManager() {
  const { isMobile, isTablet } = useResponsive();
  const [devices, setDevices] = useState<DeviceConfig[]>(DEFAULT_DEVICES);
  const [groups, setGroups] = useState<DeviceGroup[]>(DEFAULT_DEVICE_GROUPS);
  const [editingDevice, setEditingDevice] = useState<DeviceConfig | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [validationResult, setValidationResult] = useState(validateDeviceConfig(DEFAULT_DEVICES));

  // 实时验证配置
  useEffect(() => {
    const result = validateDeviceConfig(devices);
    setValidationResult(result);
  }, [devices]);

  // 保存配置到本地存储
  const saveConfig = (devicesData?: DeviceConfig[], groupsData?: DeviceGroup[]) => {
    try {
      const configData = {
        devices: devicesData || devices,
        groups: groupsData || groups,
        version: '1.0',
        timestamp: Date.now()
      };
      const configJson = JSON.stringify(configData, null, 2);
      localStorage.setItem('fish_control_device_config', configJson);
      console.log('配置保存成功:', configData);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  // 加载配置从本地存储
  const loadConfig = () => {
    try {
      const configJson = localStorage.getItem('fish_control_device_config');
      if (configJson) {
        const configData = JSON.parse(configJson);
        if (configData.devices && Array.isArray(configData.devices)) {
          setDevices(configData.devices);
        }
        if (configData.groups && Array.isArray(configData.groups)) {
          setGroups(configData.groups);
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      // 加载失败时使用默认配置
      setDevices(DEFAULT_DEVICES);
      setGroups(DEFAULT_DEVICE_GROUPS);
    }
  };

  // 重置为默认配置
  const handleResetToDefault = () => {
    const defaultDevices = resetToDefaultConfig();
    const defaultGroups = DEFAULT_DEVICE_GROUPS;
    setDevices(defaultDevices);
    setGroups(defaultGroups);
    // 立即保存最新数据（设备 + 分组）
    setTimeout(() => saveConfig(defaultDevices, defaultGroups), 0);
  };

  // 添加新设备
  const handleAddDevice = () => {
    const newDevice: DeviceConfig = {
      id: `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: '新设备',
      type: 'digital',
      pin: getNextAvailablePin(),
      icon: 'cog',
      groupId: groups.length > 0 ? groups[0].id : undefined
    };
    setEditingDevice(newDevice);
  };

  // 获取下一个可用引脚
  const getNextAvailablePin = (): number => {
    const usedPins = devices.map(d => d.pin);
    for (let pin = 2; pin <= 50; pin++) {
      if (!usedPins.includes(pin)) {
        return pin;
      }
    }
    return 2; // 默认返回2
  };

  // 编辑设备
  const handleEditDevice = (device: DeviceConfig) => {
    setEditingDevice(device);
  };

  // 更新设备配置
  const handleUpdateDevice = (updatedDevice: DeviceConfig) => {
    setDevices(prev => {
      const existingIndex = prev.findIndex(device => device.id === updatedDevice.id);
      let newDevices;
      if (existingIndex >= 0) {
        // 更新现有设备
        newDevices = prev.map(device =>
          device.id === updatedDevice.id ? updatedDevice : device
        );
      } else {
        // 添加新设备
        newDevices = [...prev, updatedDevice];
      }
      // 立即保存最新数据
      setTimeout(() => saveConfig(newDevices, groups), 0);
      return newDevices;
    });
    setEditingDevice(null);
  };

  // 删除设备
  const handleDeleteDevice = (deviceId: string) => {
    setDevices(prev => {
      const newDevices = prev.filter(device => device.id !== deviceId);
      // 立即保存最新数据
      setTimeout(() => saveConfig(newDevices, groups), 0);
      return newDevices;
    });
  };

  // 导入配置
  const handleImportConfig = (configJson: string) => {
    try {
      const importedDevices = importDeviceConfig(configJson);
      setDevices(importedDevices);
      // 立即保存最新数据
      setTimeout(() => saveConfig(importedDevices, groups), 0);
      setShowImportExport(false);
      // TODO: 显示成功提示
    } catch (error) {
      // TODO: 显示错误提示
      console.error('导入配置失败:', error);
    }
  };

  // 导出配置
  const handleExportConfig = () => {
    return exportDeviceConfig(devices);
  };

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备配置管理</h1>
          <p className="text-gray-600 mt-1">
            配置你的设备信息，支持导入导出和Arduino代码生成
          </p>
        </div>

        {/* 操作按钮 - 响应式布局 */}
        <div className="flex gap-2 justify-end flex-wrap">
          <motion.button
            onClick={handleAddDevice}
            whileTap={{ scale: 0.95 }}
            className={`
              py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors
              ${isMobile ? 'px-2 text-sm flex-1 min-w-0 max-w-24' : ''}
              ${isTablet ? 'px-3 text-sm flex-1 min-w-0 max-w-28' : ''}
              ${!isMobile && !isTablet ? 'px-4 max-w-32' : ''}
            `}
          >
            添加设备
          </motion.button>

          <motion.button
            onClick={() => setShowGroupManager(true)}
            whileTap={{ scale: 0.95 }}
            className={`
              py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors
              ${isMobile ? 'px-2 text-sm flex-1 min-w-0 max-w-24' : ''}
              ${isTablet ? 'px-3 text-sm flex-1 min-w-0 max-w-28' : ''}
              ${!isMobile && !isTablet ? 'px-4 max-w-32' : ''}
            `}
          >
            分组管理
          </motion.button>

          <motion.button
            onClick={() => setShowImportExport(true)}
            whileTap={{ scale: 0.95 }}
            className={`
              py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
              ${isMobile ? 'px-2 text-sm flex-1 min-w-0 max-w-24' : ''}
              ${isTablet ? 'px-3 text-sm flex-1 min-w-0 max-w-28' : ''}
              ${!isMobile && !isTablet ? 'px-4 max-w-32' : ''}
            `}
          >
            导入导出
          </motion.button>

          <motion.button
            onClick={() => setShowCodeGenerator(true)}
            whileTap={{ scale: 0.95 }}
            className={`
              py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors
              ${isMobile ? 'px-2 text-sm flex-1 min-w-0 max-w-24' : ''}
              ${isTablet ? 'px-3 text-sm flex-1 min-w-0 max-w-28' : ''}
              ${!isMobile && !isTablet ? 'px-4 max-w-32' : ''}
            `}
          >
            {isMobile ? '代码' : '生成代码'}
          </motion.button>

          <motion.button
            onClick={handleResetToDefault}
            whileTap={{ scale: 0.95 }}
            className={`
              py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors
              ${isMobile ? 'px-2 text-sm flex-1 min-w-0 max-w-24' : ''}
              ${isTablet ? 'px-3 text-sm flex-1 min-w-0 max-w-28' : ''}
              ${!isMobile && !isTablet ? 'px-4 max-w-32' : ''}
            `}
          >
            重置默认
          </motion.button>
        </div>
      </div>

      {/* 配置状态提示 */}
      {!validationResult.isValid && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <h3 className="font-medium text-red-900 mb-2">配置错误</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {validationResult.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {validationResult.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <h3 className="font-medium text-yellow-900 mb-2">配置警告</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {validationResult.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 设备配置网格 */}
      <div className={`
        grid gap-4
        ${isMobile ? 'grid-cols-1' : ''}
        ${isTablet ? 'grid-cols-2' : ''}
        ${!isMobile && !isTablet ? 'grid-cols-3' : ''}
      `}>
        {devices.map((device, index) => (
          <DeviceConfigCard
            key={device.id}
            device={device}
            groups={groups}
            index={index}
            onEdit={() => handleEditDevice(device)}
            onDelete={() => handleDeleteDevice(device.id)}
            validationResult={validationResult}
          />
        ))}
      </div>

      {/* 设备配置表单模态框 */}
      <AnimatePresence>
        {editingDevice && (
          <DeviceConfigForm
            device={editingDevice}
            devices={devices}
            groups={groups}
            onSave={handleUpdateDevice}
            onCancel={() => setEditingDevice(null)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* 分组管理模态框 */}
      <AnimatePresence>
        {showGroupManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">设备分组管理</h2>
                  <motion.button
                    onClick={() => setShowGroupManager(false)}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                <DeviceGroupManager
                  groups={groups}
                  devices={devices}
                  onGroupsChange={(newGroups) => {
                    setGroups(newGroups);
                    // 立即保存最新数据
                    setTimeout(() => saveConfig(devices, newGroups), 0);
                  }}
                  onDevicesChange={(newDevices) => {
                    setDevices(newDevices);
                    // 立即保存最新数据
                    setTimeout(() => saveConfig(newDevices, groups), 0);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 设备配置表单模态框 */}
      <AnimatePresence>
        {editingDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <DeviceConfigForm
              device={editingDevice}
              devices={devices}
              groups={groups}
              onSave={handleUpdateDevice}
              onCancel={() => setEditingDevice(null)}
              isMobile={isMobile}
            />
          </div>
        )}
      </AnimatePresence>

      {/* 导入导出模态框 */}
      <AnimatePresence>
        {showImportExport && (
          <ConfigImportExport
            onImport={handleImportConfig}
            onExport={handleExportConfig}
            onClose={() => setShowImportExport(false)}
          />
        )}
      </AnimatePresence>

      {/* Arduino代码生成器模态框 */}
      <ArduinoCodeGenerator
        devices={devices}
        isOpen={showCodeGenerator}
        onClose={() => setShowCodeGenerator(false)}
      />
    </div>
  );
}
