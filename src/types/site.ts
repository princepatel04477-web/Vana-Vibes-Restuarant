export interface PageSeo {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface NavLink {
  label: string;
  href: string;
  badge?: string;
  description?: string;
}

export interface NavGroup {
  label: string;
  href: string;
  children: NavLink[];
}

export interface HubLocation {
  city: string;
  country: string;
  flag: string;
  timezone: string;
  address?: string;
  isHeadquarters?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  skills: string[];
  socials?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}
