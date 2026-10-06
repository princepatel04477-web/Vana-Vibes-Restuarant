// Vaan Vibes Core Color Schema
export const AppColors = {
  brandGreen: '#18312B',
  brandGreenDeep: '#0E1F1B',
  brandGreenLight: '#244941',
  brandGreenSurface: '#1E3D36',

  brandBeige: '#F5E9D3',
  brandBeigeLight: '#FAF5EC',
  brandBeigeDark: '#E6D4B7',
  brandBeigeMuted: '#D8C2A0',

  goldAccent: '#C8A25D',
  terracotta: '#D96B43',

  // Surfaces & text
  bgPrimary: '#FAF5EC',
  surfaceCard: '#FFFFFF',
  textPrimary: '#18312B',
  textSecondary: '#5A6E68',
  borderLight: '#E8DEC9',
} as const;

export type ColorKey = keyof typeof AppColors;
