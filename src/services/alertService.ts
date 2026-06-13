import { prisma } from '../prisma/client';
import { ChannelType, AlertStatus } from '@prisma/client';
import axios from 'axios';

export class AlertService {
  async sendAlert(taskId: string, failResults: Array<{ ruleName: string; errorCount: number }>): Promise<void> {
    const task = await prisma.inspectionTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    const content = this.buildAlertContent(task.name, failResults);

    await prisma.alertRecord.create({
      data: {
        taskId,
        channelType: ChannelType.FEISHU,
        content,
        status: AlertStatus.PENDING,
      },
    });

    await this.sendToFeishu(content);
  }

  private buildAlertContent(taskName: string, failResults: Array<{ ruleName: string; errorCount: number }>): string {
    const totalErrors = failResults.reduce((sum, r) => sum + r.errorCount, 0);
    const ruleDetails = failResults.map(r => `- ${r.ruleName}: ${r.errorCount} 个问题`).join('\n');
    
    return `【数据巡检异常】\n任务: ${taskName}\n异常规则数: ${failResults.length}\n总问题数: ${totalErrors}\n问题详情:\n${ruleDetails}`;
  }

  private async sendToFeishu(content: string): Promise<void> {
    try {
      const webhookUrl = process.env.FEISHU_WEBHOOK_URL || '';
      if (!webhookUrl) {
        console.log('飞书webhook未配置，跳过告警推送');
        return;
      }

      await axios.post(webhookUrl, {
        msg_type: 'text',
        content: { text: content },
      });

      console.log('飞书告警发送成功');
    } catch (error) {
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