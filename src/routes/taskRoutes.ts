import express from 'express';
import { taskService } from '../services/taskService';
import { TaskStatus } from '@prisma/client';

export const taskRoutes = express.Router();

taskRoutes.post('/', async (req, res) => {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.get('/', async (req, res) => {
  try {
    const filters = {
      dataDomain: req.query.dataDomain as string,
      owner: req.query.owner as string,
      status: req.query.status as TaskStatus,
    };
    const tasks = await taskService.getTasks(filters);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.put('/:id', async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.delete('/:id', async (req, res) => {
  try {
    const deleted = await taskService.deleteTask(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.post('/:id/start', async (req, res) => {
  try {
    const task = await taskService.updateTaskStatus(req.params.id, TaskStatus.RUNNING);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.post('/:id/pause', async (req, res) => {
  try {
    const task = await taskService.updateTaskStatus(req.params.id, TaskStatus.PAUSED);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.post('/:id/execute', async (req, res) => {
  try {
    await taskService.executeTask(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

taskRoutes.post('/:taskId/rules/:ruleId/retry', async (req, res) => {
  try {
    await taskService.retryRule(req.params.taskId, req.params.ruleId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});