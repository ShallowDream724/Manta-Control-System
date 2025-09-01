import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// 导入服务和控制器
import { DeviceControlService } from './services/DeviceControlService';
import { RealtimeCommunicationService } from './services/RealtimeCommunicationService';
import { DeviceConfigService } from './services/DeviceConfigService';
import { DeviceController } from './controllers/DeviceController';
import { DeviceConfigController } from './controllers/DeviceConfigController';
import { createDeviceRoutes } from './routes/deviceRoutes';
import { createDeviceConfigRoutes } from './routes/deviceConfigRoutes';


/**
 * Manta Control Ultra 后端服务器
 *
 * TODO: 实现配置文件热重载 - 详见 docs/后端开发TODO.md
 * TODO: 实现健康检查端点
 * TODO: 实现API版本控制
 */

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// 创建日志目录
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 创建 Express 应用
const app = express();
const server = createServer(app);

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});



// 初始化服务
async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing Manta Control Ultra Backend...');

    // 初始化设备配置服务（先初始化配置服务）
    const deviceConfigService = new DeviceConfigService(logger);
    await deviceConfigService.initialize();

    // 从配置服务获取设备配置
    const devices = await deviceConfigService.getAllConfigs();
    logger.info(`Loaded configuration for ${devices.length} devices`);

    // 初始化设备控制服务
    const deviceControlService = new DeviceControlService(logger);
    await deviceControlService.initialize(devices);

    // 初始化实时通信服务
    const realtimeService = new RealtimeCommunicationService(server, deviceControlService, logger);

    // 初始化控制器
    const deviceController = new DeviceController(deviceControlService, logger);
    const deviceConfigController = new DeviceConfigController(deviceConfigService, logger);

    // 设置路由
    app.use('/api/devices', createDeviceRoutes(deviceController));
    app.use('/api/device-configs', createDeviceConfigRoutes(deviceConfigController));

    // 基础路由
    app.get('/', (_req, res) => {
      res.json({
        message: 'Manta Control Ultra Backend',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        connectedDevices: deviceControlService.getAllDeviceStates().filter((d: any) => d.isOnline).length,
        totalDevices: devices.length
      });
    });

    // 健康检查端点
    app.get('/health', (_req, res) => {
      const deviceStates = deviceControlService.getAllDeviceStates();
      const onlineDevices = deviceStates.filter((d: any) => d.isOnline).length;

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        devices: {
          total: deviceStates.length,
          online: onlineDevices,
          offline: deviceStates.length - onlineDevices
        }
      });
    });

    // 错误处理中间件
    app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // 404 处理
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
      });
    });

    // 启动服务
    realtimeService.start();
    deviceControlService.startCleanupTimer();
    realtimeService.startInactivityCleanup();

    logger.info('All services initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// 启动服务器
async function startServer(): Promise<void> {
  try {
    await initializeServices();

    const PORT = parseInt(process.env.PORT || '8080');
    const HOST = process.env.HOST || '0.0.0.0';

    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Manta Control Ultra Backend running on http://${HOST}:${PORT}`);
      logger.info(`📊 Health check available at http://${HOST}:${PORT}/health`);
      logger.info(`🔌 WebSocket server ready for connections`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 启动应用
startServer();

export default app;
