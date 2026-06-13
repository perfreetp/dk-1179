import { prisma } from '../prisma/client';
import { Issue, IssueStatus } from '@prisma/client';

export interface IssueQuery {
  resultId?: string;
  status?: IssueStatus;
  assignee?: string;
}

export class IssueService {
  async getIssues(query: IssueQuery): Promise<Issue[]> {
    const where: any = {};
    if (query.resultId) where.resultId = query.resultId;
    if (query.status) where.status = query.status;
    if (query.assignee) where.assignee = query.assignee;

    return prisma.issue.findMany({
      where,
      include: { result: { include: { rule: true, task: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIssueById(id: string): Promise<Issue | null> {
    return prisma.issue.findUnique({
      where: { id },
      include: { result: { include: { rule: true, task: true } } },
    });
  }

  async claimIssue(id: string, assignee: string): Promise<Issue | null> {
    return prisma.issue.update({
      where: { id },
      data: {
        status: IssueStatus.CLAIMED,
        assignee,
        claimedAt: new Date(),
      },
    });
  }

  async addRemark(id: string, remark: string): Promise<Issue | null> {
    return prisma.issue.update({
      where: { id },
      data: { remark },
    });
  }

  async closeIssue(id: string): Promise<Issue | null> {
    return prisma.issue.update({
      where: { id },
      data: {
        status: IssueStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }

  async reviewIssue(id: string): Promise<Issue | null> {
    return prisma.issue.update({
      where: { id },
      data: {
        status: IssueStatus.REVIEWED,
        reviewedAt: new Date(),
      },
    });
  }

  async batchUpdateStatus(ids: string[], status: IssueStatus): Promise<{ count: number }> {
    const result = await prisma.issue.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return { count: result.count };
  }
}

export const issueService = new IssueService();