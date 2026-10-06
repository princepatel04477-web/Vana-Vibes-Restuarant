import { describe, it, expect } from 'vitest';
import { SiteConfig } from '@/data/site-config';

describe('Vaan Vibes Cafe SiteConfig Integrity', () => {
  it('should define authentic cafe branding and metadata structure', () => {
    expect(typeof SiteConfig.name).toBe('string');
    expect(typeof SiteConfig.hindiName).toBe('string');
    expect(typeof SiteConfig.tagline).toBe('string');
    expect(SiteConfig.url).toMatch(/^https?:\/\//);
    expect(typeof SiteConfig.title).toBe('string');
  });

  it('should configure cafe location and contact information from environment', () => {
    expect(typeof SiteConfig.address).toBe('string');
    expect(typeof SiteConfig.phone).toBe('string');
    expect(typeof SiteConfig.gstin).toBe('string');
    expect(typeof SiteConfig.email.contact).toBe('string');
    expect(typeof SiteConfig.email.orders).toBe('string');
  });

  it('should define cafe operating hours and shift schedules', () => {
    expect(typeof SiteConfig.operatingHours).toBe('string');
    expect(typeof SiteConfig.schedule.morning).toBe('string');
    expect(typeof SiteConfig.schedule.break).toBe('string');
    expect(typeof SiteConfig.schedule.evening).toBe('string');
    expect(Array.isArray(SiteConfig.cuisine)).toBe(true);
  });
});
