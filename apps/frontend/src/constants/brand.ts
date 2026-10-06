/**
 * Brand Constants for Vaan Vibes Cafe & Restro.
 */
export { AppColors } from './tokens';

export interface CafeBrandMeta {
  id: string;
  name: string;
  hindiName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  currency: string;
  operatingHours: string;
}

export const CafeBrand: CafeBrandMeta = {
  id: process.env.NEXT_PUBLIC_CAFE_ID || 'van-vibes',
  name: process.env.NEXT_PUBLIC_APP_NAME || '',
  hindiName: process.env.NEXT_PUBLIC_CAFE_HINDI_NAME || '',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || '',
  address: process.env.NEXT_PUBLIC_CAFE_ADDRESS || '',
  phone: process.env.NEXT_PUBLIC_CAFE_PHONE || '',
  email: process.env.NEXT_PUBLIC_CAFE_EMAIL || '',
  gstin: process.env.NEXT_PUBLIC_CAFE_GSTIN || '',
  currency: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹',
  operatingHours: process.env.NEXT_PUBLIC_CAFE_HOURS || '',
};

export interface NavLink {
  label: string;
  href: string;
}

export const CafeQuickNavLinks: NavLink[] = [
  { label: 'Menu', href: '#menu' },
  { label: 'Beverages', href: '#beverages' },
  { label: 'Food', href: '#food' },
  { label: 'Desserts', href: '#desserts' },
];

/** @deprecated Retained for template backward compatibility */
export const AppNavLinks: NavLink[] = [
  { label: 'Menu', href: '#menu' },
  { label: 'About Us', href: '#about-us' },
  { label: 'Contact', href: '#contact' },
];

/** @deprecated Retained for template backward compatibility */
export const ProductNavLinks: NavLink[] = [];
