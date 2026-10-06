export const AppColors = {
  primary: '#18312B',
  primaryDark: '#0E1F1B',
  primaryLight: '#244941',
  primarySurface: '#1E3D36',

  beige: '#F5E9D3',
  beigeLight: '#FAF5EC',
  beigeDark: '#E6D4B7',
  gold: '#C8A25D',

  lightBackground: '#FAF5EC',
  lightSurface: '#FFFFFF',
  darkBackground: '#18312B',
  darkSurface: '#0E1F1B',
  textPrimary: '#18312B',
  textSecondary: '#5A6E68',
  textMuted: '#849791',
  borderLight: '#E8DEC9',
} as const;

export interface NavLink {
  label: string;
  href: string;
}

export const AppNavLinks: NavLink[] = [
  { label: 'Products', href: '#products' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'About Us', href: '#about-us' },
  { label: 'Careers', href: '#careers' },
  { label: 'Blog', href: '#blog' },
];

export const ProductNavLinks: NavLink[] = [
  { label: 'Product', href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Resources', href: '#resources' },
  { label: 'Pricing', href: '#pricing' },
];

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const SupportedLanguages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];
