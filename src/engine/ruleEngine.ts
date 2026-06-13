import { InspectionRule, RuleType } from '@prisma/client';

export interface RuleResult {
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  errorCount: number;
  errorDetails?: Record<string, unknown>;
  affectedRows: number;
  suggestions?: string;
}

export interface IssueDetail {
  rowKey: string;
  errorType: string;
  errorMessage: string;
  context?: Record<string, unknown>;
}

export class RuleEngine {
  private mockDataStore: Map<string, Array<Record<string, unknown>>> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    this.mockDataStore.set('users', [
      { id: 1, name: '张三', age: 25, status: 'active', email: 'zhangsan@test.com' },
      { id: 2, name: '李四', age: null, status: 'active', email: 'lisi@test.com' },
      { id: 3, name: '王五', age: 30, status: 'inactive', email: 'wangwu@test.com' },
      { id: 4, name: '赵六', age: 28, status: 'active', email: 'zhaoliu@test.com' },
      { id: 5, name: '张三', age: 35, status: 'active', email: 'zhangsan2@test.com' },
    ]);

    this.mockDataStore.set('orders', [
      { orderId: 'O001', userId: 1, amount: 100.0, status: 'completed' },
      { orderId: 'O002', userId: 2, amount: 200.0, status: 'pending' },
      { orderId: 'O003', userId: 999, amount: 300.0, status: 'completed' },
      { orderId: 'O004', userId: 3, amount: 150.0, status: 'cancelled' },
      { orderId: 'O005', userId: 1, amount: 50.0, status: 'completed' },
    ]);
  }

  async executeRule(rule: InspectionRule): Promise<{ result: RuleResult; issues: IssueDetail[] }> {
    if (!rule.enabled) {
      return {
        result: { status: 'SKIPPED', errorCount: 0, affectedRows: 0 },
        issues: [],
      };
    }

    const tableData = this.mockDataStore.get(rule.tableName) || [];
    const issues: IssueDetail[] = [];

    switch (rule.ruleType) {
      case RuleType.NULL_CHECK:
        return this.checkNull(rule, tableData);
      case RuleType.DUPLICATE_CHECK:
        return this.checkDuplicate(rule, tableData);
      case RuleType.FLUCTUATION_CHECK:
        return this.checkFluctuation(rule, tableData);
      case RuleType.RANGE_CHECK:
        return this.checkRange(rule, tableData);
      case RuleType.ENUM_CHECK:
        return this.checkEnum(rule, tableData);
      case RuleType.CONSISTENCY_CHECK:
        return this.checkConsistency(rule, tableData);
      default:
        return {
          result: { status: 'PASS', errorCount: 0, affectedRows: 0 },
          issues: [],
        };
    }
  }

  private checkNull(rule: InspectionRule, data: Array<Record<string, unknown>>): { result: RuleResult; issues: IssueDetail[] } {
    const issues: IssueDetail[] = [];
    const params = rule.params as { nullable?: boolean };
    const shouldBeNotNull = !params?.nullable;

    data.forEach((row, index) => {
      const value = row[rule.columnName];
      if (shouldBeNotNull && (value === null || value === undefined)) {
        issues.push({
          rowKey: `row_${index}`,
          errorType: 'NULL_VALUE',
          errorMessage: `${rule.columnName} 不允许为空`,
          context: { row },
        });
      }
    });

    return {
      result: {
        status: issues.length > 0 ? 'FAIL' : 'PASS',
        errorCount: issues.length,
        affectedRows: issues.length,
        suggestions: issues.length > 0 ? `请检查并补充 ${issues.length} 条记录的 ${rule.columnName} 字段` : undefined,
      },
      issues,
    };
  }

  private checkDuplicate(rule: InspectionRule, data: Array<Record<string, unknown>>): { result: RuleResult; issues: IssueDetail[] } {
    const issues: IssueDetail[] = [];
    const seen = new Map<string, number>();

    data.forEach((row, index) => {
      const value = String(row[rule.columnName]);
      if (seen.has(value)) {
        issues.push({
          rowKey: `row_${index}`,
          errorType: 'DUPLICATE_VALUE',
          errorMessage: `${rule.columnName} 存在重复值: ${value}`,
          context: { row, duplicateRowIndex: seen.get(value) },
        });
      } else {
        seen.set(value, index);
      }
    });

    return {
      result: {
        status: issues.length > 0 ? 'FAIL' : 'PASS',
        errorCount: issues.length,
        affectedRows: issues.length,
        suggestions: issues.length > 0 ? `请处理 ${issues.length} 条重复记录` : undefined,
      },
      issues,
    };
  }

  private checkFluctuation(rule: InspectionRule, data: Array<Record<string, unknown>>): { result: RuleResult; issues: IssueDetail[] } {
    const issues: IssueDetail[] = [];
    const params = rule.params as { threshold?: number };
    const threshold = params?.threshold || 30;

    if (data.length < 2) {
      return {
        result: { status: 'PASS', errorCount: 0, affectedRows: 0 },
        issues,
      };
    }

    const values = data.map(row => Number(row[rule.columnName])).filter(v => !isNaN(v));
    if (values.length < 2) {
      return {
        result: { status: 'PASS', errorCount: 0, affectedRows: 0 },
        issues,
      };
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
    const cv = (std / avg) * 100;

    if (cv > threshold) {
      issues.push({
        rowKey: 'aggregate',
        errorType: 'FLUCTUATION',
        errorMessage: `${rule.columnName} 数据波动超过阈值 ${threshold}%，当前变异系数: ${cv.toFixed(2)}%`,
        context: { mean: avg, std, cv },
      });
    }

    return {
      result: {
        status: issues.length > 0 ? 'FAIL' : 'PASS',
        errorCount: issues.length,
        affectedRows: data.length,
        suggestions: issues.length > 0 ? `数据波动异常，请检查 ${rule.columnName} 字段的取值是否存在异常` : undefined,
      },
      issues,
    };
  }

  private checkRange(rule: InspectionRule, data: Array<Record<string, unknown>>): { result: RuleResult; issues: IssueDetail[] } {
    const issues: IssueDetail[] = [];
    const params = rule.params as { min?: number; max?: number };
    const min = params?.min;
    const max = params?.max;

    data.forEach((row, index) => {
      const value = Number(row[rule.columnName]);
      if (isNaN(value)) return;

      if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
        issues.push({
          rowKey: `row_${index}`,
          errorType: 'RANGE_VIOLATION',
          errorMessage: `${rule.columnName} 值 ${value} 超出范围 [${min}, ${max}]`,
          context: { row, min, max },
        });
      }
    });

    return {
      result: {
        status: issues.length > 0 ? 'FAIL' : 'PASS',
        errorCount: issues.length,
        affectedRows: issues.length,
        suggestions: issues.length > 0 ? `请修正 ${issues.length} 条超出范围的记录` : undefined,
      },
      issues,
    };
  }

  private checkEnum(rule: InspectionRule, data: Array<Record<string, unknown>>): { result: RuleResult; issues: IssueDetail[] } {
    const issues: IssueDetail[] = [];
    const params = rule.params as { allowedValues?: string[] };
    const allowedValues = params?.allowedValues || [];

    data.forEach((row, index) => {
      const value = String(row[rule.columnName]);
      if (allowedValues.length > 0 && !allowedValues.includes(value)) {
        issues.push({
          rowKey: `row_${index}`,
          errorType: 'ENUM_VIOLATION',
          errorMessage: `${rule.columnName} 值 ${value} 不在允许的枚举列表中`,
          context: { row, allowedValues },
        });
      }
    });

    return {
      result: {
        status: issues.length > 0 ? 'FAIL' : 'PASS',
        errorCount: issues.length,
        affectedRows: issues.length,
        suggestions: issues.length > 0 ? `请修正 ${issues.length} 条枚举值错误的记录` : undefined,
      },
      issues,
    };
  }

  private checkConsistency(rule: InspectionRule, data: Array<Record<string, unknown>>): { result: RuleResult; issues: IssueDetail[] } {
    const issues: IssueDetail[] = [];
    const params = rule.params as { referenceTable?: string; referenceColumn?: string };
    const refTable = params?.referenceTable;
    const refColumn = params?.referenceColumn;

    if (!refTable || !refColumn) {
      return {
        result: { status: 'PASS', errorCount: 0, affectedRows: 0 },
        issues,
      };
    }

    const refData = this.mockDataStore.get(refTable) || [];
    const validRefValues = new Set(refData.map(row => String(row[refColumn])));

    data.forEach((row, index) => {
      const value = String(row[rule.columnName]);
      if (!validRefValues.has(value)) {
        issues.push({
          rowKey: `row_${index}`,
          errorType: 'REFERENCE_VIOLATION',
          errorMessage: `${rule.columnName} 值 ${value} 在 ${refTable}.${refColumn} 中不存在`,
          context: { row },
        });
      }
    });

    return {
      result: {
        status: issues.length > 0 ? 'FAIL' : 'PASS',
        errorCount: issues.length,
        affectedRows: issues.length,
        suggestions: issues.length > 0 ? `请检查 ${issues.length} 条关联一致性问题记录` : undefined,
      },
      issues,
    };
  }
}