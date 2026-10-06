import { describe, it, expect } from 'vitest';
import {
  getOrganizationSchema,
  getRestaurantSchema,
  getBreadcrumbSchema,
  getMenuItemSchema,
} from '@/lib/seo';
import { SiteConfig } from '@/data/site-config';

describe('SEO and JSON-LD Structured Data Utilities for Vaan Vibes Cafe', () => {
  it('should generate valid cafe schema matching site config', () => {
    const org = getOrganizationSchema();
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('CafeOrCoffeeShop');
    expect(org.name).toBe(SiteConfig.name);
    expect(org.url).toBe(SiteConfig.url);
    expect(org.email).toBe(SiteConfig.email.contact);
    expect(org.telephone).toBe(SiteConfig.phone);
    expect(org.servesCuisine).toEqual(SiteConfig.cuisine);
  });

  it('should generate valid restaurant schema', () => {
    const rest = getRestaurantSchema();
    expect(rest['@context']).toBe('https://schema.org');
    expect(rest.name).toBe(SiteConfig.name);
    expect(rest.address.streetAddress).toBe(SiteConfig.address);
  });

  it('should generate valid breadcrumb schema with absolute URLs', () => {
    const crumbs = getBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Menu', url: '/menu' },
    ]);
    expect(crumbs['@context']).toBe('https://schema.org');
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[0].position).toBe(1);
    expect(crumbs.itemListElement[0].item).toMatch(/^https?:\/\//);
  });

  it('should generate valid dish/menu item schema', () => {
    const item = getMenuItemSchema({
      name: 'Paneer Tikka',
      description: 'Charcoal grilled cottage cheese marinated in spices',
      price: 249,
      category: 'Starters',
    });
    expect(item['@context']).toBe('https://schema.org');
    expect(item['@type']).toBe('MenuItem');
    expect(item.name).toBe('Paneer Tikka');
    expect(item.offers.price).toBe('249.00');
    expect(item.offers.priceCurrency).toBe('INR');
  });
});
