import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { DeviceControlService } from '../services/DeviceControlService';
import { DeviceCommand } from '../types/device';

/**
 * 设备控制器
 * 处理设备相关的HTTP API请求
 * 
 * TODO: 实现批量命令处理 - 详见 docs/后端开发TODO.md 第2节
 * TODO: 实现命令历史记录查询
 * TODO: 实现设备性能统计API
 */
export class DeviceController {
  private deviceControlService: DeviceControlService;
  private logger: winston.Logger;

  constructor(deviceControlService: DeviceControlService, logger: winston.Logger) {
    this.deviceControlService = deviceControlService;
    this.logger = logger;
  }

  /**
   * 获取所有设备配置
   * GET /api/devices
   */
  getDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const devices = this.deviceControlService.getAllDeviceConfigs();
      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      this.logger.error('Failed to get devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get devices'
      });
    }
  };

  /**
   * 获取设备状态
   * GET /api/devices/:deviceId/status
   */
  getDeviceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const state = this.deviceControlService.getDeviceState(deviceId);
      
      if (!state) {
        res.status(404).json({
          success: false,
          error: 'Device not found'
        });
        return;
      }

      res.json({
        success: true,
        data: state
      });
    } catch (error) {
      this.logger.error('Failed to get device status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device status'
      });
    }
  };

  /**
   * 获取所有设备状态
   * GET /api/devices/status
   */
  getAllDeviceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const states = this.deviceControlService.getAllDeviceStates();
      res.json({
        success: true,
        data: states
      });
    } catch (error) {
      this.logger.error('Failed to get all device status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device status'
      });
    }
  };

  /**
   * 控制设备
   * POST /api/devices/:deviceId/control
   */
  controlDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { action, value, duration } = req.body;

      // 验证请求参数
      if (!action || value === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: action, value'
        });
        return;
      }

      // 创建设备命令
      const command: DeviceCommand = {
        deviceId,
        action,
        value,
        duration,
        timestamp: Date.now(),
        commandId: uuidv4()
      };

      // 执行命令
      const success = await this.deviceControlService.executeCommand(command);

      if (success) {
        res.json({
          success: true,
          data: {
            commandId: command.commandId,
            message: 'Command executed successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Command execution failed'
        });
      }

    } catch (error) {
      this.logger.error('Failed to control device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to control device'
      });
    }
  };

  /**
   * 设置设备功率
   * POST /api/devices/:deviceId/power
   */
  setDevicePower = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { power } = req.body;

      if (typeof power !== 'number' || power < 0 || power > 100) {
        res.status(400).json({
          success: false,
          error: 'Power must be a number between 0 and 100'
        });
        return;
      }

      const command: DeviceCommand = {
        deviceId,
        action: 'set_power',
        value: power,
        timestamp: Date.now(),
        commandId: uuidv4()
      };

      const success = await this.deviceControlService.executeCommand(command);

      if (success) {
        res.json({
          success: true,
          data: {
            commandId: command.commandId,
            power,
            message: 'Power set successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to set power'
        });
      }

    } catch (error) {
      this.logger.error('Failed to set device power:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set device power'
      });
    }
  };

  /**
   * 设置设备状态
   * POST /api/devices/:deviceId/state
   */
  setDeviceState = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { state } = req.body;

      if (typeof state !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'State must be a boolean value'
        });
        return;
      }

      const command: DeviceCommand = {
        deviceId,
        action: 'set_state',
        value: state,
        timestamp: Date.now(),
        commandId: uuidv4()
      };

      const success = await this.deviceControlService.executeCommand(command);

      if (success) {
        res.json({
          success: true,
          data: {
            commandId: command.commandId,
            state,
            message: 'State set successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to set state'
        });
      }

    } catch (error) {
      this.logger.error('Failed to set device state:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set device state'
      });
    }
  };

  /**
   * 执行定时动作
   * POST /api/devices/:deviceId/timed-action
   */
  executeTimedAction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { value, duration } = req.body;

      if (value === undefined || typeof duration !== 'number' || duration <= 0) {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid parameters: value, duration'
        });
        return;
      }

      const command: DeviceCommand = {
        deviceId,
        action: 'timed_action',
        value,
        duration,
        timestamp: Date.now(),
        commandId: uuidv4()
      };

      const success = await this.deviceControlService.executeCommand(command);

      if (success) {
        res.json({
          success: true,
          data: {
            commandId: command.commandId,
            value,
            duration,
            message: 'Timed action started successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to execute timed action'
        });
      }

    } catch (error) {
      this.logger.error('Failed to execute timed action:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute timed action'
      });
    }
  };

  /**
   * 停止所有设备
   * POST /api/devices/stop-all
   */
  stopAllDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const devices = this.deviceControlService.getAllDeviceConfigs();
      const commands: DeviceCommand[] = [];

      // 为每个设备创建停止命令
      for (const device of devices) {
        const command: DeviceCommand = {
          deviceId: device.id,
          action: device.type === 'pwm' ? 'set_power' : 'set_state',
          value: device.type === 'pwm' ? 0 : false,
          timestamp: Date.now(),
          commandId: uuidv4()
        };
        commands.push(command);
      }

      // 执行所有停止命令
      const results = await Promise.all(
        commands.map(cmd => this.deviceControlService.executeCommand(cmd))
      );

      const successCount = results.filter(result => result).length;

      res.json({
        success: true,
        data: {
          totalDevices: devices.length,
          successCount,
          failedCount: devices.length - successCount,
          message: `Stopped ${successCount} out of ${devices.length} devices`
        }
      });

    } catch (error) {
      this.logger.error('Failed to stop all devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop all devices'
      });
    }
  };
}
