import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  LoggerManager,
  LogLevel,
  getLogger,
  runWithLogContext,
  logger,
} from '@/lib/logger';

describe('LoggerManager & Logging System', () => {
  const testLogsDir = path.join(process.cwd(), 'tests', 'scratch_logs');

  beforeEach(() => {
    if (fs.existsSync(testLogsDir)) {
      fs.rmSync(testLogsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testLogsDir)) {
      fs.rmSync(testLogsDir, { recursive: true, force: true });
    }
  });

  it('should initialize with correct default properties', () => {
    const logMgr = new LoggerManager({
      folderName: 'test_system',
      loggerName: 'test.system',
      logDir: testLogsDir,
    });

    expect(logMgr.folderName).toBe('test_system');
    expect(logMgr.loggerName).toBe('test.system');
    expect(logMgr.level).toBe(LogLevel.INFO);
    expect(logMgr.backupCount).toBe(3);
  });

  it('should write log entries to the active activity.log file', () => {
    const logMgr = new LoggerManager({
      folderName: 'test_write',
      loggerName: 'test.write',
      logDir: testLogsDir,
      console: false,
    });

    logMgr.info('Test information message');
    logMgr.warn('Test warning message');

    expect(fs.existsSync(logMgr.logFilePath)).toBe(true);
    const content = fs.readFileSync(logMgr.logFilePath, 'utf8');
    expect(content).toContain('[INFO]');
    expect(content).toContain('Test information message');
    expect(content).toContain('[WARN]');
    expect(content).toContain('Test warning message');
  });

  it('should attach request and user context via runWithLogContext', () => {
    const logMgr = new LoggerManager({
      folderName: 'test_context',
      loggerName: 'test.context',
      logDir: testLogsDir,
      console: false,
    });

    runWithLogContext({ requestId: 'req-xyz-123', userId: 'user-456' }, () => {
      logMgr.info('Action executed in context');
    });

    const content = fs.readFileSync(logMgr.logFilePath, 'utf8');
    expect(content).toContain('[req=req-xyz-123 user=user-456]');
    expect(content).toContain('Action executed in context');
  });

  it('should perform rollover and prune old backups when limit is reached', () => {
    const logMgr = new LoggerManager({
      folderName: 'test_rotation',
      loggerName: 'test.rotation',
      logDir: testLogsDir,
      maxBytes: 50, // Small byte limit to force rotation
      backupCount: 2,
      console: false,
    });

    // Write enough data to trigger rotation
    logMgr.info('First block of log data to exceed limit......................');
    logMgr.info('Second block of log data to exceed limit.....................');
    logMgr.info('Third block of log data to exceed limit......................');

    expect(fs.existsSync(logMgr.logDir)).toBe(true);
    const files = fs.readdirSync(logMgr.logDir);

    // Should have active file + at least one backup
    expect(files).toContain('activity.log');
    const backups = files.filter((f) => f.startsWith('activity_') && f.endsWith('.log'));
    expect(backups.length).toBeGreaterThanOrEqual(1);
    expect(backups.length).toBeLessThanOrEqual(2);
  });

  it('should support exception logging with stack traces', () => {
    const logMgr = new LoggerManager({
      folderName: 'test_errors',
      loggerName: 'test.errors',
      logDir: testLogsDir,
      console: false,
    });

    const fakeErr = new Error('Database connection failed');
    logMgr.exception('Critical failure encountered', fakeErr);

    const content = fs.readFileSync(logMgr.logFilePath, 'utf8');
    expect(content).toContain('[ERROR]');
    expect(content).toContain('Critical failure encountered');
    expect(content).toContain('Database connection failed');
  });

  it('should provide singleton instances via getLogger factory', () => {
    const apiLog1 = getLogger('api');
    const apiLog2 = getLogger('api');

    expect(apiLog1).toBe(apiLog2);
    expect(logger).toBeDefined();
  });
});
