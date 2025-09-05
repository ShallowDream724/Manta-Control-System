// 移除useState，所有状态由Hook管理
import { motion, AnimatePresence } from 'framer-motion';
import {
  CodeBracketIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useCodeGeneration } from '../../hooks/useCodeGeneration';
import type { DeviceConfig } from '../../types';

interface ArduinoCodeGeneratorProps {
  devices: DeviceConfig[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Arduino代码生成器组件
 * 单一职责：UI展示和用户交互
 */
export default function ArduinoCodeGenerator({ devices, isOpen, onClose }: ArduinoCodeGeneratorProps) {
  const {
    isGenerating,
    generatedCode,
    metadata,
    validation,
    error,
    isCopied,
    hasCode,
    generateArduinoCode,
    copyCode,
    downloadCode,
    validateConfig,
    reset
  } = useCodeGeneration();

  // 生成代码
  const handleGenerate = async () => {
    try {
      await generateArduinoCode(devices);
    } catch (err) {
      console.error('代码生成失败:', err);
    }
  };

  // 所有操作都通过Hook处理，组件只负责调用

  // 关闭时重置
  const handleClose = () => {
    reset();
    onClose();
  };

  // 验证配置
  const currentValidation = validation || validateConfig(devices);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* 头部 */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CodeBracketIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Arduino代码生成器</h2>
                  <p className="text-sm text-gray-600">根据当前设备配置自动生成Arduino代码</p>
                </div>
              </div>
              
              <motion.button
                onClick={handleClose}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </motion.button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* 配置验证 */}
              {(currentValidation.errors.length > 0 || currentValidation.warnings.length > 0) && (
                <div className="space-y-2">
                  {currentValidation.errors.map((error: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-red-600 text-sm">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {currentValidation.warnings.map((warning: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-yellow-600 text-sm">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 设备配置预览 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">当前配置预览</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">板型:</span> Arduino UNO R4 WiFi
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">WiFi:</span> FishControl_WiFi / fish2025
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">设备数量:</span> {devices.length}
                  </div>
                  <div className="space-y-1">
                    {devices.map(device => (
                      <div key={device.id} className="text-xs text-gray-600 ml-4">
                        • {device.name} ({device.id}): 引脚{device.pin} {device.type.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 错误显示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-800">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">生成失败</span>
                  </div>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

              {/* 生成按钮 */}
              {!hasCode && (
                <motion.button
                  onClick={handleGenerate}
                  disabled={!currentValidation.isValid || isGenerating}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors ${
                    !currentValidation.isValid || isGenerating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <CodeBracketIcon className="w-5 h-5" />
                  <span>{isGenerating ? '生成中...' : '生成Arduino代码'}</span>
                </motion.button>
              )}

              {/* 生成的代码 */}
              {hasCode && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">生成的代码</h3>
                    <div className="flex space-x-2">
                      <motion.button
                        onClick={copyCode}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center space-x-1 px-3 py-1 text-sm rounded transition-colors ${
                          isCopied
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={isCopied ? '代码已复制到剪贴板' : '复制Arduino代码到剪贴板'}
                      >
                        {isCopied ? (
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        )}
                        <span>{isCopied ? '已复制' : '复制代码'}</span>
                      </motion.button>

                      <motion.button
                        onClick={() => downloadCode('FishControl_Generated.ino')}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        <span>下载</span>
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                      {generatedCode}
                    </pre>
                  </div>

                  {/* 元数据显示 */}
                  {metadata && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">代码信息</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                        <div>设备总数: {metadata.deviceCount}</div>
                        <div>PWM设备: {metadata.pwmDevices}</div>
                        <div>数字设备: {metadata.digitalDevices}</div>
                        <div>使用引脚: {metadata.usedPins?.join(', ')}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">使用说明</h4>
                    <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                      <li>在Arduino IDE中安装 <code className="bg-green-100 px-1 rounded">ArduinoJson</code> 库</li>
                      <li>选择开发板：Arduino UNO R4 WiFi</li>
                      <li>将生成的代码复制到Arduino IDE中</li>
                      <li>烧录到Arduino板</li>
                      <li>打开串口监视器查看运行状态</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <motion.button
                onClick={handleClose}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </motion.button>
              
              {hasCode && (
                <motion.button
                  onClick={() => {
                    reset();
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重新生成
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
