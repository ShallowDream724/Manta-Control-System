import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, PlayIcon, StopIcon, ArrowUpTrayIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useResponsive } from '../../hooks/useResponsive';
import { useTaskExecution } from '../../hooks/useTaskExecution';
import { useNewLogDetection } from '../../hooks/useNewLogDetection';
import type { DeviceConfig, DeviceGroup } from '../../types';
import { DEFAULT_DEVICES, DEFAULT_DEVICE_GROUPS } from '../../types';
import type { Task, Step } from '../../types/task-orchestrator';
import { generateId } from '../../utils/task-orchestrator';
import StepContainer from './containers/StepContainer';
import TaskPreview from './items/TaskPreview';
import { DropdownProvider } from './shared/DropdownContext';
import ConfigImportExport from '../config/ConfigImportExport';

/**
 * 任务编排器主编辑器
 * 支持步骤、动作、循环、延时的可视化编辑
 * 统一使用桌面端界面组件
 */
export default function TaskEditor() {
  return (
    <DropdownProvider>
      <TaskEditorCore />
    </DropdownProvider>
  );
}

/**
 * 任务编辑器核心组件
 */
function TaskEditorCore() {
  const { isMobile } = useResponsive();
  const {
    isExecuting,
    error: executionError,
    startTask: startTaskExecution,
    stopTask: stopTaskExecution,
    clearError,
    progress
  } = useTaskExecution();

  const { setTaskExecutionStatus } = useNewLogDetection();

  const [devices, setDevices] = useState<DeviceConfig[]>(DEFAULT_DEVICES);
  const [groups, setGroups] = useState<DeviceGroup[]>(DEFAULT_DEVICE_GROUPS);
  const [currentTask, setCurrentTask] = useState<Task>(() => ({
    id: generateId(),
    name: '新任务',
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  // 处理任务导入
  const handleImportTask = (taskJson: string) => {
    try {
      const parsed = JSON.parse(taskJson);
      // 简单验证
      if (parsed.id && parsed.name && Array.isArray(parsed.steps)) {
        setCurrentTask({
          ...parsed,
          updatedAt: Date.now()
        });
      } else {
        throw new Error('任务格式不正确');
      }
    } catch (error) {
      throw new Error('导入失败，请检查任务格式');
    }
  };

  // 处理任务导出
  const handleExportTask = () => {
    return JSON.stringify(currentTask, null, 2);
  };

  // 从本地存储加载设备配置
  useEffect(() => {
    const loadDeviceConfig = () => {
      const savedConfig = localStorage.getItem('fish_control_device_config');
      if (savedConfig) {
        try {
          const configData = JSON.parse(savedConfig);
          if (configData.devices && Array.isArray(configData.devices)) {
            setDevices(configData.devices);
          }
        if (configData.groups && Array.isArray(configData.groups)) {
          setGroups(configData.groups);
        }
        } catch (error) {
          console.error('Failed to load device configs:', error);
        }
      }
    };

    // 初始加载
    loadDeviceConfig();

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fish_control_device_config') {
        loadDeviceConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 添加新步骤
  const addStep = () => {
    const newStep: Step = {
      id: generateId(),
      name: `步骤 ${currentTask.steps.length + 1}`,
      actions: [],
      parallelLoops: []
    };

    setCurrentTask(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: Date.now()
    }));
  };

  // 更新步骤
  const updateStep = (stepId: string, updatedStep: Step) => {
    setCurrentTask(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? updatedStep : step
      ),
      updatedAt: Date.now()
    }));
  };

  // 删除步骤
  const deleteStep = (stepId: string) => {
    setCurrentTask(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
      updatedAt: Date.now()
    }));
  };

  // 执行任务
  const executeTask = async () => {
    if (currentTask.steps.length === 0) {
      alert('请先添加步骤');
      return;
    }

    try {
      setTaskExecutionStatus(true); // 通知开始执行
      const success = await startTaskExecution(currentTask);
      if (!success && executionError) {
        alert(`任务启动失败: ${executionError}`);
        setTaskExecutionStatus(false); // 执行失败，停止监控
      }
    } catch (error) {
      console.error('执行任务失败:', error);
      alert('任务启动失败，请检查网络连接');
      setTaskExecutionStatus(false); // 执行失败，停止监控
    }
  };

  // 停止任务
  const stopTask = async () => {
    try {
      const success = await stopTaskExecution();
      setTaskExecutionStatus(false); // 通知停止执行
      if (!success && executionError) {
        alert(`任务停止失败: ${executionError}`);
      }
    } catch (error) {
      console.error('停止任务失败:', error);
      alert('任务停止失败，请检查网络连接');
      setTaskExecutionStatus(false); // 确保停止监控
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* 错误提示 */}
      {executionError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{executionError}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 头部工具栏 */}
      {isMobile ? (
        /* 移动端布局 */
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <input
                type="text"
                value={currentTask.name}
                onChange={(e) => setCurrentTask(prev => ({
                  ...prev,
                  name: e.target.value,
                  updatedAt: Date.now()
                }))}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex-1 min-w-0"
                placeholder="任务名称"
              />

              <div className="text-sm text-gray-500 whitespace-nowrap">
                {currentTask.steps.length} 个步骤
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-2">
              {/* 导入导出按钮 */}
              <motion.button
                onClick={() => setShowImportExport(!showImportExport)}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="导入导出"
              >
                <ArrowUpTrayIcon className="w-5 h-5" />
              </motion.button>

              {/* 预览按钮 */}
              <motion.button
                onClick={() => setIsPreviewOpen(true)}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-colors ${
                  isPreviewOpen
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="预览"
              >
                <EyeIcon className="w-5 h-5" />
              </motion.button>

              {/* 执行/停止按钮 */}
              {isExecuting ? (
                <div className="flex items-center space-x-2">
                  {progress && (
                    <div className="text-xs text-gray-600">
                      命令: {progress.completed}/{progress.total} ({progress.percentage}%)
                    </div>
                  )}
                  <motion.button
                    onClick={stopTask}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <StopIcon className="w-4 h-4" />
                    <span className="text-sm">停止</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={executeTask}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={currentTask.steps.length === 0}
                >
                  <PlayIcon className="w-4 h-4" />
                  <span className="text-sm">执行</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 桌面端布局 - 优化版 */
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧：任务名称 + 步骤数 */}
            <div className="flex items-center">
              <div className="relative inline-flex items-center">
                <input
                  type="text"
                  value={currentTask.name}
                  onChange={(e) => setCurrentTask(prev => ({
                    ...prev,
                    name: e.target.value,
                    updatedAt: Date.now()
                  }))}
                  className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 pr-0"
                  placeholder="任务名称"
                />
                <div className="text-sm text-gray-500 whitespace-nowrap ml-2">
                  {currentTask.steps.length} 个步骤
                </div>
              </div>
            </div>

            {/* 右侧：所有按钮 */}
            <div className="flex items-center space-x-3">
              {/* 导入导出按钮 */}
              <motion.button
                onClick={() => setShowImportExport(!showImportExport)}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span className="text-sm">导入导出</span>
              </motion.button>

              {/* 预览按钮 - 加上绿色 */}
              <motion.button
                onClick={() => setIsPreviewOpen(true)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isPreviewOpen
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'text-green-700 bg-green-50 hover:bg-green-100 border border-green-200'
                }`}
              >
                <EyeIcon className="w-4 h-4" />
                <span className="text-sm">预览</span>
              </motion.button>

              {/* 执行按钮 */}
              {isExecuting ? (
                <div className="flex items-center space-x-3">
                  {progress && (
                    <div className="text-sm text-gray-600">
                      执行进度: {progress.completed}/{progress.total} 条命令 ({progress.percentage}%)
                    </div>
                  )}
                  <motion.button
                    onClick={stopTask}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <StopIcon className="w-4 h-4" />
                    <span>停止</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={executeTask}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={currentTask.steps.length === 0}
                >
                  <PlayIcon className="w-4 h-4" />
                  <span>执行</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 任务导入导出组件 */}
      <AnimatePresence>
        {showImportExport && (
          <ConfigImportExport
            onImport={handleImportTask}
            onExport={handleExportTask}
            onClose={() => setShowImportExport(false)}
          />
        )}
      </AnimatePresence>

      {/* 主编辑区域 */}
      <div className="p-4">
        <div className="w-full space-y-4">
          {/* 步骤列表 */}
          {currentTask.steps.map((step, index) => (
            <StepContainer
              key={step.id}
              step={step}
              stepIndex={index}
              devices={devices}
              groups={groups}
              onUpdate={(updatedStep) => updateStep(step.id, updatedStep)}
              onDelete={() => deleteStep(step.id)}
            />
          ))}

          {/* 添加步骤按钮 */}
          <motion.button
            onClick={addStep}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center space-x-2 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors group"
          >
            <PlusIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
            <span className="text-gray-500 group-hover:text-gray-700">
              点击添加新步骤
            </span>
          </motion.button>

          {/* 空状态提示 */}
          {currentTask.steps.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">开始创建任务</h3>
              <p className="text-gray-500 mb-6">添加步骤来编排你的仿生蝠鲼控制序列</p>
              <motion.button
                onClick={addStep}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>添加第一个步骤</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* 任务预览模态框 */}
      <AnimatePresence>
        {isPreviewOpen && (
          <TaskPreview
            task={currentTask}
            devices={devices}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
