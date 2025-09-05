import type { DeviceConfig } from '../types';
import type { GeneratedCodeResponse } from '../types/codeGeneration';

/**
 * 代码生成服务 - 纯API调用层
 * 单一职责：与后端API通信
 */
export class CodeGenerationService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * 生成Arduino代码
   */
  async generateArduinoCode(devices: DeviceConfig[]): Promise<GeneratedCodeResponse> {
    try {
      console.log('发送请求到:', `${this.baseUrl}/device-configs/generate-arduino`);
      console.log('设备数据:', devices);

      const response = await fetch(`${this.baseUrl}/device-configs/generate-arduino`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ devices })
      });

      console.log('响应状态:', response.status, response.statusText);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));

      // 获取响应文本
      const responseText = await response.text();
      console.log('响应内容:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('无法解析错误响应:', parseError);
          errorMessage = `${errorMessage} - 响应内容: ${responseText}`;
        }

        throw new Error(errorMessage);
      }

      // 解析JSON响应
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        console.error('响应内容:', responseText);
        throw new Error(`服务器返回了无效的JSON: ${responseText.substring(0, 200)}...`);
      }

    } catch (error) {
      console.error('Arduino代码生成失败:', error);
      throw error;
    }
  }

  // 验证逻辑已移到Hook中，Service只负责API调用

  /**
   * 下载代码文件
   */
  downloadCode(code: string, filename: string = 'FishControl_Generated.ino'): void {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 复制代码到剪贴板 - 兼容多种环境
   */
  async copyToClipboard(code: string): Promise<boolean> {
    try {
      // 方法1: 现代浏览器的Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        return true;
      }

      // 方法2: 传统的execCommand方法（兼容性更好）
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return true;
      }

      // 方法3: 如果都失败，提示用户手动复制
      this.showManualCopyDialog(code);
      return false;

    } catch (error) {
      console.error('复制失败:', error);

      // 降级到手动复制
      this.showManualCopyDialog(code);
      return false;
    }
  }

  /**
   * 显示手动复制对话框
   */
  private showManualCopyDialog(code: string): void {
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
      <h3 style="margin: 0 0 15px 0;">请手动复制代码</h3>
      <p style="margin: 0 0 15px 0; color: #666;">自动复制失败，请手动选择并复制以下代码：</p>
      <textarea readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 12px; border: 1px solid #ccc; padding: 10px;">${code}</textarea>
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
  }
}

// 单例模式
export const codeGenerationService = new CodeGenerationService();
