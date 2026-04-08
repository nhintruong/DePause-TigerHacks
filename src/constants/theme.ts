// DePause Design System
// "Cute healing vibe" -- pastel colors, rounded corners, soft shadows

export const colors = {
  // Brand
  primary: '#A8D8EA',       // Soft blue
  secondary: '#C3AED6',     // Lavender
  accent: '#FFD6BA',        // Warm peach
  mint: '#B8E0D2',          // Mint

  // Mood quadrants
  mood: {
    red: '#FF8A8A',         // Stressed / On Edge
    yellow: '#FFD93D',      // Good / Energized
    green: '#6BCB77',       // Calm / Content
    blue: '#4D96FF',        // Low / Down
  },

  // Mood quadrant backgrounds (lighter versions for cards)
  moodBg: {
    red: '#FFE0E0',
    yellow: '#FFF4CC',
    green: '#D4F5DC',
    blue: '#D6E8FF',
  },

  // Neutrals
  background: '#FFF9F5',    // Warm off-white
  surface: '#FFFFFF',
  surfaceElevated: '#FFFCFA',
  text: '#2D2D2D',
  textSecondary: '#6B6B6B',
  textLight: '#9E9E9E',
  border: '#F0E8E3',
  divider: '#F5EFEB',

  // Semantic
  error: '#FF6B6B',
  success: '#6BCB77',
  warning: '#FFD93D',

  // Crisis
  crisisGentleBg: '#FFF0E8',
  crisisProfessionalBg: '#E8F0FF',
  crisisImmediateBg: '#FFE8EC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
} as const;

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
