import { SiteConfig } from '@/data/site-config';

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: SiteConfig.name,
    alternateName: SiteConfig.hindiName,
    url: SiteConfig.url,
    description: SiteConfig.description,
    telephone: SiteConfig.phone,
    email: SiteConfig.email.contact,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SiteConfig.address,
      addressLocality: 'Surat',
      addressRegion: 'Gujarat',
      addressCountry: 'IN',
    },
    servesCuisine: SiteConfig.cuisine,
    openingHours: SiteConfig.operatingHours,
  };
}

export function getRestaurantSchema() {
  return getOrganizationSchema();
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

export function getMenuItemSchema(item: {
  name: string;
  description: string;
  price: number;
  category?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: item.name,
    description: item.description,
    offers: {
      '@type': 'Offer',
      price: item.price.toFixed(2),
      priceCurrency: 'INR',
    },
    menuAddOn: item.category,
    image: item.image,
  };
}
