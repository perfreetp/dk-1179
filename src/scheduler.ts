import { CronJob } from 'cron';
import { prisma } from './prisma/client';
import { InspectionTask, ScheduleType } from '@prisma/client';
import { taskService } from './services/taskService';

export class Scheduler {
  private jobs: Map<string, CronJob> = new Map();

  start(): void {
    this.scheduleAllTasks();
    console.log('Scheduler started');
  }

  stop(): void {
    this.jobs.forEach(job => job.stop());
    this.jobs.clear();
    console.log('Scheduler stopped');
  }

  async scheduleAllTasks(): Promise<void> {
    const tasks = await prisma.inspectionTask.findMany({
      where: { status: 'RUNNING' },
    });

    tasks.forEach(task => {
      this.scheduleTask(task);
    });
  }

  scheduleTask(task: InspectionTask): void {
    const existingJob = this.jobs.get(task.id);
    if (existingJob) {
      existingJob.stop();
    }

    let cronExpr: string;
    switch (task.scheduleType) {
      case ScheduleType.DAILY:
        cronExpr = task.cronExpression || '0 0 * * *';
        break;
      case ScheduleType.HOURLY:
        cronExpr = task.cronExpression || '0 * * * *';
        break;
      case ScheduleType.MANUAL:
        return;
      default:
        return;
    }

    const job = new CronJob(cronExpr, async () => {
      await taskService.executeTask(task.id);
    });

    this.jobs.set(task.id, job);
    job.start();
    console.log(`Scheduled task ${task.id} with cron: ${cronExpr}`);
  }

  unscheduleTask(taskId: string): void {
    const job = this.jobs.get(taskId);
    if (job) {
      job.stop();
      this.jobs.delete(taskId);
      console.log(`Unscheduled task ${taskId}`);
    }
  }
}

export const scheduler = new Scheduler();