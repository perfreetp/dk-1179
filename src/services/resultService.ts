import { prisma } from '../prisma/client';
import { InspectionResult, ResultStatus, TaskStatus } from '@prisma/client';

export interface ResultQuery {
  taskId?: string;
  ruleId?: string;
  status?: ResultStatus;
  startTime?: Date;
  endTime?: Date;
}

export class ResultService {
  async getResults(query: ResultQuery): Promise<InspectionResult[]> {
    const where: any = {};
    if (query.taskId) where.taskId = query.taskId;
    if (query.ruleId) where.ruleId = query.ruleId;
    if (query.status) where.status = query.status;
    if (query.startTime || query.endTime) {
      where.executedAt = {};
      if (query.startTime) where.executedAt.gte = query.startTime;
      if (query.endTime) where.executedAt.lte = query.endTime;
    }

    return prisma.inspectionResult.findMany({
      where,
      include: { rule: true },
      orderBy: { executedAt: 'desc' },
    });
  }

  async getResultById(id: string): Promise<InspectionResult | null> {
    return prisma.inspectionResult.findUnique({
      where: { id },
      include: { rule: true, task: true },
    });
  }

  async getTaskResults(taskId: string): Promise<InspectionResult[]> {
    return prisma.inspectionResult.findMany({
      where: { taskId },
      include: { rule: true },
      orderBy: { executedAt: 'desc' },
    });
  }

  async getTrend(taskId: string, days: number = 7): Promise<Array<{ date: string; pass: number; fail: number; skipped: number; dataSourceError: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await prisma.inspectionResult.findMany({
      where: {
        taskId,
        executedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { executedAt: 'asc' },
    });

    const trendMap = new Map<string, { pass: number; fail: number; skipped: number; dataSourceError: number }>();
    
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, { pass: 0, fail: 0, skipped: 0, dataSourceError: 0 });
    }

    results.forEach(result => {
      const dateStr = result.executedAt.toISOString().split('T')[0];
      const stats = trendMap.get(dateStr);
      if (stats) {
        const statusKey = result.status === ResultStatus.DATA_SOURCE_ERROR ? 'dataSourceError' : (result.status.toLowerCase() as keyof typeof stats);
        stats[statusKey]++;
      }
    });

    return Array.from(trendMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSummary(taskId?: string): Promise<{
    totalExecutions: number;
    passRate: number;
    failCount: number;
    dataSourceErrorCount: number;
    pendingIssues: number;
  }> {
    const where: any = {};
    if (taskId) where.taskId = taskId;

    const results = await prisma.inspectionResult.findMany({ where });
    const issues = await prisma.issue.findMany({
      where: { status: { in: ['OPEN', 'CLAIMED'] }, ...(taskId ? { result: { taskId } } : {}) },
    });

    const totalExecutions = results.length;
    const passCount = results.filter(r => r.status === ResultStatus.PASS).length;
    const failCount = results.filter(r => r.status === ResultStatus.FAIL).length;
    const dataSourceErrorCount = results.filter(r => r.status === ResultStatus.DATA_SOURCE_ERROR).length;
    const passRate = totalExecutions > 0 ? (passCount / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      passRate: parseFloat(passRate.toFixed(2)),
      failCount,
      dataSourceErrorCount,
      pendingIssues: issues.length,
    };
  }
}

export const resultService = new ResultService();