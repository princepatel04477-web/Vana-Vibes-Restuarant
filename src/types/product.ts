import type { PageSeo, FaqItem } from './site';

export type ProductCategory = 'ocr' | 'mobile-app' | 'mobile-game' | 'enterprise-core';

export interface ProductCapability {
  title: string;
  description: string;
  iconName: 'Cpu' | 'ScanLine' | 'Terminal' | 'Smartphone' | 'Zap' | 'ShieldCheck' | 'Flame' | 'Activity' | 'Trophy' | 'Globe';
}

export interface ProductMetric {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: ProductCategory;
  categoryLabel: string;
  badge: string;
  badgeSubtitle: string;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  capabilities: ProductCapability[];
  techStack: string[];
  metrics: ProductMetric[];
  ctaText: string;
  liveDemoUrl?: string;
  githubUrl?: string;
  canvasBg: string;
  screenshots?: string[];
  faqs?: FaqItem[];
  seo: PageSeo;
}
