/** Brand palettes the client can try with the floating palette picker (see CommonPaletteLab). */
export interface Palette {
  id: string
  ar: string
  en: string
  green: string
  deep: string
  night: string
  gold: string
  goldHi: string
  goldInk: string
  cream: string
  ivory: string
  soft: string
  border: string
  /** `--primary` in dark mode */
  darkPrimary: string
}

export const PALETTES: Palette[] = [
  { id: 'current', ar: 'الحالي', en: 'Current', green: '#2A4D38', deep: '#16291E', night: '#0E1A13', gold: '#B5A45C', goldHi: '#D2C27A', goldInk: '#6F6329', cream: '#F4F1E6', ivory: '#FAF7EE', soft: '#F1ECDD', border: '#E7E0C8', darkPrimary: '#3D6A50' },
  { id: 'forest', ar: 'أخضر غابة وشامبانيا', en: 'Forest and champagne', green: '#234236', deep: '#152A21', night: '#0B1A13', gold: '#C6A86B', goldHi: '#DCC38F', goldInk: '#735A27', cream: '#F6F2EA', ivory: '#FCF9F2', soft: '#E8EDE6', border: '#DFDDCD', darkPrimary: '#3F6E58' },
  { id: 'navy', ar: 'كحلي ونحاسي (متاجر كلاسيك)', en: 'Navy and brass', green: '#1F3556', deep: '#14233C', night: '#0C1626', gold: '#B08D57', goldHi: '#CDAE7C', goldInk: '#6B5230', cream: '#F6F4EF', ivory: '#FBFAF6', soft: '#E7EAEF', border: '#DDDFE3', darkPrimary: '#4B6A99' },
  { id: 'burgundy', ar: 'عنابي وشامبانيا (عروسة)', en: 'Burgundy and champagne', green: '#6B2A3A', deep: '#471B28', night: '#1F0D13', gold: '#C2A272', goldHi: '#D9C093', goldInk: '#75582E', cream: '#FAF5F1', ivory: '#FFFBF8', soft: '#F2E5E4', border: '#E8D9D5', darkPrimary: '#A24A5F' },
  { id: 'charcoal', ar: 'فحمي ورملي (مينيمال)', en: 'Charcoal and sand', green: '#2E2D2B', deep: '#1E1D1C', night: '#111110', gold: '#A68A64', goldHi: '#C4AB87', goldInk: '#66522F', cream: '#F6F4F0', ivory: '#FCFBF8', soft: '#ECE9E3', border: '#E0DCD4', darkPrimary: '#6E6B66' },
  { id: 'teal', ar: 'أخضر مزرق هادي ورملي', en: 'Quiet teal and sand', green: '#2F5D62', deep: '#1E4045', night: '#102629', gold: '#C8A27C', goldHi: '#DDBF9E', goldInk: '#6E5030', cream: '#F4F3EE', ivory: '#FAFAF6', soft: '#E2EBEA', border: '#D8DFDD', darkPrimary: '#4F8B91' },
  { id: 'terracotta', ar: 'طوبي دافي وكريمي', en: 'Terracotta and cream', green: '#8E4A35', deep: '#5E2F21', night: '#2E1710', gold: '#C2A05A', goldHi: '#D8BE82', goldInk: '#6F5420', cream: '#FBF6EF', ivory: '#FFFBF5', soft: '#F3E6DA', border: '#EADBCB', darkPrimary: '#C17358' },
  { id: 'slate', ar: 'رمادي مزرق وروز جولد', en: 'Slate and rose gold', green: '#3F4A63', deep: '#2A3347', night: '#171C28', gold: '#C49A8A', goldHi: '#DAB9AC', goldInk: '#7A4A3B', cream: '#F8F5F3', ivory: '#FEFBF9', soft: '#E9E9EE', border: '#E1DDDC', darkPrimary: '#6F7EA3' },
]

export const PALETTE_STORAGE_KEY = 'serag-palette'
export const PALETTE_CSS_KEY = 'serag-palette-css'

/** The `:root` / `:root.dark` overrides for one palette (works for Tailwind's `--color-serag-*` too). */
export function paletteCss(p: Palette): string {
  const light = [
    `--color-serag-green:${p.green}`, `--color-serag-deep:${p.deep}`, `--color-serag-night:${p.night}`,
    `--color-serag-gold:${p.gold}`, `--color-serag-gold-hi:${p.goldHi}`, `--color-serag-gold-ink:${p.goldInk}`,
    `--color-serag-cream:${p.cream}`, `--color-serag-ivory:${p.ivory}`,
    `--background:${p.cream}`, `--primary:${p.green}`, `--primary-foreground:${p.ivory}`,
    `--secondary:${p.soft}`, `--muted:${p.soft}`, `--accent:${p.gold}`, `--border:${p.border}`, `--ring:${p.gold}`,
    `--chart-1:${p.green}`, `--chart-2:${p.gold}`, `--chart-4:${p.deep}`, `--chart-5:${p.goldHi}`,
    `--sidebar:${p.night}`, `--sidebar-primary:${p.gold}`, `--sidebar-primary-foreground:${p.night}`,
    `--sidebar-accent:${p.deep}`, `--sidebar-border:${p.deep}`, `--sidebar-ring:${p.gold}`,
  ].join(';')
  const dark = [`--primary:${p.darkPrimary}`, `--accent:${p.gold}`, `--ring:${p.goldHi}`, `--chart-1:${p.darkPrimary}`].join(';')
  return `:root{${light}}:root.dark{${dark}}`
}
