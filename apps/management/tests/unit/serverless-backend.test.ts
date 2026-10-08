import { describe, it, expect } from 'vitest';
import { ServerBackend, createToken, parseToken } from '@/lib/server-backend';

describe('Serverless Backend Authentication & Data Store', () => {
  it('authenticates admin by phone number 9054032800 and password admin123', () => {
    const res = ServerBackend.login('9054032800', 'admin123');
    expect(res).not.toBeNull();
    expect(res?.user.role).toBe('ADMIN');
    expect(res?.user.contactNumber).toBe('9054032800');
    expect(res?.access_token).toBeDefined();
  });

  it('authenticates admin by second phone number 9773291261 and password admin123', () => {
    const res = ServerBackend.login('9773291261', 'admin123');
    expect(res).not.toBeNull();
    expect(res?.user.role).toBe('ADMIN');
    expect(res?.user.contactNumber).toBe('9773291261');
  });

  it('authenticates admin by legacy email admin@vaanvibes.com', () => {
    const res = ServerBackend.login('admin@vaanvibes.com', 'admin123');
    expect(res).not.toBeNull();
    expect(res?.user.role).toBe('ADMIN');
  });

  it('authenticates chef by chef@vaanvibes.com and password chef123', () => {
    const res = ServerBackend.login('chef@vaanvibes.com', 'chef123');
    expect(res).not.toBeNull();
    expect(res?.user.role).toBe('CHEF');
  });

  it('rejects invalid password', () => {
    const res = ServerBackend.login('9054032800', 'wrongpassword');
    expect(res).toBeNull();
  });

  it('creates and verifies JWT tokens correctly', () => {
    const token = createToken({ sub: 'u-123', role: 'ADMIN' }, 3600);
    const parsed = parseToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed?.sub).toBe('u-123');
    expect(parsed?.role).toBe('ADMIN');
  });

  it('returns valid tables and menu data', () => {
    const tables = ServerBackend.getTables();
    expect(tables.length).toBeGreaterThan(0);
    const categories = ServerBackend.getCategories();
    expect(categories.length).toBeGreaterThan(0);
  });
});
