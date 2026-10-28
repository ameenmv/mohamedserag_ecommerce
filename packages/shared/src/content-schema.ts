import { z } from 'zod'
import {
  DEFAULT_HOME_CONTENT,
  HOME_SECTION_IDS,
  TRADER_REELS_MAX,
  isSafeContentLink,
  isUploadedImage,
} from './content.js'

export const homeLinkSchema = z.object({
  label: z
    .string({ message: 'عنوان الرابط مطلوب' })
    .trim()
    .min(1, 'عنوان الرابط مطلوب')
    .max(30, 'عنوان الرابط بيزيد عن 30 حرف'),
  href: z
    .string({ message: 'الرابط مطلوب' })
    .trim()
    .refine(isSafeContentLink, {
      message: 'الرابط لازم يبدأ بـ / أو https://',
    }),
})

const announceSchema = z.object({
  text: z
    .string({ message: 'نص الإعلان مطلوب' })
    .trim()
    .min(1, 'نص الإعلان مطلوب')
    .max(120, 'نص الإعلان بيزيد عن 120 حرف'),
  href: z
    .string({ message: 'رابط الإعلان غير صالح' })
    .trim()
    .nullable()
    .refine((val) => val === null || isSafeContentLink(val), {
      message: 'الرابط لازم يبدأ بـ / أو https://',
    }),
})

const heroSchema = z.object({
  eyebrow: z
    .string({ message: 'السطر الصغير فوق العنوان غير صالح' })
    .trim()
    .max(60, 'السطر الصغير فوق العنوان بيزيد عن 60 حرف'),
  title: z
    .string({ message: 'عنوان الهيرو مطلوب' })
    .trim()
    .min(1, 'عنوان الهيرو مطلوب')
    .max(80, 'عنوان الهيرو بيزيد عن 80 حرف'),
  subtitle: z
    .string({ message: 'نص الهيرو غير صالح' })
    .trim()
    .max(240, 'نص الهيرو بيزيد عن 240 حرف'),
  cta: homeLinkSchema,
  secondaryCta: homeLinkSchema.nullable(),
  image: z
    .string({ message: 'صورة الهيرو غير صالحة' })
    .trim()
    .nullable()
    .refine((val) => val === null || isUploadedImage(val), {
      message: 'الصورة لازم تبدأ بـ /uploads/',
    }),
  stats: z
    .array(
      z.object({
        value: z
          .string({ message: 'قيمة الإحصاء غير صالحة' })
          .trim()
          .min(1, 'قيمة الإحصاء مطلوبة')
          .max(10, 'قيمة الإحصاء بيزيد عن 10 أحرف'),
        label: z
          .string({ message: 'عنوان الإحصاء غير صالح' })
          .trim()
          .min(1, 'عنوان الإحصاء مطلوب')
          .max(30, 'عنوان الإحصاء بيزيد عن 30 حرف'),
      }),
    )
    .max(3, 'أقصى عدد إحصائيات 3'),
})

const uspStripSchema = z.object({
  items: z
    .array(
      z.object({
        title: z
          .string({ message: 'عنوان الميزة مطلوب' })
          .trim()
          .min(1, 'عنوان الميزة مطلوب')
          .max(30, 'عنوان الميزة بيزيد عن 30 حرف'),
        description: z
          .string({ message: 'وصف الميزة مطلوب' })
          .trim()
          .min(1, 'وصف الميزة مطلوب')
          .max(90, 'وصف الميزة بيزيد عن 90 حرف'),
      }),
    )
    .length(4, 'لازم 4 مميزات بالظبط'),
})

const featuredCategoriesSchema = z.object({
  title: z
    .string({ message: 'عنوان القسم مطلوب' })
    .trim()
    .min(1, 'عنوان القسم مطلوب')
    .max(60, 'عنوان القسم بيزيد عن 60 حرف'),
  categorySlugs: z
    .array(
      z
        .string({ message: 'رابط القسم غير صالح' })
        .regex(/^[a-z0-9-]{1,80}$/, 'رابط القسم لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة فقط'),
    )
    .max(8, 'أقصى عدد أقسام 8'),
})

const flashSchema = z.object({
  title: z
    .string({ message: 'عنوان العروض مطلوب' })
    .trim()
    .min(1, 'عنوان العروض مطلوب')
    .max(60, 'عنوان العروض بيزيد عن 60 حرف'),
  subtitle: z
    .string({ message: 'نص العروض غير صالح' })
    .trim()
    .max(120, 'نص العروض بيزيد عن 120 حرف'),
})

const bridalTeaserSchema = z.object({
  eyebrow: z
    .string({ message: 'السطر الصغير فوق العنوان غير صالح' })
    .trim()
    .max(40, 'السطر الصغير فوق العنوان بيزيد عن 40 حرف'),
  title: z
    .string({ message: 'عنوان قسم العرايس مطلوب' })
    .trim()
    .min(1, 'عنوان قسم العرايس مطلوب')
    .max(80, 'عنوان قسم العرايس بيزيد عن 80 حرف'),
  subtitle: z
    .string({ message: 'نص قسم العرايس غير صالح' })
    .trim()
    .max(300, 'نص قسم العرايس بيزيد عن 300 حرف'),
  cta: homeLinkSchema,
})

const tradersTeaserSchema = z.object({
  badge: z
    .string({ message: 'نص الشارة غير صالح' })
    .trim()
    .max(30, 'نص الشارة بيزيد عن 30 حرف'),
  title: z
    .string({ message: 'عنوان قسم التجار مطلوب' })
    .trim()
    .min(1, 'عنوان قسم التجار مطلوب')
    .max(80, 'عنوان قسم التجار بيزيد عن 80 حرف'),
  subtitle: z
    .string({ message: 'نص قسم التجار غير صالح' })
    .trim()
    .max(300, 'نص قسم التجار بيزيد عن 300 حرف'),
  cta: homeLinkSchema,
  points: z
    .array(
      z
        .string({ message: 'نص النقطة غير صالح' })
        .trim()
        .min(1, 'نص النقطة مطلوب')
        .max(60, 'نص النقطة بيزيد عن 60 حرف'),
    )
    .max(4, 'أقصى عدد نقاط 4'),
})

const aboutTeaserSchema = z.object({
  eyebrow: z
    .string({ message: 'السطر الصغير فوق العنوان غير صالح' })
    .trim()
    .max(40, 'السطر الصغير فوق العنوان بيزيد عن 40 حرف'),
  title: z
    .string({ message: 'عنوان قسم من نحن مطلوب' })
    .trim()
    .min(1, 'عنوان قسم من نحن مطلوب')
    .max(80, 'عنوان قسم من نحن بيزيد عن 80 حرف'),
  subtitle: z
    .string({ message: 'نص قسم من نحن غير صالح' })
    .trim()
    .max(300, 'نص قسم من نحن بيزيد عن 300 حرف'),
  cta: homeLinkSchema.nullable(),
})

const partnersSchema = z.object({
  title: z
    .string({ message: 'عنوان الوكلاء مطلوب' })
    .trim()
    .min(1, 'عنوان الوكلاء مطلوب')
    .max(60, 'عنوان الوكلاء بيزيد عن 60 حرف'),
})

const traderReelItemSchema = z.object({
  name: z
    .string({ message: 'اسم التاجر مطلوب' })
    .trim()
    .min(1, 'اسم التاجر مطلوب')
    .max(60, 'اسم التاجر بيزيد عن 60 حرف'),
  place: z
    .string({ message: 'السطر التحتاني غير صالح' })
    .trim()
    .max(80, 'السطر التحتاني بيزيد عن 80 حرف'),
  url: z
    .string({ message: 'رابط الفيديو غير صالح' })
    .trim()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .refine((val) => val === null || (val.startsWith('https://') && val.length <= 300), {
      message: 'رابط الفيديو لازم يبدأ بـ https://',
    }),
  // Items saved before the popup existed play on Facebook, as before
  embed: z.boolean({ message: 'خيار التشغيل جوه الموقع غير صالح' }).default(false),
  image: z
    .string({ message: 'صورة الفيديو غير صالحة' })
    .trim()
    .nullable()
    .default(null)
    .transform((val) => (val === '' ? null : val))
    .refine((val) => val === null || isUploadedImage(val), {
      message: 'الصورة لازم تبدأ بـ /uploads/',
    }),
})

export const reelPreviewInputSchema = z.object({
  url: z
    .string({ message: 'رابط الفيديو مطلوب' })
    .trim()
    .min(1, 'رابط الفيديو مطلوب')
    .max(300, 'رابط الفيديو طويل'),
})

// Content saved before this section existed has no `traderReels`: it reads as the defaults
const traderReelsSchema = z
  .object({
    items: z.array(traderReelItemSchema).max(TRADER_REELS_MAX, `أقصى عدد فيديوهات ${TRADER_REELS_MAX}`),
  })
  .default(() => DEFAULT_HOME_CONTENT.traderReels)

const guidesSchema = z.object({
  title: z
    .string({ message: 'عنوان الدليل مطلوب' })
    .trim()
    .min(1, 'عنوان الدليل مطلوب')
    .max(60, 'عنوان الدليل بيزيد عن 60 حرف'),
})

export const homeContentSchema = z.object({
  announce: announceSchema,
  hero: heroSchema,
  uspStrip: uspStripSchema,
  featuredCategories: featuredCategoriesSchema,
  flash: flashSchema,
  bridalTeaser: bridalTeaserSchema,
  tradersTeaser: tradersTeaserSchema,
  aboutTeaser: aboutTeaserSchema,
  partners: partnersSchema,
  traderReels: traderReelsSchema,
  guides: guidesSchema,
})

export const homeLayoutSchema = z.object({
  order: z
    .array(z.enum(HOME_SECTION_IDS))
    .refine((arr) => arr.length === HOME_SECTION_IDS.length, {
      message: 'ترتيب الأقسام ناقص أو مكرر',
    })
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'ترتيب الأقسام ناقص أو مكرر',
    }),
  hidden: z.array(z.enum(HOME_SECTION_IDS)).refine((arr) => new Set(arr).size === arr.length, {
    message: 'قائمة المخفي غير صالحة',
  }),
})

export const homeDraftInputSchema = z.object({
  sections: homeContentSchema,
  layout: homeLayoutSchema,
  english: homeContentSchema.nullable().optional(),
})

export const homePublishInputSchema = z.object({
  label: z
    .string({ message: 'تسمية الإصدار غير صالحة' })
    .trim()
    .max(80, 'تسمية الإصدار بيزيد عن 80 حرف')
    .optional(),
})

export const pageTranslationsEnSchema = z
  .object({
    title: z.string().trim().max(120, 'عنوان الصفحة بيزيد عن 120 حرف').nullable().optional(),
    body: z.string().trim().max(50000, 'محتوى الصفحة بيزيد عن 50000 حرف').nullable().optional(),
    seoTitle: z.string().trim().max(70, 'عنوان SEO بيزيد عن 70 حرف').nullable().optional(),
    seoDescription: z.string().trim().max(160, 'وصف SEO بيزيد عن 160 حرف').nullable().optional(),
  })
  .transform((data) => {
    const res: {
      title?: string
      body?: string
      seoTitle?: string
      seoDescription?: string
    } = {}
    if (data.title && data.title.length > 0) res.title = data.title
    if (data.body && data.body.length > 0) res.body = data.body
    if (data.seoTitle && data.seoTitle.length > 0) res.seoTitle = data.seoTitle
    if (data.seoDescription && data.seoDescription.length > 0) res.seoDescription = data.seoDescription
    return res
  })

export const pageTranslationsSchema = z.object({
  en: pageTranslationsEnSchema.optional(),
})

export type PageTranslationsEnInput = z.input<typeof pageTranslationsEnSchema>
export type PageTranslationsEn = z.output<typeof pageTranslationsEnSchema>
export type PageTranslationsInput = z.input<typeof pageTranslationsSchema>
export type PageTranslations = z.output<typeof pageTranslationsSchema>

export const pageInputSchema = z.object({
  title: z
    .string({ message: 'عنوان الصفحة مطلوب' })
    .trim()
    .min(1, 'عنوان الصفحة مطلوب')
    .max(120, 'عنوان الصفحة بيزيد عن 120 حرف'),
  body: z
    .string({ message: 'محتوى الصفحة مطلوب' })
    .trim()
    .max(50000, 'محتوى الصفحة بيزيد عن 50000 حرف'),
  seoTitle: z
    .string({ message: 'عنوان SEO غير صالح' })
    .trim()
    .max(70, 'عنوان SEO بيزيد عن 70 حرف')
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  seoDescription: z
    .string({ message: 'وصف SEO غير صالح' })
    .trim()
    .max(160, 'وصف SEO بيزيد عن 160 حرف')
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  published: z.boolean({ message: 'حالة النشر غير صالحة' }),
  translations: pageTranslationsSchema.nullable().optional(),
})

export const guideTranslationsEnSchema = z
  .object({
    title: z.string().trim().max(120, 'عنوان الدليل بيزيد عن 120 حرف').nullable().optional(),
    summary: z.string().trim().max(280, 'ملخص الدليل بيزيد عن 280 حرف').nullable().optional(),
    body: z.string().trim().max(100000, 'محتوى الدليل بيزيد عن 100000 حرف').nullable().optional(),
    seoTitle: z.string().trim().max(70, 'عنوان SEO بيزيد عن 70 حرف').nullable().optional(),
    seoDescription: z.string().trim().max(160, 'وصف SEO بيزيد عن 160 حرف').nullable().optional(),
  })
  .transform((data) => {
    const res: {
      title?: string
      summary?: string
      body?: string
      seoTitle?: string
      seoDescription?: string
    } = {}
    if (data.title && data.title.length > 0) res.title = data.title
    if (data.summary && data.summary.length > 0) res.summary = data.summary
    if (data.body && data.body.length > 0) res.body = data.body
    if (data.seoTitle && data.seoTitle.length > 0) res.seoTitle = data.seoTitle
    if (data.seoDescription && data.seoDescription.length > 0) res.seoDescription = data.seoDescription
    return res
  })

export const guideTranslationsSchema = z.object({
  en: guideTranslationsEnSchema.optional(),
})

export type GuideTranslationsEnInput = z.input<typeof guideTranslationsEnSchema>
export type GuideTranslationsEn = z.output<typeof guideTranslationsEnSchema>
export type GuideTranslationsInput = z.input<typeof guideTranslationsSchema>
export type GuideTranslations = z.output<typeof guideTranslationsSchema>

export const guideInputSchema = z.object({
  slug: z
    .string({ message: 'الرابط حروف إنجليزي صغيرة وأرقام وشرطة بس' })
    .regex(/^[a-z0-9-]{3,80}$/, 'الرابط حروف إنجليزي صغيرة وأرقام وشرطة بس'),
  title: z
    .string({ message: 'عنوان الدليل مطلوب' })
    .trim()
    .min(1, 'عنوان الدليل مطلوب')
    .max(120, 'عنوان الدليل بيزيد عن 120 حرف'),
  summary: z
    .string({ message: 'ملخص الدليل غير صالح' })
    .trim()
    .max(280, 'ملخص الدليل بيزيد عن 280 حرف')
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  cover: z
    .string({ message: 'صورة الغلاف غير صالحة' })
    .trim()
    .nullable()
    .refine((val) => val === null || isUploadedImage(val), {
      message: 'صورة الغلاف لازم تبدأ بـ /uploads/',
    }),
  body: z
    .string({ message: 'محتوى الدليل مطلوب' })
    .trim()
    .max(100000, 'محتوى الدليل بيزيد عن 100000 حرف'),
  categoryIds: z
    .array(z.string().min(1, 'معرف القسم غير صالح'))
    .max(4, 'أقصى عدد أقسام 4')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'أقسام مكررة',
    }),
  productIds: z
    .array(z.string().min(1, 'معرف المنتج غير صالح'))
    .max(4, 'أقصى عدد منتجات 4')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'منتجات مكررة',
    }),
  seoTitle: z
    .string({ message: 'عنوان SEO غير صالح' })
    .trim()
    .max(70, 'عنوان SEO بيزيد عن 70 حرف')
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  seoDescription: z
    .string({ message: 'وصف SEO غير صالح' })
    .trim()
    .max(160, 'وصف SEO بيزيد عن 160 حرف')
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  published: z.boolean({ message: 'حالة النشر غير صالحة' }),
  translations: guideTranslationsSchema.nullable().optional(),
})

export const guidePatchSchema = guideInputSchema.partial()

// Export types
export type HomeLinkInput = z.input<typeof homeLinkSchema>
export type HomeLinkOutput = z.output<typeof homeLinkSchema>
export type HomeContentInput = z.input<typeof homeContentSchema>
export type HomeContentOutput = z.output<typeof homeContentSchema>
export type HomeLayoutInput = z.input<typeof homeLayoutSchema>
export type HomeLayoutOutput = z.output<typeof homeLayoutSchema>
export type HomeDraftInput = z.input<typeof homeDraftInputSchema>
export type HomeDraftOutput = z.output<typeof homeDraftInputSchema>
export type HomePublishInput = z.input<typeof homePublishInputSchema>
export type HomePublishOutput = z.output<typeof homePublishInputSchema>
export type PageInput = z.input<typeof pageInputSchema>
export type PageInputOutput = z.output<typeof pageInputSchema>
export type GuideInput = z.input<typeof guideInputSchema>
export type GuideInputOutput = z.output<typeof guideInputSchema>
export type GuidePatch = z.input<typeof guidePatchSchema>
export type GuidePatchOutput = z.output<typeof guidePatchSchema>
