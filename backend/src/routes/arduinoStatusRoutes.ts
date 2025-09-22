import { Router } from 'express';
import { ArduinoStatusController } from '../controllers/ArduinoStatusController';

export function createArduinoStatusRoutes(controller: ArduinoStatusController): Router {
  const router = Router();
  router.get('/status', (req, res) => controller.getStatus(req, res));
  return router;
}

