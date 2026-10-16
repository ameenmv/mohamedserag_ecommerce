/**
 * Serag brand hex palette for charts, emails, and programmatic styling.
 */
export const brand = {
  night: '#0E1A13',
  deep: '#16291E',
  green: '#2A4D38',
  gold: '#B5A45C',
  'gold-hi': '#D2C27A',
  'gold-ink': '#6F6329',
  cream: '#F4F1E6',
  ivory: '#FAF7EE',
  ink: '#14201A',
  hot: '#E4572E',
} as const

export type BrandColor = keyof typeof brand
