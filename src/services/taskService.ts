import { prisma } from '../prisma/client';
import { InspectionTask, TaskStatus, ScheduleType, RuleType } from '@prisma/client';
import { RuleEngine } from '../engine/ruleEngine';
import { scheduler } from '../scheduler';
import { alertService } from './alertService';

export interface CreateTaskRequest {
  name: string;
  description?: string;
  scheduleType: ScheduleType;
  cronExpression?: string;
  dataDomain: string;
  owner: string;
  rules: Array<{
    name: string;
    ruleType: RuleType;
    tableName: string;
    columnName: string;
    params: Record<string, unknown>;
  }>;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  scheduleType?: ScheduleType;
  cronExpression?: string;
  dataDomain?: string;
  owner?: string;
}

export interface ExecuteResult {
  success: boolean;
  message: string;
  executedRules?: number;
}

export class TaskService {
  private ruleEngine = new RuleEngine();

  async createTask(data: CreateTaskRequest): Promise<InspectionTask> {
    const task = await prisma.inspectionTask.create({
      data: {
        name: data.name,
        description: data.description,
        scheduleType: data.scheduleType,
        cronExpression: data.cronExpression,
        dataDomain: data.dataDomain,
        owner: data.owner,
        status: TaskStatus.RUNNING,
        rules: {
          create: data.rules.map(rule => ({
            name: rule.name,
            ruleType: rule.ruleType,
            tableName: rule.tableName,
            columnName: rule.columnName,
            params: rule.params,
          })),
        },
      },
      include: { rules: true },
    });

    if (data.scheduleType !== ScheduleType.MANUAL) {
      scheduler.scheduleTask(task);
    }

    return task;
  }

  async getTasks(filters?: {
    dataDomain?: string;
    owner?: string;
    status?: TaskStatus;
  }): Promise<InspectionTask[]> {
    return prisma.inspectionTask.findMany({
      where: filters,
      include: { rules: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskById(id: string): Promise<InspectionTask | null> {
    return prisma.inspectionTask.findUnique({
      where: { id },
      include: { rules: true },
    });
  }

  async updateTask(id: string, data: UpdateTaskRequest): Promise<InspectionTask | null> {
    const task = await prisma.inspectionTask.findUnique({ where: { id } });
    if (!task) return null;

    const updatedTask = await prisma.inspectionTask.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        scheduleType: data.scheduleType,
        cronExpression: data.cronExpression,
        dataDomain: data.dataDomain,
        owner: data.owner,
      },
      include: { rules: true },
    });

    if (updatedTask.scheduleType !== ScheduleType.MANUAL) {
      scheduler.scheduleTask(updatedTask);
    }

    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const task = await prisma.inspectionTask.findUnique({ where: { id } });
    if (!task) return false;

    scheduler.unscheduleTask(id);
    await prisma.inspectionTask.delete({ where: { id } });
    return true;
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<InspectionTask | null> {
    const task = await prisma.inspectionTask.findUnique({ where: { id } });
    if (!task) return null;

    const updatedTask = await prisma.inspectionTask.update({
      where: { id },
      data: { status },
    });

    if (status === TaskStatus.RUNNING) {
      scheduler.scheduleTask(updatedTask);
    } else {
      scheduler.unscheduleTask(id);
    }

    return updatedTask;
  }

  async executeTask(taskId: string): Promise<ExecuteResult> {
    const task = await prisma.inspectionTask.findUnique({
      where: { id: taskId },
      include: { rules: true },
    });

    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    if (task.status !== TaskStatus.RUNNING) {
      return { success: false, message: '任务已暂停或停止' };
    }

    const enabledRules = task.rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      return { success: false, message: '没有可用的规则' };
    }

    let hasFailures = false;
    const failResults: Array<{
      ruleName: string;
      errorCount: number;
    }> = [];

    for (const rule of enabledRules) {
      const { result, issues } = await this.ruleEngine.executeRule(rule);

      const dbResult = await prisma.inspectionResult.create({
        data: {
          taskId: task.id,
          ruleId: rule.id,
          status: result.status === 'DATA_SOURCE_ERROR' ? 'FAIL' : (result.status as any),
          errorCount: result.errorCount,
          errorDetails: result.errorDetails || { errorMessage: result.errorMessage },
          affectedRows: result.affectedRows,
          suggestions: result.suggestions,
        },
      });

      if (result.status === 'FAIL' || result.status === 'DATA_SOURCE_ERROR') {
        hasFailures = true;
        failResults.push({ ruleName: rule.name, errorCount: result.errorCount });

        for (const issue of issues) {
          await prisma.issue.create({
            data: {
              resultId: dbResult.id,
              rowKey: issue.rowKey,
              errorType: issue.errorType,
              errorMessage: issue.errorMessage,
              context: issue.context,
              status: 'OPEN',
            },
          });
        }
      }
    }

    if (hasFailures) {
      await alertService.sendAlert(taskId, failResults);
    }

    return { success: true, message: '执行成功', executedRules: enabledRules.length };
  }

  async retryRule(taskId: string, ruleId: string): Promise<void> {
    const task = await prisma.inspectionTask.findUnique({
      where: { id: taskId },
      include: { rules: true },
    });

    if (!task) return;

    const rule = task.rules.find(r => r.id === ruleId);
    if (!rule) return;

    const { result, issues } = await this.ruleEngine.executeRule(rule);

    await prisma.inspectionResult.create({
      data: {
        taskId: task.id,
        ruleId: rule.id,
        status: result.status as any,
        errorCount: result.errorCount,
        errorDetails: result.errorDetails,
        affectedRows: result.affectedRows,
        suggestions: result.suggestions,
      },
    });

    if (result.status === 'FAIL') {
      const latestResult = await prisma.inspectionResult.findFirst({
        where: { taskId, ruleId },
        orderBy: { createdAt: 'desc' },
      });

      if (latestResult) {
        for (const issue of issues) {
          await prisma.issue.create({
            data: {
              resultId: latestResult.id,
              rowKey: issue.rowKey,
              errorType: issue.errorType,
              errorMessage: issue.errorMessage,
              context: issue.context,
              status: 'OPEN',
            },
          });
        }
      }
    }
  }
}

export const taskService = new TaskService();