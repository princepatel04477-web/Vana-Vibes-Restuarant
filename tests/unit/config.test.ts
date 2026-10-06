import { describe, it, expect } from 'vitest';
import { SiteConfig, PrimaryNavGroups, GlobalHubs } from '@/data/site-config';

describe('SiteConfig Integrity & Dynamic Environment Resolution', () => {
  it('should define core site metadata dynamically from environment', () => {
    expect(SiteConfig.name).toBeTruthy();
    expect(SiteConfig.url).toMatch(/^https?:\/\//);
    expect(SiteConfig.description.length).toBeGreaterThan(10);
    expect(SiteConfig.tagline).toBeTruthy();
    expect(SiteConfig.title).toContain(SiteConfig.name);
  });

  it('should contain valid primary navigation groups with leading slashes', () => {
    expect(Array.isArray(PrimaryNavGroups)).toBe(true);
    expect(PrimaryNavGroups.length).toBeGreaterThan(0);

    for (const group of PrimaryNavGroups) {
      expect(group.label).toBeTruthy();
      expect(group.href.startsWith('/') || group.href.startsWith('#')).toBe(true);
      if ('children' in group && group.children) {
        for (const child of group.children) {
          expect(child.label).toBeTruthy();
          expect(child.href.startsWith('/')).toBe(true);
        }
      }
    }
  });

  it('should configure company details and social handles from environment', () => {
    expect(SiteConfig.socials.github).toBeTruthy();
    expect(SiteConfig.socials.twitter).toBeTruthy();
    expect(SiteConfig.socials.linkedin).toBeTruthy();
  });

  it('should configure valid contact and department emails from environment', () => {
    expect(SiteConfig.email.contact).toContain('@');
    expect(SiteConfig.email.careers).toContain('@');
    expect(SiteConfig.email.security).toContain('@');
  });

  it('should define headquarters and global hubs correctly', () => {
    expect(Array.isArray(GlobalHubs)).toBe(true);
    expect(GlobalHubs.length).toBeGreaterThanOrEqual(1);
    const hq = GlobalHubs.find((h) => h.isHeadquarters);
    expect(hq).toBeDefined();
    expect(hq?.city).toBeTruthy();
  });
});
