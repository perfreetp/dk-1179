import express from 'express';
import { resultService } from '../services/resultService';
import { ResultStatus } from '@prisma/client';

export const resultRoutes = express.Router();

resultRoutes.get('/', async (req, res) => {
  try {
    const query = {
      taskId: req.query.taskId as string,
      ruleId: req.query.ruleId as string,
      status: req.query.status as ResultStatus,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
    };
    const results = await resultService.getResults(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

resultRoutes.get('/:id', async (req, res) => {
  try {
    const result = await resultService.getResultById(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

resultRoutes.get('/tasks/:taskId', async (req, res) => {
  try {
    const results = await resultService.getTaskResults(req.params.taskId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

resultRoutes.get('/tasks/:taskId/trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const trend = await resultService.getTrend(req.params.taskId, days);
    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

resultRoutes.get('/summary', async (req, res) => {
  try {
    const taskId = req.query.taskId as string | undefined;
    const summary = await resultService.getSummary(taskId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});