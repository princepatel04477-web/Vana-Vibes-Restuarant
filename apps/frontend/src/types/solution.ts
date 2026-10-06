import type { PageSeo } from './site';

export type SolutionCategory = 'ai' | 'mobile' | 'games' | 'cloud' | 'security' | 'api';

export interface SolutionCapability {
  title: string;
  description: string;
  iconName: 'Cpu' | 'Smartphone' | 'Gamepad2' | 'ShieldCheck' | 'BarChart3' | 'Terminal' | 'Lock' | 'Zap';
}

export interface SolutionMethodologyStep {
  step: string;
  title: string;
  description: string;
}

export interface Solution {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  badge: string;
  category: SolutionCategory;
  categoryLabel: string;
  shortDescription: string;
  overview: string;
  challengesSolved: string[];
  capabilities: SolutionCapability[];
  methodology: SolutionMethodologyStep[];
  deliverables: string[];
  techStack: string[];
  metrics: { label: string; value: string }[];
  featuredCaseStudySlug?: string;
  seo: PageSeo;
}
