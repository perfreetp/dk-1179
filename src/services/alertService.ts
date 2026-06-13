import { prisma } from '../prisma/client';
import { ChannelType, AlertStatus } from '@prisma/client';
import axios from 'axios';

export class AlertService {
  async sendAlert(taskId: string, failResults: Array<{ ruleName: string; errorCount: number }>): Promise<void> {
    const task = await prisma.inspectionTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    const content = this.buildAlertContent(task.name, failResults);

    const alertRecord = await prisma.alertRecord.create({
      data: {
        taskId,
        channelType: ChannelType.FEISHU,
        content,
        status: AlertStatus.PENDING,
      },
    });

    await this.sendToFeishu(content, alertRecord.id);
  }

  private buildAlertContent(taskName: string, failResults: Array<{ ruleName: string; errorCount: number }>): string {
    const totalErrors = failResults.reduce((sum, r) => sum + r.errorCount, 0);
    const ruleDetails = failResults.map(r => `- ${r.ruleName}: ${r.errorCount} 个问题`).join('\n');
    
    return `【数据巡检异常】\n任务: ${taskName}\n异常规则数: ${failResults.length}\n总问题数: ${totalErrors}\n问题详情:\n${ruleDetails}`;
  }

  private async sendToFeishu(content: string, alertId: string): Promise<void> {
    const webhookUrl = process.env.FEISHU_WEBHOOK_URL || '';
    
    if (!webhookUrl) {
      await prisma.alertRecord.update({
        where: { id: alertId },
        data: { 
          status: AlertStatus.FAILED,
          sentAt: new Date(),
          errorMessage: 'Webhook未配置',
        },
      });
      console.log('飞书webhook未配置，告警记录标记为失败');
      return;
    }

    try {
      await axios.post(webhookUrl, {
        msg_type: 'text',
        content: { text: content },
      });

      await prisma.alertRecord.update({
        where: { id: alertId },
        data: { 
          status: AlertStatus.SENT,
          sentAt: new Date(),
        },
      });
      console.log('飞书告警发送成功');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '发送失败';
      await prisma.alertRecord.update({
        where: { id: alertId },
        data: { 
          status: AlertStatus.FAILED,
          sentAt: new Date(),
          errorMessage: errorMsg,
        },
      });
      console.error('飞书告警发送失败:', error);
    }
  }

  async getAlertRecords(taskId?: string, status?: AlertStatus): Promise<any[]> {
    return prisma.alertRecord.findMany({
      where: { taskId, status },
      include: { task: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const alertService = new AlertService();