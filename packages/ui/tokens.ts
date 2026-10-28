/**
 * Serag brand hex palette for charts, emails, and programmatic styling.
 */
export const brand = {
  night: '#141412',
  deep: '#22211F',
  green: '#557840',
  gold: '#A68A64',
  'gold-hi': '#C9B189',
  'gold-ink': '#66522F',
  cream: '#F6F2EA',
  ivory: '#FBF8F1',
  ink: '#1B1A18',
  hot: '#E4572E',
} as const

export type BrandColor = keyof typeof brand
