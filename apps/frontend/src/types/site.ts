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

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
}
