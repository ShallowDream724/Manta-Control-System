import { useState, useCallback } from 'react';
import { codeGenerationService } from '../services/CodeGenerationService';
import type { ValidationResult } from '../types/codeGeneration';
import type { DeviceConfig } from '../types';

/**
 * 代码生成Hook - 统一管理所有代码生成逻辑
 * 单一职责：状态管理 + 业务逻辑协调
 */
export function useCodeGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [metadata, setMetadata] = useState<any>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  /**
   * 生成Arduino代码
   */
  const generateArduinoCode = useCallback(async (devices: DeviceConfig[]) => {
    setIsGenerating(true);
    setError(null);

    try {
      // 先验证配置
      const validationResult = validateConfig(devices);

      if (!validationResult.isValid) {
        throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 生成代码
      const response = await codeGenerationService.generateArduinoCode(devices);
      
      if (response.success && response.data) {
        setGeneratedCode(response.data.code);
        setMetadata(response.data.metadata);
        return response.data;
      } else {
        throw new Error(response.error || '代码生成失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * 复制代码到剪贴板
   */
  const copyCode = useCallback(async (): Promise<boolean> => {
    if (!generatedCode) {
      console.warn('没有可复制的代码');
      return false;
    }

    try {
      const success = await codeGenerationService.copyToClipboard(generatedCode);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000); // 延长显示时间到3秒
        console.log('代码已复制到剪贴板');
      } else {
        console.log('复制失败，已显示手动复制对话框');
        // 即使自动复制失败，也显示"已复制"状态，因为用户可以手动复制
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      }
      return success;
    } catch (error) {
      console.error('复制过程中发生错误:', error);
      // 显示手动复制对话框
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      return false;
    }
  }, [generatedCode]);

  /**
   * 下载代码文件
   */
  const downloadCode = useCallback((filename?: string) => {
    if (!generatedCode) return;
    codeGenerationService.downloadCode(generatedCode, filename);
  }, [generatedCode]);

  /**
   * 验证设备配置 - Hook中统一实现
   */
  const validateConfig = useCallback((devices: DeviceConfig[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (devices.length === 0) {
      errors.push('至少需要配置一个设备');
    }

    // 检查引脚冲突
    const usedPins = new Set<number>();
    devices.forEach(device => {
      if (usedPins.has(device.pin)) {
        errors.push(`引脚 ${device.pin} 被多个设备使用`);
      }
      usedPins.add(device.pin);
    });

    // 检查UNO R4 WiFi的PWM引脚
    const validPWMPins = [3, 5, 6, 9, 10, 11];
    devices.forEach(device => {
      if (device.type === 'pwm' && !validPWMPins.includes(device.pin)) {
        warnings.push(`引脚 ${device.pin} 可能不支持PWM (${device.name})`);
      }
    });

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setValidation(result);
    return result;
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setGeneratedCode('');
    setMetadata(null);
    setValidation(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    // 状态
    isGenerating,
    generatedCode,
    metadata,
    validation,
    error,
    isCopied,
    hasCode: !!generatedCode,

    // 操作
    generateArduinoCode,
    copyCode,
    downloadCode,
    validateConfig,
    reset
  };
}

export default useCodeGeneration;
