import express from 'express';
import { prisma } from '../prisma/client';
import { RuleType } from '@prisma/client';

export const ruleRoutes = express.Router();

ruleRoutes.post('/tasks/:taskId/rules', async (req, res) => {
  try {
    const { name, ruleType, tableName, columnName, params } = req.body;
    
    const task = await prisma.inspectionTask.findUnique({ where: { id: req.params.taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const rule = await prisma.inspectionRule.create({
      data: {
        taskId: req.params.taskId,
        name,
        ruleType: ruleType as RuleType,
        tableName,
        columnName,
        params,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

ruleRoutes.get('/tasks/:taskId/rules', async (req, res) => {
  try {
    const rules = await prisma.inspectionRule.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

ruleRoutes.get('/:id', async (req, res) => {
  try {
    const rule = await prisma.inspectionRule.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });
    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

ruleRoutes.put('/:id', async (req, res) => {
  try {
    const { name, ruleType, tableName, columnName, params, enabled } = req.body;
    
    const rule = await prisma.inspectionRule.update({
      where: { id: req.params.id },
      data: {
        name,
        ruleType: ruleType as RuleType,
        tableName,
        columnName,
        params,
        enabled,
      },
    });

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

ruleRoutes.delete('/:id', async (req, res) => {
  try {
    const rule = await prisma.inspectionRule.findUnique({ where: { id: req.params.id } });
    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    await prisma.inspectionRule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

ruleRoutes.patch('/:id/enable', async (req, res) => {
  try {
    const rule = await prisma.inspectionRule.update({
      where: { id: req.params.id },
      data: { enabled: true },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

ruleRoutes.patch('/:id/disable', async (req, res) => {
  try {
    const rule = await prisma.inspectionRule.update({
      where: { id: req.params.id },
      data: { enabled: false },
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});