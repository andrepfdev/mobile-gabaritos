export const colors = {
  bgCream: '#f4f2f2',
  bgPink: '#ffe4e4',
  /** UI charcoal — not for print fiducials/bubbles (use `printInk`). */
  dark: '#383838',
  /** Pure black for printed OMR (ArUco + bubble rings) — maximizes scanner contrast. */
  printInk: '#000000',
  grayLight: '#f4f2f2',
  white: '#ffffff',

  coral: '#fe5053',
  coralSoft: '#ffe4e4',
  yellow: '#ffdd9d',
  yellowSoft: '#fff6e6',

  textPrimary: '#383838',
  textOnDark: '#ffffff',
  textMuted: '#8a8a86',

  tagYellow: '#fe5053',
  tagYellowBg: '#ffe4e4',
  tagGray: '#9a9a95',
  tagGrayBg: '#e9e9e4',

  progressTrack: '#e8e6e6',
  progressFill: '#fe5053',

  danger: '#e0433f',
  success: '#3fa66a',
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  fontFamily: {
    regular: 'Fredoka-Regular',
    medium: 'Fredoka-Medium',
    semibold: 'Fredoka-SemiBold',
    bold: 'Fredoka-Bold',
  },
  scale: {
    hero: { fontSize: 44, lineHeight: 48 },
    h1: { fontSize: 26, lineHeight: 32 },
    h2: { fontSize: 19, lineHeight: 25 },
    body: { fontSize: 15, lineHeight: 21 },
    caption: { fontSize: 12, lineHeight: 16 },
  },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;
