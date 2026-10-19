import type { ProductCard } from './catalog.js'

export const HOME_SECTION_IDS = [
  'announce',
  'hero',
  'uspStrip',
  'featuredCategories',
  'flash',
  'bridalTeaser',
  'tradersTeaser',
  'aboutTeaser',
  'partners',
  'guides',
] as const

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number]

export interface HomeLink {
  label: string
  href: string
}

export interface HomeContent {
  announce: { text: string; href: string | null }
  hero: {
    eyebrow: string
    title: string
    subtitle: string
    cta: HomeLink
    secondaryCta: HomeLink | null
    image: string | null
    stats: { value: string; label: string }[]
  }
  uspStrip: { items: { title: string; description: string }[] }
  featuredCategories: { title: string; categorySlugs: string[] }
  flash: { title: string; subtitle: string }
  bridalTeaser: { eyebrow: string; title: string; subtitle: string; cta: HomeLink }
  tradersTeaser: { badge: string; title: string; subtitle: string; cta: HomeLink; points: string[] }
  aboutTeaser: { eyebrow: string; title: string; subtitle: string; cta: HomeLink | null }
  partners: { title: string }
  guides: { title: string }
}

export interface HomeLayout {
  order: HomeSectionId[]
  hidden: HomeSectionId[]
}

export interface PublicHome {
  layout: HomeLayout
  sections: HomeContent
  publishedAt: string | null
}

export interface AdminHomeState {
  draft: { sections: HomeContent; layout: HomeLayout; updatedAt: string | null }
  published: {
    sections: HomeContent
    layout: HomeLayout
    publishedAt: string | null
    label: string | null
  }
  changes: number
}

export interface HomeVersionRow {
  id: string
  label: string | null
  publishedAt: string
  author: { name: string } | null
  current: boolean
}

export const HOME_VERSION_KEEP = 20

export const DEFAULT_HOME_CONTENT: HomeContent = {
  announce: {
    text: 'أصلي 100% وبضمان حقيقي · استلام من المعرض أو توصيل لحد باب البيت',
    href: null,
  },
  hero: {
    eyebrow: 'أجهزة كهربائية وأدوات منزلية · المنصورة · منذ 1972',
    title: 'ثقة لها تاريخ',
    subtitle:
      'من 1972 بنجهّز بيوت مصر. أجهزة وأدوات أصلية بضمان حقيقي، بسعر قطاعي أو جملة، من أول جهاز لحد تجهيز بيت كامل.',
    cta: { label: 'تسوّق دلوقتي', href: '/shop' },
    secondaryCta: { label: 'جهّز بيتك (جهاز العروسة)', href: '/bridal' },
    image: null,
    stats: [
      { value: '1972', label: 'سنة التأسيس' },
      { value: '+50', label: 'سنة خبرة' },
      { value: '100%', label: 'منتجات أصلية' },
    ],
  },
  uspStrip: {
    items: [
      { title: 'ضمان حقيقي', description: 'ضمان مباشر على الأجهزة من الوكيل الرسمي' },
      { title: 'أصلي 100%', description: 'من مصادر موثوقة ومعتمدة بفرز أول مختوم' },
      { title: 'استلام أو توصيل', description: 'من المعرض أو لحد باب بيتك بعربيات المعرض' },
      { title: 'الدفع عند الاستلام', description: 'ادفع وانت مطمّن بعد معاينة جهازك' },
    ],
  },
  featuredCategories: {
    title: 'تسوّق حسب القسم',
    categorySlugs: ['refrigerators', 'washers', 'tvs', 'acs', 'cookers', 'cookware'],
  },
  flash: {
    title: 'عروض لفترة محدودة',
    subtitle: 'الأسعار دي لحد ما العداد يخلص',
  },
  bridalTeaser: {
    eyebrow: 'BRIDAL PACKAGES',
    title: 'تجهيز العرايس — جهّز بيتك',
    subtitle:
      'بدل ما تلف على كل حاجة لوحدها، اختاري باقة جاهزة (أساسية / ذهبية / القصر)، عدّليها أوضة أوضة، شاركيها مع أهلك على واتساب، واحجزيها بعربون يثبّت الأسعار 30 يوم.',
    cta: { label: 'ابدئي حاسبة التجهيز', href: '/bridal' },
  },
  tradersTeaser: {
    badge: 'للتجار والمعارض',
    title: 'أسعار الجملة بتوصلك من المصدر',
    subtitle:
      'تعامل مباشر مع كبرى مصانع الأجهزة وأواني الطهي التركية المستوردة حصرياً لمعارض وتجار الدلتا ومصر.',
    cta: { label: 'كلّم قسم الجملة على واتساب', href: '/traders' },
    points: ['أسعار جملة من المصدر', 'توريد لمعارض الدلتا', 'فواتير رسمية وضمان الوكيل'],
  },
  aboutTeaser: {
    eyebrow: 'OUR STORY · SINCE 1972',
    title: 'من نحن — معرض محمد سراج الرئيسي',
    subtitle:
      'من سنة 1972 واسم محمد سراج معروف في المنصورة لأجهزة وأدوات البيت. منتج أصلي، سعر عادل، وخدمة بتفضل معاك بعد ما تمشي.',
    cta: { label: 'اعرف حكايتنا', href: '/pages/about' },
  },
  partners: {
    title: 'وكلاء معتمدين لأكبر الماركات',
  },
  guides: {
    title: 'دليل الشراء',
  },
}

export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  order: [...HOME_SECTION_IDS],
  hidden: [],
}

export function countHomeChanges(
  draft: { sections: HomeContent; layout: HomeLayout },
  published: { sections: HomeContent; layout: HomeLayout },
): number {
  let changes = 0

  // One change per top-level field that differs, section by section
  for (const sectionId of HOME_SECTION_IDS) {
    const draftSection: Record<string, unknown> = { ...draft.sections[sectionId] }
    const publishedSection: Record<string, unknown> = { ...published.sections[sectionId] }
    const keys = new Set([...Object.keys(draftSection), ...Object.keys(publishedSection)])
    for (const key of keys) {
      if (JSON.stringify(draftSection[key]) !== JSON.stringify(publishedSection[key])) changes += 1
    }
  }

  // Check order
  if (JSON.stringify(draft.layout.order) !== JSON.stringify(published.layout.order)) {
    changes += 1
  }

  // Check hidden - symmetric difference
  const draftHiddenSet = new Set(draft.layout.hidden)
  const publishedHiddenSet = new Set(published.layout.hidden)

  // Count elements in draft not in published
  for (const h of draft.layout.hidden) {
    if (!publishedHiddenSet.has(h)) {
      changes += 1
    }
  }
  // Count elements in published not in draft
  for (const h of published.layout.hidden) {
    if (!draftHiddenSet.has(h)) {
      changes += 1
    }
  }

  return changes
}

export function isSafeContentLink(href: string): boolean {
  if (!href) return false
  if (href.startsWith('//')) return false
  if (href.startsWith('/')) return true
  if (href.startsWith('https://')) return true
  return false
}

export function isUploadedImage(src: string): boolean {
  if (!src) return false
  if (!src.startsWith('/uploads/')) return false
  if (src.includes('..')) return false
  return true
}

// Public page / guide types
export interface PublicPageLink {
  slug: string
  title: string
}

export interface PublicPage {
  slug: string
  title: string
  body: string
  seoTitle: string | null
  seoDescription: string | null
  updatedAt: string
}

export interface AdminPageRow {
  id: string
  slug: string
  title: string
  published: boolean
  updatedAt: string
}

export interface AdminPage extends AdminPageRow {
  body: string
  seoTitle: string | null
  seoDescription: string | null
}

export interface GuideCard {
  slug: string
  title: string
  summary: string | null
  cover: string | null
  publishedAt: string | null
  categories: { slug: string; name: string }[]
}

export interface AdminGuideRow {
  id: string
  slug: string
  title: string
  published: boolean
  publishedAt: string | null
  updatedAt: string
}

export interface AdminGuide extends AdminGuideRow {
  summary: string | null
  cover: string | null
  body: string
  categoryIds: string[]
  productIds: string[]
  seoTitle: string | null
  seoDescription: string | null
  categories: { id: string; slug: string; name: string }[]
  products: { id: string; slug: string; name: string }[]
}

export interface PublicGuide {
  slug: string
  title: string
  summary: string | null
  cover: string | null
  body: string
  publishedAt: string | null
  updatedAt: string
  seoTitle: string | null
  seoDescription: string | null
  categories: { slug: string; name: string }[]
  products: ProductCard[]
}
