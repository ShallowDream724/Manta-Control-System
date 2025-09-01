import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

/**
 * 系统日志页面
 * 显示和管理系统日志
 */
export function SystemLogs() {
  const [selectedLogType, setSelectedLogType] = useState<'backend' | 'frontend' | 'arduino'>('backend');
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevel, setLogLevel] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [selectedLogType, logLevel]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // TODO: 实现日志加载
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模拟日志数据
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: Date.now() - 1000,
          level: 'info',
          source: selectedLogType,
          message: `${selectedLogType} service started successfully`,
          details: 'Service initialization completed'
        },
        {
          id: '2',
          timestamp: Date.now() - 2000,
          level: 'warning',
          source: selectedLogType,
          message: 'Connection timeout detected',
          details: 'Retrying connection in 5 seconds'
        },
        {
          id: '3',
          timestamp: Date.now() - 3000,
          level: 'error',
          source: selectedLogType,
          message: 'Failed to connect to device',
          details: 'Device not responding on port 8080'
        }
      ];
      
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    return matchesSearch && matchesLevel;
  });

  const handleExportLogs = () => {
    // TODO: 实现日志导出
    console.log('Export logs');
  };

  const handleClearLogs = () => {
    if (confirm('确定要清空当前日志吗？')) {
      setLogs([]);
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const logTypes = [
    { key: 'backend' as const, name: '后端日志', icon: DocumentTextIcon },
    { key: 'frontend' as const, name: '前端日志', icon: DocumentTextIcon },
    { key: 'arduino' as const, name: 'Arduino日志', icon: DocumentTextIcon }
  ];

  const logLevels = [
    { key: 'all' as const, name: '全部' },
    { key: 'info' as const, name: '信息' },
    { key: 'warning' as const, name: '警告' },
    { key: 'error' as const, name: '错误' }
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统日志</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看和管理系统运行日志
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleClearLogs}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            清空日志
          </button>
          <button
            onClick={handleExportLogs}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            导出日志
          </button>
        </div>
      </div>

      {/* 日志类型选择 */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {logTypes.map((type) => (
              <button
                key={type.key}
                onClick={() => setSelectedLogType(type.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedLogType === type.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <type.icon className="h-5 w-5 mr-2" />
                  {type.name}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* 过滤器 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            {/* 搜索 */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="搜索日志..."
                />
              </div>
            </div>

            {/* 日志级别过滤 */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value as any)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                {logLevels.map((level) => (
                  <option key={level.key} value={level.key}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无日志</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? '没有找到匹配的日志记录' : '当前没有日志记录'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-900 font-medium">
                      {log.message}
                    </p>
                    {log.details && (
                      <p className="mt-1 text-sm text-gray-600">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  source: 'backend' | 'frontend' | 'arduino';
  message: string;
  details?: string;
}
