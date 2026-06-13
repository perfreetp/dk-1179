import express from 'express';
import { issueService } from '../services/issueService';
import { IssueStatus } from '@prisma/client';

export const issueRoutes = express.Router();

issueRoutes.get('/', async (req, res) => {
  try {
    const query = {
      resultId: req.query.resultId as string,
      status: req.query.status as IssueStatus,
      assignee: req.query.assignee as string,
    };
    const issues = await issueService.getIssues(query);
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

issueRoutes.get('/:id', async (req, res) => {
  try {
    const issue = await issueService.getIssueById(req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

issueRoutes.post('/:id/claim', async (req, res) => {
  try {
    const { assignee } = req.body;
    const issue = await issueService.claimIssue(req.params.id, assignee);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

issueRoutes.post('/:id/remark', async (req, res) => {
  try {
    const { remark } = req.body;
    const issue = await issueService.addRemark(req.params.id, remark);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

issueRoutes.post('/:id/close', async (req, res) => {
  try {
    const issue = await issueService.closeIssue(req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

issueRoutes.post('/:id/review', async (req, res) => {
  try {
    const issue = await issueService.reviewIssue(req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

issueRoutes.post('/batch/status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    const result = await issueService.batchUpdateStatus(ids, status as IssueStatus);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});