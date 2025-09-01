import { useCallback } from 'react';
import { apiService } from '../services/apiService';

interface UseDeviceImportExportReturn {
  exportConfigs: () => Promise<void>;
  importConfigs: (event: React.ChangeEvent<HTMLInputElement>) => Promise<{ success: boolean; message: string }>;
}

export function useDeviceImportExport(onImportSuccess?: () => void): UseDeviceImportExportReturn {
  const exportConfigs = useCallback(async () => {
    try {
      const response = await fetch(`${apiService.getBaseUrl()}/api/device-configs/export`);
      
      if (!response.ok) {
        throw new Error(`导出失败: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-configs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export configs:', error);
      throw new Error('导出失败，请检查网络连接');
    }
  }, []);

  const importConfigs = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return { success: false, message: '未选择文件' };
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // 验证导入数据格式
      if (!importData.deviceConfigs || !Array.isArray(importData.deviceConfigs)) {
        throw new Error('无效的配置文件格式');
      }

      const response = await apiService.importDeviceConfigs(importData.deviceConfigs);
      
      if (response.success) {
        onImportSuccess?.();
        return { 
          success: true, 
          message: `成功导入 ${response.imported} 个设备配置` 
        };
      } else {
        return { 
          success: false, 
          message: '导入失败：' + response.errors.join(', ') 
        };
      }
    } catch (error) {
      console.error('Failed to import configs:', error);
      return { 
        success: false, 
        message: '导入失败：' + (error instanceof Error ? error.message : '未知错误') 
      };
    } finally {
      // 清空文件输入
      event.target.value = '';
    }
  }, [onImportSuccess]);

  return {
    exportConfigs,
    importConfigs
  };
}
