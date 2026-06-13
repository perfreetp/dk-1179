import { RuleEngine } from '../src/engine/ruleEngine';
import { RuleType } from '@prisma/client';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  describe('checkNull', () => {
    it('should detect null values', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Null Check',
        ruleType: RuleType.NULL_CHECK,
        tableName: 'users',
        columnName: 'age',
        params: {},
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result, issues } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('FAIL');
      expect(result.errorCount).toBeGreaterThan(0);
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('checkDuplicate', () => {
    it('should detect duplicate values', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Duplicate Check',
        ruleType: RuleType.DUPLICATE_CHECK,
        tableName: 'users',
        columnName: 'name',
        params: {},
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('FAIL');
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('checkRange', () => {
    it('should detect out of range values', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Range Check',
        ruleType: RuleType.RANGE_CHECK,
        tableName: 'users',
        columnName: 'age',
        params: { min: 18, max: 30 },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('FAIL');
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('checkEnum', () => {
    it('should detect invalid enum values', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Enum Check',
        ruleType: RuleType.ENUM_CHECK,
        tableName: 'users',
        columnName: 'status',
        params: { allowedValues: ['active'] },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('FAIL');
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('checkConsistency', () => {
    it('should detect reference violations', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Consistency Check',
        ruleType: RuleType.CONSISTENCY_CHECK,
        tableName: 'orders',
        columnName: 'userId',
        params: { referenceTable: 'users', referenceColumn: 'id' },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('FAIL');
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('checkFluctuation', () => {
    it('should detect data fluctuation', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Fluctuation Check',
        ruleType: RuleType.FLUCTUATION_CHECK,
        tableName: 'orders',
        columnName: 'amount',
        params: { threshold: 10 },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('FAIL');
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });

  describe('disabled rule', () => {
    it('should skip disabled rules', async () => {
      const rule = {
        id: 'test',
        taskId: 'task1',
        name: 'Disabled Rule',
        ruleType: RuleType.NULL_CHECK,
        tableName: 'users',
        columnName: 'age',
        params: {},
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = await ruleEngine.executeRule(rule);

      expect(result.status).toBe('SKIPPED');
      expect(result.errorCount).toBe(0);
    });
  });
});