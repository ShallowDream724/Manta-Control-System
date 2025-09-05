/**
 * 端口工具函数
 * 提供端口检测和自动选择功能
 */

import { createServer } from 'net';
import winston from 'winston';

/**
 * 检查端口是否可用
 */
export function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * 查找可用端口
 */
export async function findAvailablePort(
  startPort: number = 8080, 
  maxPort: number = 8090,
  logger?: winston.Logger
): Promise<number> {
  for (let port = startPort; port <= maxPort; port++) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      if (logger) {
        logger.info(`Found available port: ${port}`);
      }
      return port;
    } else {
      if (logger) {
        logger.debug(`Port ${port} is in use, trying next...`);
      }
    }
  }
  
  throw new Error(`No available ports found in range ${startPort}-${maxPort}`);
}

/**
 * 获取推荐端口列表
 */
export function getRecommendedPorts(): number[] {
  return [8080, 8081, 8082, 8083, 8084, 8085, 3000, 3001, 3002, 5000];
}

/**
 * 智能端口选择
 * 优先使用推荐端口，如果都不可用则在范围内查找
 */
export async function smartPortSelection(
  preferredPort?: number,
  logger?: winston.Logger
): Promise<number> {
  // 如果指定了首选端口，先检查是否可用
  if (preferredPort) {
    const isAvailable = await checkPortAvailable(preferredPort);
    if (isAvailable) {
      if (logger) {
        logger.info(`Using preferred port: ${preferredPort}`);
      }
      return preferredPort;
    } else {
      if (logger) {
        logger.warn(`Preferred port ${preferredPort} is not available`);
      }
    }
  }
  
  // 尝试推荐端口列表
  const recommendedPorts = getRecommendedPorts();
  for (const port of recommendedPorts) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      if (logger) {
        logger.info(`Using recommended port: ${port}`);
      }
      return port;
    }
  }
  
  // 如果推荐端口都不可用，在范围内查找
  if (logger) {
    logger.warn('All recommended ports are in use, searching for available port...');
  }
  return await findAvailablePort(8080, 8999, logger);
}

/**
 * 杀死占用指定端口的进程（仅限开发环境）
 */
export async function killProcessOnPort(port: number, logger?: winston.Logger): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    if (logger) {
      logger.warn('Cannot kill processes in production environment');
    }
    return false;
  }
  
  try {
    const { exec } = require('child_process');
    const platform = process.platform;
    
    let command: string;
    if (platform === 'win32') {
      // Windows
      command = `netstat -ano | findstr :${port}`;
    } else {
      // Unix-like systems
      command = `lsof -ti:${port}`;
    }
    
    return new Promise((resolve) => {
      exec(command, (error: any, stdout: string) => {
        if (error || !stdout.trim()) {
          resolve(false);
          return;
        }
        
        if (platform === 'win32') {
          // 解析Windows netstat输出
          const lines = stdout.trim().split('\n');
          const pids = lines
            .map(line => line.trim().split(/\s+/).pop())
            .filter(pid => pid && !isNaN(Number(pid)));
          
          if (pids.length > 0) {
            exec(`taskkill /PID ${pids[0]} /F`, (killError: any) => {
              if (logger) {
                if (killError) {
                  logger.error(`Failed to kill process on port ${port}:`, killError);
                } else {
                  logger.info(`Killed process on port ${port}`);
                }
              }
              resolve(!killError);
            });
          } else {
            resolve(false);
          }
        } else {
          // Unix-like systems
          const pid = stdout.trim();
          exec(`kill -9 ${pid}`, (killError: any) => {
            if (logger) {
              if (killError) {
                logger.error(`Failed to kill process on port ${port}:`, killError);
              } else {
                logger.info(`Killed process on port ${port}`);
              }
            }
            resolve(!killError);
          });
        }
      });
    });
  } catch (error) {
    if (logger) {
      logger.error('Error killing process on port:', error);
    }
    return false;
  }
}
