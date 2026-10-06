import type { PageSeo } from './site';

export interface BlogAuthor {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Structured markdown or rich text
  publishedAt: string;
  updatedAt?: string;
  author: BlogAuthor;
  category: string;
  tags: string[];
  readTimeMinutes: number;
  featured: boolean;
  coverGradient: string;
  seo: PageSeo;
}
