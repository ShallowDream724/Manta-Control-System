import { Logger } from 'winston';
import { EventEmitter } from 'events';

/**
 * 统一日志服务
 * 收集来自后端、Arduino、前端的所有日志
 */
export class UnifiedLogService extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // 最多保存10000条日志
  private sources = new Set<string>();

  constructor(private logger: Logger) {
    super();
    this.sources.add('backend');
    this.sources.add('arduino');
    this.sources.add('frontend');
  }

  /**
   * 添加日志条目
   */
  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      ...entry
    };

    this.logs.unshift(logEntry); // 新日志在前面

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 广播新日志
    this.emit('newLog', logEntry);

    // 同时写入Winston日志
    this.writeToWinston(logEntry);
  }

  /**
   * 记录后端日志
   */
  logBackend(level: LogLevel, message: string, meta?: any): void {
    this.addLog({
      source: 'backend',
      level,
      message,
      meta,
      category: 'system'
    });
  }

  /**
   * 记录Arduino通信日志
   */
  logArduino(direction: 'send' | 'receive', message: string, payload?: any): void {
    this.addLog({
      source: 'arduino',
      level: 'info',
      message,
      meta: {
        direction,
        payload,
        responseTime: payload?.responseTime
      },
      category: 'communication'
    });
  }

  /**
   * 记录任务执行日志
   */
  logTaskExecution(phase: string, message: string, meta?: any): void {
    this.addLog({
      source: 'backend',
      level: 'info',
      message: `[TASK_EXEC] ${phase}: ${message}`,
      meta,
      category: 'task_execution'
    });
  }

  /**
   * 记录设备控制日志
   */
  logDeviceControl(deviceId: string, action: string, value: any, meta?: any): void {
    this.addLog({
      source: 'backend',
      level: 'info',
      message: `[DEVICE] ${deviceId}: ${action}=${value}`,
      meta: {
        deviceId,
        action,
        value,
        ...meta
      },
      category: 'device_control'
    });
  }

  /**
   * 获取日志
   */
  getLogs(options: GetLogsOptions = {}): LogQueryResult {
    const {
      limit = 100,
      offset = 0,
      level,
      source,
      category,
      startTime,
      endTime,
      search
    } = options;

    let filteredLogs = [...this.logs];

    // 按级别过滤
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    // 按来源过滤
    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }

    // 按分类过滤
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    // 按时间范围过滤
    if (startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime);
    }
    if (endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime);
    }

    // 按关键词搜索
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchLower))
      );
    }

    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  /**
   * 获取日志统计
   */
  getLogStats(): LogStats {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentLogs = this.logs.filter(log => log.timestamp >= oneHourAgo);
    const dailyLogs = this.logs.filter(log => log.timestamp >= oneDayAgo);

    const levelCounts = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const sourceCounts = this.logs.reduce((acc, log) => {
      acc[log.source] = (acc[log.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.logs.length,
      recentCount: recentLogs.length,
      dailyCount: dailyLogs.length,
      levelCounts,
      sourceCounts,
      sources: Array.from(this.sources)
    };
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    const count = this.logs.length;
    this.logs = [];
    this.logger.info(`Cleared ${count} log entries`);
    this.emit('logsCleared', count);
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 写入Winston日志
   */
  private writeToWinston(entry: LogEntry): void {
    const message = `[${entry.source.toUpperCase()}] ${entry.message}`;
    const meta = {
      source: entry.source,
      category: entry.category,
      logId: entry.id,
      ...entry.meta
    };

    switch (entry.level) {
      case 'error':
        this.logger.error(message, meta);
        break;
      case 'warn':
        this.logger.warn(message, meta);
        break;
      case 'info':
        this.logger.info(message, meta);
        break;
      case 'debug':
        this.logger.debug(message, meta);
        break;
    }
  }
}

// ==================== 类型定义 ====================

export interface LogEntry {
  id: string;
  timestamp: number;
  source: 'backend' | 'arduino' | 'frontend';
  level: LogLevel;
  message: string;
  meta?: any;
  category: LogCategory;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogCategory = 
  | 'system' 
  | 'communication' 
  | 'task_execution' 
  | 'device_control' 
  | 'user_action'
  | 'error_handling';

export interface GetLogsOptions {
  limit?: number;
  offset?: number;
  level?: LogLevel;
  source?: string;
  category?: LogCategory;
  startTime?: number;
  endTime?: number;
  search?: string;
}

export interface LogQueryResult {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface LogStats {
  total: number;
  recentCount: number;
  dailyCount: number;
  levelCounts: Record<LogLevel, number>;
  sourceCounts: Record<string, number>;
  sources: string[];
}
