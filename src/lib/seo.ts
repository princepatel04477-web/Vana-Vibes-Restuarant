import { SiteConfig } from '@/data/site-config';

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SiteConfig.name,
    url: SiteConfig.url,
    description: SiteConfig.description,
    email: SiteConfig.email.contact,
    sameAs: [
      SiteConfig.socials.github,
      SiteConfig.socials.twitter,
      SiteConfig.socials.linkedin,
      SiteConfig.socials.discord,
    ],
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SiteConfig.url}${item.url}`,
    })),
  };
}

export function getSoftwareProductSchema(product: {
  name: string;
  description: string;
  slug: string;
  category: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    description: product.description,
    applicationCategory: product.category,
    operatingSystem: 'Cross-platform, Web, Cloud, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: 'Enterprise Custom Scoping & Deployment',
    },
    url: `${SiteConfig.url}/products/${product.slug}`,
  };
}
