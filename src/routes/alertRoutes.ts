import express from 'express';
import { alertService } from '../services/alertService';
import { AlertStatus } from '@prisma/client';

export const alertRoutes = express.Router();

alertRoutes.get('/', async (req, res) => {
  try {
    const taskId = req.query.taskId as string | undefined;
    const status = req.query.status as AlertStatus | undefined;
    const alerts = await alertService.getAlertRecords(taskId, status);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});