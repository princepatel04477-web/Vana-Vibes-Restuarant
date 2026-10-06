import { describe, it, expect } from 'vitest';
import { getOrganizationSchema, getBreadcrumbSchema, getSoftwareProductSchema } from '@/lib/seo';
import { SiteConfig } from '@/data/site-config';

describe('SEO and JSON-LD Structured Data Utilities', () => {
  it('should generate valid organization schema matching site config', () => {
    const org = getOrganizationSchema();
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('Organization');
    expect(org.name).toBe(SiteConfig.name);
    expect(org.url).toBe(SiteConfig.url);
    expect(org.email).toBe(SiteConfig.email.contact);
    expect(Array.isArray(org.sameAs)).toBe(true);
  });

  it('should generate valid breadcrumb schema with absolute URLs', () => {
    const crumbs = getBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Solutions', url: '/solutions' },
    ]);
    expect(crumbs['@context']).toBe('https://schema.org');
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[0].position).toBe(1);
    expect(crumbs.itemListElement[0].item).toMatch(/^https?:\/\//);
  });

  it('should generate valid software application schema', () => {
    const product = getSoftwareProductSchema({
      name: 'Cosmos Engine',
      description: 'Distributed execution engine',
      slug: 'cosmos-engine',
      category: 'DeveloperApplication',
    });
    expect(product['@context']).toBe('https://schema.org');
    expect(product['@type']).toBe('SoftwareApplication');
    expect(product.name).toBe('Cosmos Engine');
    expect(product.url).toContain('/products/cosmos-engine');
  });
});
