import type { HubLocation, NavGroup, NavLink } from '@/types/site';

export const SiteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Vaan Vibes Cafe & Restro',
  hindiName: 'वन VIBES',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'Cafe & Restro • Taste the Vibe',
  title: 'Vaan Vibes Cafe & Restro — Digital QR Menu & Ordering',
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'A vibrant restro and cafe serving artisanal coffee, gourmet continental & indian cuisine, refreshing drinks, and memorable moments in a warm, aesthetic atmosphere.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  address: 'Main Promenade, Serenita Arts Quarter, Surat, Gujarat',
  phone: '+91 98765 43210',
  gstin: '24AAAAA0000A1Z5',
  email: {
    contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@vaanvibes.cafe',
    careers: process.env.NEXT_PUBLIC_CAREERS_EMAIL || 'careers@vaanvibes.cafe',
    security: process.env.NEXT_PUBLIC_SECURITY_EMAIL || 'admin@vaanvibes.cafe',
  },
  socials: {
    github: 'https://github.com',
    twitter: 'https://x.com',
    linkedin: 'https://linkedin.com',
    discord: 'https://discord.com',
  },
};

export const GlobalHubs: HubLocation[] = [
  {
    city: 'Surat',
    country: 'India',
    flag: '🇮🇳',
    timezone: 'IST (UTC+5:30)',
    address: 'Nexus Innovation Center, Surat, Gujarat, India',
    isHeadquarters: true,
  },
  {
    city: 'San Francisco',
    country: 'United States',
    flag: '🇺🇸',
    timezone: 'PST (UTC-8)',
    address: 'Mission Bay Technology Center, San Francisco, CA',
  },
  {
    city: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    timezone: 'GMT (UTC+0)',
    address: 'Silicon Roundabout Innovation Hub, London, UK',
  },
];

export const PrimaryNavGroups: (NavLink | NavGroup)[] = [
  {
    label: 'Overview',
    href: '/',
  },
  {
    label: 'Solutions',
    href: '/solutions',
    children: [
      { label: 'AI & Intelligence', href: '/solutions/ai-intelligence', description: 'Autonomous agentic workflows & custom LLM systems' },
      { label: 'Cloud Architecture', href: '/solutions/cloud-architecture', description: 'High-throughput distributed cloud infrastructure' },
      { label: 'Enterprise Platforms', href: '/solutions/enterprise-platforms', description: 'Fault-tolerant web applications and microservices' },
    ],
  },
  {
    label: 'Products',
    href: '/products',
    children: [
      { label: 'Cosmos Engine', href: '/products/cosmos-engine', description: 'Next-gen distributed execution engine' },
      { label: 'Nexus Shield', href: '/products/nexus-shield', description: 'Real-time telemetry and API guardrails' },
    ],
  },
  {
    label: 'Case Studies',
    href: '/case-studies',
  },
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'Contact',
    href: '/contact',
  },
];
