import { TaskService } from '../src/services/taskService';
import { ScheduleType, RuleType, TaskStatus } from '@prisma/client';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskService();
  });

  describe('createTask', () => {
    it('should create a task with rules', async () => {
      const taskData = {
        name: 'Test Task',
        description: 'Test Description',
        scheduleType: ScheduleType.MANUAL,
        dataDomain: 'user',
        owner: 'admin',
        rules: [
          {
            name: 'Null Check Rule',
            ruleType: RuleType.NULL_CHECK,
            tableName: 'users',
            columnName: 'email',
            params: {},
          },
        ],
      };

      const task = await taskService.createTask(taskData);

      expect(task).toBeDefined();
      expect(task.name).toBe(taskData.name);
      expect(task.dataDomain).toBe(taskData.dataDomain);
      expect(task.rules.length).toBe(1);
      expect(task.rules[0].ruleType).toBe(RuleType.NULL_CHECK);
    });
  });

  describe('getTasks', () => {
    it('should return tasks with filters', async () => {
      const tasks = await taskService.getTasks({ dataDomain: 'user' });
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status to paused', async () => {
      const taskData = {
        name: 'Status Test Task',
        scheduleType: ScheduleType.MANUAL,
        dataDomain: 'test',
        owner: 'admin',
        rules: [],
      };

      const task = await taskService.createTask(taskData);
      const updatedTask = await taskService.updateTaskStatus(task.id, TaskStatus.PAUSED);

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.status).toBe(TaskStatus.PAUSED);
    });
  });
});