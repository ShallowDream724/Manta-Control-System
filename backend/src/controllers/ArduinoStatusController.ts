import type { Request, Response } from 'express';
import type { Logger } from 'winston';

export class ArduinoStatusController {
  constructor(private logger: Logger) {}

  /**
   * 获取Arduino状态（通过WiFi HTTP直连）
   * GET /api/arduino/status
   */
  getStatus = async (req: Request, res: Response): Promise<void> => {
    const host = (process.env.ARDUINO_HOST || req.query.host || '192.168.4.1') as string;
    const url = `http://${host}/api/status`;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.ARDUINO_STATUS_TIMEOUT_MS || 3000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const r = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!r.ok) {
        throw new Error(`HTTP ${r.status} ${r.statusText}`);
      }

      const data: any = await r.json();
      const responseTime = Date.now() - start;

      res.json({
        success: true,
        online: data?.status === 'online',
        devices: typeof data?.devices === 'number' ? data.devices : undefined,
        uptimeSec: typeof data?.uptimeSec === 'number' ? data.uptimeSec : undefined,
        responseTime
      });
    } catch (error: any) {
      // 超时/中断不作为警告刷屏，只返回离线
      if (error?.name === 'AbortError') {
        this.logger.debug?.('Arduino status request aborted (timeout)');
      } else {
        this.logger.warn('Failed to get Arduino status:', error);
      }
      res.json({
        success: true,
        online: false
      });
    }
  };
}
