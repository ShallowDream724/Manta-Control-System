import { Request, Response } from 'express';
import { Logger } from 'winston';
import { UnifiedLogService } from '../services/UnifiedLogService';

/**
 * Arduino日志控制器
 * 接收Arduino通过WiFi发送的日志
 */
export class ArduinoLogController {
  constructor(
    private unifiedLogService: UnifiedLogService,
    private logger: Logger
  ) {}

  /**
   * 接收Arduino日志
   * POST /api/arduino-logs
   */
  receiveLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timestamp, level, message, category, deviceId } = req.body;

      // 验证必需字段
      if (!message || !level) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: message, level'
        });
        return;
      }

      // 验证日志级别
      const validLevels = ['error', 'warn', 'info', 'debug'];
      if (!validLevels.includes(level)) {
        res.status(400).json({
          success: false,
          error: `Invalid level. Must be one of: ${validLevels.join(', ')}`
        });
        return;
      }

      // 记录到统一日志服务
      this.unifiedLogService.addLog({
        source: 'arduino',
        level: level as any,
        message,
        category: category || 'system',
        meta: {
          deviceId,
          receivedAt: Date.now(),
          originalTimestamp: timestamp
        }
      });

      // 同时记录到后端日志
      this.logger.info(`[ARDUINO_LOG] ${level.toUpperCase()}: ${message}`, {
        category,
        deviceId,
        originalTimestamp: timestamp
      });

      // 返回成功响应
      res.json({
        success: true,
        received: true
      });

    } catch (error) {
      this.logger.error('Failed to receive Arduino log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process log'
      });
    }
  };

  /**
   * 批量接收Arduino日志
   * POST /api/arduino-logs/batch
   */
  receiveBatchLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { logs } = req.body;

      if (!Array.isArray(logs)) {
        res.status(400).json({
          success: false,
          error: 'logs must be an array'
        });
        return;
      }

      let processedCount = 0;
      const errors: string[] = [];

      for (const logEntry of logs) {
        try {
          const { timestamp, level, message, category, deviceId } = logEntry;

          if (!message || !level) {
            errors.push(`Invalid log entry: missing message or level`);
            continue;
          }

          // 记录到统一日志服务
          this.unifiedLogService.addLog({
            source: 'arduino',
            level: level as any,
            message,
            category: category || 'system',
            meta: {
              deviceId,
              receivedAt: Date.now(),
              originalTimestamp: timestamp
            }
          });

          processedCount++;

        } catch (error) {
          errors.push(`Failed to process log: ${error}`);
        }
      }

      this.logger.info(`Processed ${processedCount} Arduino logs`, {
        total: logs.length,
        errors: errors.length
      });

      res.json({
        success: true,
        processed: processedCount,
        total: logs.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      this.logger.error('Failed to receive Arduino batch logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process batch logs'
      });
    }
  };

  /**
   * Arduino健康检查
   * GET /api/arduino-logs/health
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        service: 'ArduinoLogReceiver',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Arduino log health check failed:', error);
      res.status(500).json({
        success: false,
        service: 'ArduinoLogReceiver',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
