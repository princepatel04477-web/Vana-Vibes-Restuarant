import type { PageSeo } from './site';

export type JobDepartment = 'AI & OCR' | 'Mobile Engineering' | 'Game Development' | 'Cloud & DevOps' | 'Product & Design';

export interface JobOpening {
  id: string;
  slug: string;
  title: string;
  department: JobDepartment;
  location: string;
  type: 'Full-time' | 'Contract' | 'Remote';
  experienceLevel: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  techStack: string[];
  isOpen: boolean;
  postedAt: string;
}

export interface CareerPageData {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
  };
  culturePoints: {
    title: string;
    description: string;
    iconName: string;
  }[];
  perks: {
    title: string;
    description: string;
    iconName: string;
  }[];
  jobs: JobOpening[];
  seo: PageSeo;
}
