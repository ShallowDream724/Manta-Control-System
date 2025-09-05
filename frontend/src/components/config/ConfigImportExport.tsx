import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  DocumentArrowUpIcon, 
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface ConfigImportExportProps {
  onImport: (configJson: string) => void;
  onExport: () => string;
  onClose: () => void;
}

/**
 * 配置导入导出组件
 * 支持JSON格式的配置文件导入导出
 */
export default function ConfigImportExport({ 
  onImport, 
  onExport, 
  onClose, 
}: ConfigImportExportProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');

  // 处理导出
  const handleExport = () => {
    try {
      const configJson = onExport();
      setExportText(configJson);
      setActiveTab('export');
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 处理导入
  const handleImport = () => {
    try {
      setImportError('');
      onImport(importText);
      onClose();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败');
    }
  };

  // 复制到剪贴板 - 兼容多种环境
  const handleCopy = async () => {
    try {
      // 方法1: 现代浏览器的Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(exportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      }

      // 方法2: 传统的execCommand方法（兼容性更好）
      const textArea = document.createElement('textarea');
      textArea.value = exportText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      }

      // 方法3: 如果都失败，显示手动复制对话框
      showManualCopyDialog();

    } catch (error) {
      console.error('复制失败:', error);
      showManualCopyDialog();
    }
  };

  // 显示手动复制对话框
  const showManualCopyDialog = () => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 80%;
      overflow: auto;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 15px 0;">请手动复制任务配置</h3>
      <p style="margin: 0 0 15px 0; color: #666;">自动复制失败，请手动选择并复制以下内容：</p>
      <textarea readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 12px; border: 1px solid #ccc; padding: 10px;">${exportText}</textarea>
      <div style="margin-top: 15px; text-align: right;">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // 自动选中文本
    const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement;
    textarea.select();
    textarea.focus();

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // 显示复制状态
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // 下载配置文件
  const handleDownload = () => {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fish-control-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-white rounded-xl shadow-xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden
          max-w-2xl flex flex-col
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            配置管理
          </h2>
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`
              flex-1 px-6 py-3 text-sm font-medium transition-colors
              ${activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <DocumentArrowUpIcon className="w-4 h-4 inline mr-2" />
            导入配置
          </button>
          <button
            onClick={() => {
              setActiveTab('export');
              handleExport();
            }}
            className={`
              flex-1 px-6 py-3 text-sm font-medium transition-colors
              ${activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <DocumentArrowDownIcon className="w-4 h-4 inline mr-2" />
            导出配置
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0">
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择配置文件
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="text-center text-gray-500">或</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  粘贴配置JSON
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-24 sm:h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                  placeholder="请粘贴配置JSON内容..."
                />
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>注意:</strong> 导入配置将覆盖当前所有设备配置，请确保备份重要数据。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配置JSON内容
                </label>
                <div className="relative">
                  <textarea
                    value={exportText}
                    readOnly
                    className="w-full h-24 sm:h-32 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
                  />
                  <motion.button
                    onClick={handleCopy}
                    whileTap={{ scale: 0.95 }}
                    className={`absolute top-2 right-2 p-2 rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                    title={copied ? '任务配置已复制到剪贴板' : '复制任务配置到剪贴板'}
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
                    )}
                  </motion.button>
                </div>
              </div>

              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-3"
                >
                  <p className="text-sm text-green-700">✓ 已复制到剪贴板</p>
                </motion.div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  你可以复制上述JSON内容，或点击下载按钮保存为文件。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="px-3 sm:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
          >
            取消
          </motion.button>

          {activeTab === 'import' && (
            <motion.button
              onClick={handleImport}
              whileTap={{ scale: 0.95 }}
              disabled={!importText.trim()}
              className={`
                px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base
                ${importText.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              导入配置
            </motion.button>
          )}

          {activeTab === 'export' && (
            <motion.button
              onClick={handleDownload}
              whileTap={{ scale: 0.95 }}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              下载文件
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
