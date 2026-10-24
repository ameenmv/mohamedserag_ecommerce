/** The prototype's line icons, picked from a category slug. */
export type CategoryIconKind = 'fridge' | 'washer' | 'screen' | 'ac' | 'oven' | 'fan' | 'blender' | 'pot'

const RULES: [RegExp, CategoryIconKind][] = [
  [/fridge|refrigerator|freezer/, 'fridge'],
  [/wash|dryer/, 'washer'],
  [/tv|screen|television/, 'screen'],
  [/^acs?$|air|condition|^ac-/, 'ac'],
  [/cooker|oven|stove|gas/, 'oven'],
  [/fan|vent/, 'fan'],
  [/blender|mixer|small|appliance/, 'blender'],
]

export function categoryIconKind(slug: string): CategoryIconKind {
  const value = slug.toLowerCase()
  for (const [pattern, kind] of RULES) {
    if (pattern.test(value)) return kind
  }
  return 'pot'
}
