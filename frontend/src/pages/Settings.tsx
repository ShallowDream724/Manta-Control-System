import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CogIcon,
  WifiIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

/**
 * 设置页面
 * 系统配置和偏好设置
 */
export function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'connection' | 'notifications' | 'security' | 'backup'>('general');
  const [settings, setSettings] = useState({
    general: {
      language: 'zh-CN',
      theme: 'light',
      autoRefresh: true,
      refreshInterval: 5000
    },
    connection: {
      serverUrl: 'http://localhost:9000',
      timeout: 10000,
      retryAttempts: 3,
      autoReconnect: true
    },
    notifications: {
      deviceOffline: true,
      taskComplete: true,
      systemError: true,
      soundEnabled: false
    },
    security: {
      sessionTimeout: 30,
      requireConfirmation: true,
      logLevel: 'info'
    }
  });

  const handleSettingChange = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    // TODO: 保存设置到本地存储或服务器
    console.log('Saving settings:', settings);
    alert('设置已保存');
  };

  const handleResetSettings = () => {
    if (confirm('确定要重置所有设置吗？')) {
      // TODO: 重置设置
      console.log('Reset settings');
    }
  };

  const handleExportSettings = () => {
    // TODO: 导出设置
    console.log('Export settings');
  };

  const handleImportSettings = () => {
    // TODO: 导入设置
    console.log('Import settings');
  };

  const tabs = [
    { key: 'general' as const, name: '常规', icon: CogIcon },
    { key: 'connection' as const, name: '连接', icon: WifiIcon },
    { key: 'notifications' as const, name: '通知', icon: BellIcon },
    { key: 'security' as const, name: '安全', icon: ShieldCheckIcon },
    { key: 'backup' as const, name: '备份', icon: DocumentArrowDownIcon }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="mt-1 text-sm text-gray-500">
          配置系统参数和个人偏好
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="p-6">
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium text-gray-900">常规设置</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">语言</label>
                  <select
                    value={settings.general.language}
                    onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="zh-CN">中文（简体）</option>
                    <option value="en-US">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">主题</label>
                  <select
                    value={settings.general.theme}
                    onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="auto">跟随系统</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">刷新间隔（毫秒）</label>
                  <input
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    value={settings.general.refreshInterval}
                    onChange={(e) => handleSettingChange('general', 'refreshInterval', parseInt(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.general.autoRefresh}
                    onChange={(e) => handleSettingChange('general', 'autoRefresh', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    自动刷新数据
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'connection' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium text-gray-900">连接设置</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">服务器地址</label>
                  <input
                    type="url"
                    value={settings.connection.serverUrl}
                    onChange={(e) => handleSettingChange('connection', 'serverUrl', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="http://localhost:9000"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">连接超时（毫秒）</label>
                    <input
                      type="number"
                      min="1000"
                      max="60000"
                      value={settings.connection.timeout}
                      onChange={(e) => handleSettingChange('connection', 'timeout', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">重试次数</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={settings.connection.retryAttempts}
                      onChange={(e) => handleSettingChange('connection', 'retryAttempts', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.connection.autoReconnect}
                    onChange={(e) => handleSettingChange('connection', 'autoReconnect', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    自动重连
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium text-gray-900">通知设置</h3>
              
              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      {key === 'deviceOffline' && '设备离线通知'}
                      {key === 'taskComplete' && '任务完成通知'}
                      {key === 'systemError' && '系统错误通知'}
                      {key === 'soundEnabled' && '启用声音提示'}
                    </label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium text-gray-900">安全设置</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">会话超时（分钟）</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">日志级别</label>
                  <select
                    value={settings.security.logLevel}
                    onChange={(e) => handleSettingChange('security', 'logLevel', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="debug">调试</option>
                    <option value="info">信息</option>
                    <option value="warning">警告</option>
                    <option value="error">错误</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.security.requireConfirmation}
                  onChange={(e) => handleSettingChange('security', 'requireConfirmation', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  危险操作需要确认
                </label>
              </div>
            </motion.div>
          )}

          {activeTab === 'backup' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium text-gray-900">备份与恢复</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">导出设置</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    将当前设置导出为JSON文件，可用于备份或迁移到其他设备。
                  </p>
                  <button
                    onClick={handleExportSettings}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    导出设置
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">导入设置</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    从JSON文件导入设置，将覆盖当前所有设置。
                  </p>
                  <button
                    onClick={handleImportSettings}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    导入设置
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleResetSettings}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            重置设置
          </button>
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
