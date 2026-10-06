/**
 * Centralized Design Tokens for Van Vibes Customer Frontend.
 * Synchronized with Tailwind CSS v4 @theme in src/app/globals.css.
 * Single source of truth for colors, typography, spacing, shadows, and z-index.
 */

export const BrandColors = {
  // Deep Forest Green Palette (Primary)
  green: '#18312B',
  greenDeep: '#0E1F1B',
  greenLight: '#244941',
  greenSurface: '#1E3D36',
  greenHover: '#142823',

  // Warm Heritage Beige Palette (Secondary / Background)
  beige: '#F5E9D3',
  beigeLight: '#FAF5EC',
  beigeDark: '#E6D4B7',
  beigeMuted: '#D8C2A0',

  // Accents
  gold: '#C8A25D',
  goldLight: '#E0C182',
  terracotta: '#D96B43',
} as const;

export const SemanticColors = {
  background: {
    primary: BrandColors.beigeLight,
    secondary: BrandColors.beige,
    dark: BrandColors.greenDeep,
    surface: '#FFFFFF',
    surfaceMuted: '#F8F4EC',
  },
  text: {
    primary: BrandColors.green,
    secondary: '#5A6E68',
    muted: '#849791',
    light: '#FFFFFF',
    accent: BrandColors.gold,
    error: '#DC2626',
    success: '#16A34A',
  },
  border: {
    light: '#E8DEC9',
    muted: BrandColors.beigeMuted,
    focus: BrandColors.green,
    error: '#FCA5A5',
  },
  status: {
    available: '#16A34A',
    occupied: '#D97706',
    reserved: '#2563EB',
    veg: '#16A34A',
    nonVeg: '#DC2626',
  },
} as const;

/**
 * Unified AppColors object maintaining full backward compatibility
 * with both legacy colors.ts and brand.ts schemas.
 */
export const AppColors = {
  // Canonical Brand Green
  brandGreen: BrandColors.green,
  brandGreenDeep: BrandColors.greenDeep,
  brandGreenLight: BrandColors.greenLight,
  brandGreenSurface: BrandColors.greenSurface,
  brandGreenHover: BrandColors.greenHover,

  // Canonical Brand Beige
  brandBeige: BrandColors.beige,
  brandBeigeLight: BrandColors.beigeLight,
  brandBeigeDark: BrandColors.beigeDark,
  brandBeigeMuted: BrandColors.beigeMuted,

  // Accents
  goldAccent: BrandColors.gold,
  gold: BrandColors.gold,
  goldLight: BrandColors.goldLight,
  terracotta: BrandColors.terracotta,

  // Legacy aliases
  primary: BrandColors.green,
  primaryDark: BrandColors.greenDeep,
  primaryLight: BrandColors.greenLight,
  primarySurface: BrandColors.greenSurface,
  beige: BrandColors.beige,
  beigeLight: BrandColors.beigeLight,
  beigeDark: BrandColors.beigeDark,

  // Surfaces & text
  bgPrimary: SemanticColors.background.primary,
  surfaceCard: SemanticColors.background.surface,
  lightBackground: SemanticColors.background.primary,
  lightSurface: SemanticColors.background.surface,
  darkBackground: SemanticColors.background.dark,
  darkSurface: BrandColors.greenDeep,
  textPrimary: SemanticColors.text.primary,
  textSecondary: SemanticColors.text.secondary,
  textMuted: SemanticColors.text.muted,
  borderLight: SemanticColors.border.light,
} as const;

export type ColorKey = keyof typeof AppColors;

export const AppTypography = {
  fontFamily: "'General Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headingFamily: "'General Sans', sans-serif",
  monoFamily: "'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

export const AppSpacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  huge: 64,
} as const;

export const AppRadius = {
  none: '0px',
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const AppShadows = {
  sm: '0 1px 2px 0 rgba(24, 49, 43, 0.05)',
  md: '0 4px 6px -1px rgba(24, 49, 43, 0.08), 0 2px 4px -2px rgba(24, 49, 43, 0.06)',
  lg: '0 10px 15px -3px rgba(24, 49, 43, 0.1), 0 4px 6px -4px rgba(24, 49, 43, 0.06)',
  lift: '0 10px 20px -5px rgba(24, 49, 43, 0.08)',
  drawer: '-4px 0 24px rgba(24, 49, 43, 0.12)',
} as const;

export const AppZIndex = {
  base: 0,
  header: 30,
  categoryNav: 20,
  floatingAction: 40,
  drawer: 50,
  modal: 60,
  toast: 70,
} as const;
