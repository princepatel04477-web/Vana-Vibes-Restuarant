import type { PageSeo } from './site';

export interface CaseStudyMetric {
  label: string;
  value: string;
  change?: string;
}

export interface CaseStudyTestimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  client: string;
  clientIndustry: string;
  category?: 'fintech' | 'mobile' | 'gaming' | 'cloud' | 'security';
  timeline: string;
  summary: string;
  challenge: string;
  solution: string;
  architectureDetails: string[];
  metrics: CaseStudyMetric[];
  testimonial?: CaseStudyTestimonial;
  techStack: string[];
  featured: boolean;
  coverGradient: string;
  relatedProductSlug?: string;
  relatedSolutionSlug?: string;
  seo: PageSeo;
}
