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
  'traderReels',
  'guides',
] as const

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number]

export interface HomeLink {
  label: string
  href: string
}

/** One video card in the «التجار بيتكلموا عننا» strip. The card opens `url` (a reel) in a new tab. */
export interface TraderReelItem {
  name: string
  place: string
  /** The reel's own address (not a short /share/ link, which Facebook will not embed). */
  url: string | null
  /** Plays inside the site (a popup) instead of opening Facebook; needs an embeddable `url`. */
  embed: boolean
  /** A saved thumbnail (`/uploads/…`); the card shows a gradient without one. */
  image: string | null
}

export const TRADER_REELS_MAX = 12

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
  traderReels: { items: TraderReelItem[] }
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
  draft: {
    sections: HomeContent
    layout: HomeLayout
    updatedAt: string | null
    english: HomeContent | null
  }
  published: {
    sections: HomeContent
    layout: HomeLayout
    publishedAt: string | null
    label: string | null
    english: HomeContent | null
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
    eyebrow: 'أجهزة كهربائية وأدوات منزلية · المنصورة',
    title: 'ثقة لها تاريخ',
    subtitle:
      'من 1972 بنجهّز بيوت مصر. أجهزة وأدوات أصلية بضمان حقيقي، بسعر قطاعي أو جملة، من أول جهاز لحد تجهيز بيت كامل.',
    cta: { label: 'تسوّق دلوقتي', href: '/shop' },
    secondaryCta: { label: 'أسعار الجملة للتجار', href: '/traders' },
    image: null,
    stats: [
      { value: '1972', label: 'سنة التأسيس' },
      { value: '+50', label: 'سنة خبرة' },
      { value: '100%', label: 'منتجات أصلية' },
    ],
  },
  uspStrip: {
    items: [
      { title: 'ضمان حقيقي', description: 'ضمان مباشر على الأجهزة' },
      { title: 'أصلي 100%', description: 'من مصادر موثوقة ومعتمدة' },
      { title: 'استلام أو توصيل', description: 'من المعرض أو لحد باب بيتك' },
      { title: 'الدفع عند الاستلام', description: 'ادفع وانت مطمّن' },
    ],
  },
  featuredCategories: {
    title: 'تسوّق حسب القسم',
    categorySlugs: ['refrigerators', 'washers', 'tvs', 'acs', 'cookers', 'cookware'],
  },
  flash: {
    title: 'عروض الفلاش',
    subtitle: 'عروض لفترة محدودة، تخلص قبل ما تلحق',
  },
  bridalTeaser: {
    eyebrow: 'باقات العرايس',
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
    cta: { label: 'اعرف أكتر عن الجملة', href: '/traders' },
    points: [
      'أسعار جملة من المصدر',
      'توريد لمعارض الدلتا ومصر',
      'خصومات حسب الكمية',
      'فواتير رسمية وضمان الوكيل',
    ],
  },
  aboutTeaser: {
    eyebrow: 'حكايتنا',
    title: 'من نحن',
    subtitle:
      'من سنة 1972 واسم محمد سراج معروف في المنصورة لأجهزة وأدوات البيت. السوق اتغيّر كتير في +50 سنة، واللي ما اتغيّرش هو وعدنا: منتج أصلي، سعر عادل، وخدمة بتفضل معاك بعد ما تمشي.',
    cta: { label: 'اعرف حكايتنا', href: '/pages/about' },
  },
  partners: {
    title: 'أكبر المصانع بتثق فينا',
  },
  traderReels: {
    items: [
      { name: 'رؤوف يوسف', place: 'طقم تيتانيوم سراج تركي أصلي', url: 'https://www.facebook.com/reel/1444506754485675/', embed: true, image: null },
      { name: 'رؤوف يوسف', place: 'وصل تاني بكميات · تيتانيوم سراج', url: 'https://www.facebook.com/reel/947308004664183/', embed: true, image: null },
      { name: 'النجا للأدوات المنزلية', place: 'معرض طنطا · شارع البحر', url: 'https://www.facebook.com/61552593096705/videos/1646363123819379/', embed: true, image: null },
      { name: 'النجا للأدوات المنزلية', place: 'جولة في معرض طنطا', url: 'https://www.facebook.com/61552593096705/videos/2893970727632819/', embed: false, image: null },
      { name: 'الخواجة للأدوات المنزلية', place: 'أحدث أطقم العشاء التركي', url: 'https://www.facebook.com/Elkawagastore/videos/1725780245171281/', embed: true, image: null },
      { name: 'الشرقاوي للأدوات المنزلية', place: 'تيتانيوم تركي · ضمان سنتين', url: 'https://www.facebook.com/reel/1059485930202915/', embed: true, image: null },
    ],
  },
  guides: {
    title: 'اشترِ صح',
  },
}

/**
 * English home content for /en until the owner writes their own English version in the admin.
 * Links and category choices match the Arabic defaults.
 */
export const DEFAULT_HOME_CONTENT_EN: HomeContent = {
  announce: {
    text: '100% authentic with a real warranty · Showroom pickup or delivery to your door',
    href: null,
  },
  hero: {
    eyebrow: 'Home appliances & housewares · Mansoura',
    title: 'Trusted since 1972',
    subtitle:
      'Since 1972 we have been furnishing Egyptian homes. Authentic appliances and housewares with a real warranty, at retail or wholesale prices, from a single appliance to a fully equipped home.',
    cta: { label: 'Shop now', href: '/shop' },
    secondaryCta: { label: 'Wholesale prices for traders', href: '/traders' },
    image: null,
    stats: [
      { value: '1972', label: 'Founded' },
      { value: '+50', label: 'Years of experience' },
      { value: '100%', label: 'Authentic products' },
    ],
  },
  uspStrip: {
    items: [
      { title: 'Real warranty', description: 'Direct warranty on every appliance' },
      { title: '100% authentic', description: 'From trusted, authorised sources' },
      { title: 'Pickup or delivery', description: 'From the showroom or to your door' },
      { title: 'Cash on delivery', description: 'Pay with peace of mind' },
    ],
  },
  featuredCategories: {
    title: 'Shop by category',
    categorySlugs: DEFAULT_HOME_CONTENT.featuredCategories.categorySlugs,
  },
  flash: {
    title: 'Flash deals',
    subtitle: 'Limited-time offers that end before you know it',
  },
  bridalTeaser: {
    eyebrow: 'BRIDAL PACKAGES',
    title: 'Bridal packages — set up your home',
    subtitle:
      'Pick a ready package (Basic / Golden / Palace), adjust it room by room, share it with your family on WhatsApp, and reserve it with a deposit that locks prices for 30 days.',
    cta: { label: 'Start the planner', href: '/bridal' },
  },
  tradersTeaser: {
    badge: 'For traders & showrooms',
    title: 'Wholesale prices straight from the source',
    subtitle:
      'Direct dealings with leading appliance factories and imported Turkish cookware, supplied to showrooms and traders across the Delta and Egypt.',
    cta: { label: 'Learn about wholesale', href: '/traders' },
    points: [
      'Wholesale prices from the source',
      'Supply for showrooms across Egypt',
      'Quantity discounts',
      'Official invoices and agent warranty',
    ],
  },
  aboutTeaser: {
    eyebrow: 'OUR STORY',
    title: 'About us',
    subtitle:
      'Since 1972 the name Mohamed Serag has stood for home appliances and housewares in Mansoura. The market has changed a lot in 50+ years; our promise has not: authentic products, fair prices, and service that stays with you after you leave.',
    cta: { label: 'Read our story', href: '/pages/about' },
  },
  partners: {
    title: 'Leading factories trust us',
  },
  traderReels: {
    items: [
      { name: 'Raouf Yousef', place: 'Genuine Turkish Serag titanium set', url: 'https://www.facebook.com/reel/1444506754485675/', embed: true, image: null },
      { name: 'Raouf Yousef', place: 'Back in stock · Serag titanium', url: 'https://www.facebook.com/reel/947308004664183/', embed: true, image: null },
      { name: 'El Naga Housewares', place: 'Tanta showroom · El Bahr St.', url: 'https://www.facebook.com/61552593096705/videos/1646363123819379/', embed: true, image: null },
      { name: 'El Naga Housewares', place: 'A tour of the Tanta showroom', url: 'https://www.facebook.com/61552593096705/videos/2893970727632819/', embed: false, image: null },
      { name: 'El Khawaga Housewares', place: 'Latest Turkish dinner sets', url: 'https://www.facebook.com/Elkawagastore/videos/1725780245171281/', embed: true, image: null },
      { name: 'El Sharkawy Housewares', place: 'Turkish titanium · 2-year warranty', url: 'https://www.facebook.com/reel/1059485930202915/', embed: true, image: null },
    ],
  },
  guides: {
    title: 'Buy smart',
  },
}

/**
 * The home content shown for `locale`: the stored English version (`data.en`) on /en when it is
 * valid, otherwise the English defaults; Arabic always uses the main content.
 */
export function homeContentForLocale(arabic: HomeContent, english: HomeContent | null, locale: 'ar' | 'en'): HomeContent {
  if (locale !== 'en') return arabic
  return english ?? DEFAULT_HOME_CONTENT_EN
}

/**
 * The announce bar starts hidden: the store header already carries the same promise strip.
 * The bridal teaser is hidden while the bridal builder is switched off.
 */
export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  order: [...HOME_SECTION_IDS],
  hidden: ['announce', 'bridalTeaser'],
}

export function countHomeChanges(
  draft: { sections: HomeContent; layout: HomeLayout; english?: HomeContent | null },
  published: { sections: HomeContent; layout: HomeLayout; english?: HomeContent | null },
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

  // Count differences in English content
  if (draft.english && published.english) {
    for (const sectionId of HOME_SECTION_IDS) {
      const draftSection: Record<string, unknown> = { ...draft.english[sectionId] }
      const publishedSection: Record<string, unknown> = { ...published.english[sectionId] }
      const keys = new Set([...Object.keys(draftSection), ...Object.keys(publishedSection)])
      for (const key of keys) {
        if (JSON.stringify(draftSection[key]) !== JSON.stringify(publishedSection[key])) changes += 1
      }
    }
  } else if ((draft.english ?? null) !== (published.english ?? null)) {
    changes += 1
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

// shared/ has no DOM or Node typings (no `URL`), so the address is matched, not parsed. Nothing may
// follow the host but `/`, `?`, `#` or the end, so facebook.com.evil.test and user@ tricks fail.
const FACEBOOK_URL = /^https:\/\/(?:www\.|m\.|web\.)?facebook\.com(\/[^?#]*)?(?:[?#].*)?$/i

/** The path of a https Facebook address, or null for any other address. */
function facebookPath(raw: string): string | null {
  const match = FACEBOOK_URL.exec(raw.trim())
  return match ? (match[1] ?? '/') : null
}

/** True for the address of a Facebook video or reel page (any of its hosts, https only). */
export function isFacebookVideoUrl(raw: string): boolean {
  const path = facebookPath(raw)
  return path !== null && /^\/(reel\/\d+|[^/]+\/videos\/(?:[^/]+\/)?\d+)/.test(path)
}

/**
 * The address of Facebook's video player for a reel, or null when it cannot be embedded
 * (not a Facebook video page, or a short /share/ link that has not been resolved yet).
 */
export function facebookEmbedSrc(raw: string | null): string | null {
  if (!raw || !isFacebookVideoUrl(raw)) return null
  const href = encodeURIComponent(`https://www.facebook.com${facebookPath(raw)}`)
  return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=1`
}

export function isUploadedImage(src: string): boolean {
  if (!src) return false
  if (!src.startsWith('/uploads/')) return false
  if (src.includes('..')) return false
  return true
}

/** Fixed order of the store's content pages (footer and admin list); other slugs follow by title. */
export const PAGE_SLUG_ORDER = ['about', 'delivery', 'returns', 'warranty', 'privacy', 'faq'] as const

function pageSlugRank(slug: string): number {
  const index = PAGE_SLUG_ORDER.findIndex((known) => known === slug)
  return index === -1 ? PAGE_SLUG_ORDER.length : index
}

export function comparePageOrder(a: { slug: string; title: string }, b: { slug: string; title: string }): number {
  return pageSlugRank(a.slug) - pageSlugRank(b.slug) || a.title.localeCompare(b.title, 'ar')
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

export interface AdminPageTranslationsEn {
  title?: string
  body?: string
  seoTitle?: string
  seoDescription?: string
}

export interface AdminPageTranslations {
  en?: AdminPageTranslationsEn
}

export interface AdminPage extends AdminPageRow {
  body: string
  seoTitle: string | null
  seoDescription: string | null
  translations?: AdminPageTranslations | null
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

export interface AdminGuideTranslationsEn {
  title?: string
  summary?: string
  body?: string
  seoTitle?: string
  seoDescription?: string
}

export interface AdminGuideTranslations {
  en?: AdminGuideTranslationsEn
}

export interface AdminGuide extends AdminGuideRow {
  summary: string | null
  cover: string | null
  body: string
  categoryIds: string[]
  productIds: string[]
  seoTitle: string | null
  seoDescription: string | null
  translations?: AdminGuideTranslations | null
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
