import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

config({ path: '../../.env', quiet: true })

import * as argon2 from 'argon2'
import { nanoid } from 'nanoid'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  Prisma,
  type AvailabilityMode,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '../src/generated/prisma/client.js'
import {
  ALL_PERMISSIONS,
  DEFAULT_HOME_CONTENT,
  DEFAULT_HOME_LAYOUT,
  DEFAULT_TEMPLATES,
  DEFAULT_ZONES,
  OWNER_ROLE_KEY,
  buildProductSearchText,
  egpToPiastres,
  findZone,
  type Permission,
} from '@serag/shared'
import { seedQuizzes } from './seed-quizzes.js'
import {
  buildModelCode,
  buildProductSlug,
  parseSpecs,
  splitBrand,
  type SetContentPiece,
  type SpecFieldDef,
} from './seed-helpers.js'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing. Set DATABASE_URL before running prisma db seed.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

// ============================================================================
// 1. RBAC PERMISSION LABELS
// ============================================================================

const PERMISSION_LABELS: Record<Permission, string> = {
  'orders.read': 'عرض الطلبات وحجوزات العرايس',
  'orders.update': 'تحديث حالات الطلبات والحجوزات',
  'orders.confirmPayment': 'تأكيد أو رفض التحويلات والعربون',
  'products.read': 'عرض المنتجات والأقسام والماركات',
  'products.write': 'إضافة وتعديل وأرشفة المنتجات',
  'products.import': 'استيراد وتحديث الأسعار والمخزون بملف CSV',
  'bridal.manage': 'إدارة باقات وإعدادات جهاز العروسة',
  'promotions.manage': 'إدارة عروض الفلاش وكوبونات الخصم',
  'reviews.moderate': 'مراجعة واعتماد تقييمات العملاء',
  'content.manage': 'إدارة محتوى الصفحة الرئيسية والصفحات والأدلة',
  'reports.read': 'عرض وتصدير تقارير المبيعات',
  'settings.manage': 'إدارة إعدادات المعرض والشحن والدفع',
  'notify.manage': 'إدارة قوائم الإبلاغ عند التوفر',
  'users.manage': 'إدارة المستخدمين والصلاحيات',
}

// ============================================================================
// 2. SEARCH SYNONYMS & SETTINGS
// ============================================================================

const SEARCH_SYNONYMS: string[][] = [
  ['تلاجه', 'ثلاجة', 'ثلاجه', 'refrigerator', 'fridge'],
  ['غساله', 'غسالة', 'washing', 'washer'],
  ['شاشه', 'شاشة', 'تليفزيون', 'تلفزيون', 'tv'],
  ['تكييف', 'مكيف', 'ac', 'air conditioner'],
  ['بوتاجاز', 'بوتجاز', 'موقد', 'cooker'],
  ['حلل', 'طقم حلل', 'cookware'],
  ['سامسونج', 'samsung'],
  ['إل جي', 'ال جي', 'lg'],
  ['توشيبا', 'toshiba', 'العربي'],
  ['شارب', 'sharp'],
  ['فريش', 'fresh'],
  ['تورنيدو', 'tornado'],
  ['يونيون إير', 'يونيون اير', 'unionaire'],
  ['انفرتر', 'إنفرتر', 'inverter'],
  ['نوفروست', 'نو فروست', 'no frost', 'nofrost'],
  ['ديفروست', 'defrost'],
]

// ============================================================================
// 3. SPEC TEMPLATES & CATEGORIES
// ============================================================================

interface CategorySeedDef {
  slug: string
  name: string
  templateName: string
  sort: number
  intro: string
  seoTitle: string
  seoDescription: string
  fields: SpecFieldDef[]
}

const CATEGORY_DEFS: CategorySeedDef[] = [
  {
    slug: 'refrigerators',
    name: 'ثلاجات وفريزر',
    templateName: 'ثلاجات',
    sort: 1,
    intro: 'تشكيلة ثلاجات نوفروست وديفروست أصلية بضمان الوكيل الرسمي وتوصيل لحد باب البيت.',
    seoTitle: 'ثلاجات وفريزر بأفضل سعر في مصر | معرض محمد سراج',
    seoDescription: 'اشترِ ثلاجات سامسونج وإل جي وتوشيبا وفريش بضمان الوكيل الرسمي من معرض محمد سراج بالمنصورة.',
    fields: [
      { key: 'capacity_l', label: 'السعة باللتر', type: 'number', unit: 'لتر', filterable: true, comparable: true },
      { key: 'capacity_ft', label: 'السعة بالقدم', type: 'number', unit: 'قدم', filterable: true, comparable: true },
      {
        key: 'cooling',
        label: 'نظام التبريد',
        type: 'choice',
        options: ['نوفروست', 'ديفروست'],
        filterable: true,
        comparable: true,
      },
      { key: 'inverter', label: 'موتور انفرتر', type: 'boolean', filterable: true, comparable: true },
      { key: 'doors', label: 'عدد الأبواب', type: 'number', filterable: true, comparable: true },
      {
        key: 'energy_class',
        label: 'كفاءة الطاقة',
        type: 'choice',
        options: ['A++', 'A+', 'A', 'B'],
        filterable: false,
        comparable: true,
      },
    ],
  },
  {
    slug: 'washers',
    name: 'غسالات',
    templateName: 'غسالات',
    sort: 2,
    intro: 'غسالات أوتوماتيك تحميل أمامي وفوق أوتوماتيك ونصف أوتوماتيك من أكبر الماركات المعتمدة.',
    seoTitle: 'غسالات ملابس أوتوماتيك وفوق أوتوماتيك | معرض محمد سراج',
    seoDescription: 'قارن أسعار ومواصفات غسالات إل جي وسامسونج وتوشيبا وتورنيدو بضمان الوكيل الرسمي.',
    fields: [
      { key: 'capacity_kg', label: 'سعة الغسيل', type: 'number', unit: 'كجم', filterable: true, comparable: true },
      { key: 'rpm', label: 'سرعة الدوران', type: 'number', unit: 'لفة/دقيقة', filterable: true, comparable: true },
      {
        key: 'loading',
        label: 'نوع التحميل',
        type: 'choice',
        options: ['أمامي', 'علوي', 'حوضين'],
        filterable: true,
        comparable: true,
      },
      { key: 'inverter', label: 'موتور انفرتر', type: 'boolean', filterable: true, comparable: true },
      { key: 'steam', label: 'غسيل بالبخار', type: 'boolean', filterable: true, comparable: true },
    ],
  },
  {
    slug: 'tvs',
    name: 'شاشات وتلفزيونات',
    templateName: 'شاشات',
    sort: 3,
    intro: 'شاشات سمارت 4K وQLED وFull HD بريسيفر داخلي وضمان رسمي.',
    seoTitle: 'شاشات وتلفزيونات سمارت 4K وQLED | معرض محمد سراج',
    seoDescription: 'تسوق أحدث شاشات سامسونج وإل جي وشارب بمقاسات متنوعة وضمان الوكيل المعتمد.',
    fields: [
      { key: 'size_in', label: 'المقاس', type: 'number', unit: 'بوصة', filterable: true, comparable: true },
      {
        key: 'resolution',
        label: 'الدقة',
        type: 'choice',
        options: ['HD', 'FHD', '4K', 'QLED'],
        filterable: true,
        comparable: true,
      },
      { key: 'smart', label: 'شاشة سمارت', type: 'boolean', filterable: true, comparable: true },
      { key: 'receiver', label: 'ريسيفر داخلي', type: 'boolean', filterable: true, comparable: true },
    ],
  },
  {
    slug: 'acs',
    name: 'تكييفات',
    templateName: 'تكييفات',
    sort: 4,
    intro: 'تكييفات سبليت بارد وبارد ساخن وتكنولوجيا انفرتر موفرة للكهرباء.',
    seoTitle: 'تكييفات شارب وتوشيبا وفريش إنفرتر | معرض محمد سراج',
    seoDescription: 'أفضل أسعار التكييفات السبليت 1.5 و2.25 و3 حصان بضمان العربي جروب ومصانع فريش.',
    fields: [
      { key: 'hp', label: 'القدرة', type: 'number', unit: 'حصان', filterable: true, comparable: true },
      {
        key: 'mode',
        label: 'نظام التشغيل',
        type: 'choice',
        options: ['بارد', 'بارد ساخن'],
        filterable: true,
        comparable: true,
      },
      { key: 'inverter', label: 'تكنولوجيا انفرتر', type: 'boolean', filterable: true, comparable: true },
      { key: 'coverage_m2', label: 'مساحة التغطية', type: 'number', unit: 'م²', filterable: false, comparable: true },
    ],
  },
  {
    slug: 'cookers',
    name: 'بوتاجازات',
    templateName: 'بوتاجازات',
    sort: 5,
    intro: 'بوتاجازات غاز 4 و5 شعلة استانلس كامل وأمان كامل من أشهر المصانع المصرية.',
    seoTitle: 'بوتاجازات 4 و5 شعلة استانلس وأمان كامل | معرض محمد سراج',
    seoDescription: 'بوتاجازات يونيون إير وفريش وتورنيدو العربي بمروحة فرن وإشعال ذاتي بضمان المصنع.',
    fields: [
      { key: 'burners', label: 'عدد الشعلات', type: 'number', unit: 'شعلة', filterable: true, comparable: true },
      { key: 'width_cm', label: 'العرض', type: 'number', unit: 'سم', filterable: true, comparable: true },
      { key: 'fan', label: 'مروحة فرن', type: 'boolean', filterable: true, comparable: true },
      { key: 'auto_ignition', label: 'إشعال ذاتي', type: 'boolean', filterable: true, comparable: true },
    ],
  },
  {
    slug: 'cookware',
    name: 'أدوات مطبخ تركي',
    templateName: 'أدوات مطبخ',
    sort: 6,
    intro: 'أطقم حلل وأواني طهي تركية أصلية مستوردة مباشرة (جرانيت، ستانلس 18/10، سيراميك، تيفال).',
    seoTitle: 'أدوات مطبخ وأطقم حلل تركي أصلية | معرض محمد سراج',
    seoDescription: 'أطقم حلل تركي مستوردة حصرياً من مصانع TAÇ وGlore وÖztef وYonca وMarti وEdessa.',
    fields: [
      { key: 'pieces', label: 'عدد القطع', type: 'number', unit: 'قطعة', filterable: true, comparable: true },
      {
        key: 'material',
        label: 'الخامة',
        type: 'choice',
        options: ['جرانيت', 'ستانلس', 'سيراميك', 'تيفال'],
        filterable: true,
        comparable: true,
      },
      { key: 'induction', label: 'يدعم الحث الحراري', type: 'boolean', filterable: false, comparable: true },
      { key: 'dishwasher_safe', label: 'آمن لغسالة الأطباق', type: 'boolean', filterable: false, comparable: true },
    ],
  },
]

const CATEGORY_AR_TO_SLUG: Record<string, string> = {
  'ثلاجات وفريزر': 'refrigerators',
  غسالات: 'washers',
  'شاشات وتلفزيونات': 'tvs',
  تكييفات: 'acs',
  بوتاجازات: 'cookers',
  'أدوات مطبخ تركي': 'cookware',
}

// ============================================================================
// 4. CATALOG ITEMS & COOKWARE SETS
// ============================================================================

interface CatalogSeedItem {
  id: string
  name: string
  brand: string
  cat: string
  price: number
  old?: number
  cap: string
  tech: string
  warranty: string
  origin: string
  stock?: number
  availabilityMode?: AvailabilityMode
  leadTimeText?: string
  setContents?: SetContentPiece[]
}

// Exact 20 items from prototype/config.js lines 851-872
const PROTOTYPE_CATALOG: CatalogSeedItem[] = [
  {
    id: 's1',
    name: 'ثلاجة نوفروست بابين 450 لتر',
    brand: 'Samsung · سامسونج',
    cat: 'ثلاجات وفريزر',
    price: 28900,
    old: 32500,
    cap: '450 لتر (16 قدم)',
    tech: 'ديجيتال انفرتر · Twin Cooling',
    warranty: '10 سنوات ضمان سامسونج',
    origin: 'مصر — ضمان الوكيل',
  },
  {
    id: 's2',
    name: 'ثلاجة ديفروست 350 لتر',
    brand: 'Toshiba · توشيبا',
    cat: 'ثلاجات وفريزر',
    price: 19800,
    old: 22000,
    cap: '350 لتر (14 قدم)',
    tech: 'تبريد هجين · موفرة للطاقة',
    warranty: '10 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 's3',
    name: 'ثلاجة نوفروست ديجيتال 400 لتر',
    brand: 'LG · إل جي',
    cat: 'ثلاجات وفريزر',
    price: 31500,
    old: 34900,
    cap: '400 لتر ديجيتال',
    tech: 'Smart Inverter · Linear Cooling',
    warranty: '10 سنوات ضمان إل جي',
    origin: 'مصر / كوريا',
  },
  {
    id: 's4',
    name: 'ثلاجة ديفروست 14 قدم',
    brand: 'Fresh · فريش',
    cat: 'ثلاجات وفريزر',
    price: 17200,
    old: 19000,
    cap: '14 قدم (330 لتر)',
    tech: 'عزل حراري سميك · أرفف بايركس',
    warranty: '10 سنوات ضمان فريش',
    origin: 'مصر — مصانع فريش',
  },
  {
    id: 's5',
    name: 'غسالة أوتوماتيك فتحة أمامية 8 كجم',
    brand: 'LG · إل جي',
    cat: 'غسالات',
    price: 24500,
    old: 27000,
    cap: '8 كجم · 1200 لفة',
    tech: 'موتور دفع مباشر Direct Drive بالبخار',
    warranty: '10 سنوات على الموتور',
    origin: 'مصر — ضمان إل جي',
  },
  {
    id: 's6',
    name: 'غسالة أوتوماتيك 10 كجم إنفرتر',
    brand: 'Samsung · سامسونج',
    cat: 'غسالات',
    price: 29900,
    old: 33000,
    cap: '10 كجم · 1400 لفة',
    tech: 'ديجيتال انفرتر · EcoBubble',
    warranty: '10 سنوات ضمان سامسونج',
    origin: 'مصر — ضمان الوكيل',
  },
  {
    id: 's7',
    name: 'غسالة نصف أوتوماتيك 7 كجم',
    brand: 'Tornado · تورنيدو',
    cat: 'غسالات',
    price: 9800,
    old: 11200,
    cap: '7 كجم · حوضين',
    tech: 'موتور قوي · فلتر نسالة مزدوج',
    warranty: '5 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 's8',
    name: 'شاشة سمارت 55 بوصة 4K',
    brand: 'Samsung · سامسونج',
    cat: 'شاشات وتلفزيونات',
    price: 21900,
    old: 24500,
    cap: '55 بوصة 4K UHD',
    tech: 'معالج Crystal 4K · ريسيفر داخلي · HDR10+',
    warranty: 'سنتان ضمان سامسونج',
    origin: 'مصر — ضمان سامسونج',
  },
  {
    id: 's9',
    name: 'شاشة 43 بوصة Full HD',
    brand: 'Sharp · شارب',
    cat: 'شاشات وتلفزيونات',
    price: 11900,
    old: 13500,
    cap: '43 بوصة FHD',
    tech: 'إضاءة LED مباشرة · مدخلين HDMI + USB',
    warranty: '3 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 's10',
    name: 'شاشة QLED سمارت 65 بوصة',
    brand: 'LG · إل جي',
    cat: 'شاشات وتلفزيونات',
    price: 38900,
    old: 42000,
    cap: '65 بوصة QLED 4K',
    tech: 'ألوان Quantum · ذكاء اصطناعي ThinQ AI',
    warranty: 'سنتان ضمان إل جي',
    origin: 'مصر — ضمان إل جي',
  },
  {
    id: 's11',
    name: 'تكييف سبليت 1.5 حصان إنفرتر',
    brand: 'Sharp · شارب',
    cat: 'تكييفات',
    price: 26900,
    old: 29500,
    cap: '1.5 حصان (تغطية 14 م²)',
    tech: 'انفرتر موفر 40% · بلازما كلاستر ديجيتال',
    warranty: '5 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 's12',
    name: 'تكييف سبليت 2.25 حصان بارد ساخن',
    brand: 'Toshiba · توشيبا',
    cat: 'تكييفات',
    price: 34500,
    old: 37500,
    cap: '2.25 حصان (تغطية 20 م²)',
    tech: 'بارد ساخن · تربو كول · فلاتر مضادة للبكتيريا',
    warranty: '5 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 's13',
    name: 'تكييف سبليت 3 حصان بارد',
    brand: 'Fresh · فريش',
    cat: 'تكييفات',
    price: 38900,
    old: 42000,
    cap: '3 حصان (تغطية 26 م²)',
    tech: 'كباس تروبيكال للأجواء الحارة · تبريد فائق',
    warranty: '5 سنوات ضمان فريش',
    origin: 'مصر — مصانع فريش',
  },
  {
    id: 's14',
    name: 'بوتاجاز 5 شعلة ستانلس',
    brand: 'Unionaire · يونيون إير',
    cat: 'بوتاجازات',
    price: 14900,
    old: 16800,
    cap: '90 × 60 سم (5 شعلة)',
    tech: 'استانلس كامل · إشعال ذاتي · مروحة فرن',
    warranty: '5 سنوات ضمان يونيون إير',
    origin: 'مصر',
  },
  {
    id: 's15',
    name: 'بوتاجاز غاز 4 شعلة',
    brand: 'Fresh · فريش',
    cat: 'بوتاجازات',
    price: 9400,
    old: 10800,
    cap: '60 × 60 سم (4 شعلة)',
    tech: 'شواية بالموتور · إشعال أوتوماتيك',
    warranty: '5 سنوات ضمان فريش',
    origin: 'مصر — مصانع فريش',
  },
  {
    id: 's16',
    name: 'بوتاجاز غاز 5 شعلة بشاشة',
    brand: 'Tornado · تورنيدو',
    cat: 'بوتاجازات',
    price: 11700,
    old: 13200,
    cap: '90 × 60 سم ديجيتال',
    tech: 'شاشة تايمر ديجيتال · أمان كامل · حوامل زهر',
    warranty: '5 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 'f1',
    name: 'ثلاجة سامسونج 18 قدم نوفروست انفرتر',
    brand: 'Samsung · سامسونج',
    cat: 'ثلاجات وفريزر',
    price: 24900,
    old: 29500,
    cap: '18 قدم (500 لتر)',
    tech: 'ديجيتال انفرتر · نوفروست بالكامل',
    warranty: '10 سنوات ضمان سامسونج',
    origin: 'مصر — ضمان الوكيل',
  },
  {
    id: 'f2',
    name: 'غسالة توشيبا فوق أوتوماتيك 13 كيلو',
    brand: 'Toshiba · توشيبا',
    cat: 'غسالات',
    price: 14800,
    old: 17900,
    cap: '13 كيلو تحميل علوي',
    tech: 'موتور الدفع المباشر · 8 برامج غسيل',
    warranty: '5 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
  {
    id: 'f3',
    name: 'شاشة إل جي 55 بوصة 4K سمارت',
    brand: 'LG · إل جي',
    cat: 'شاشات وتلفزيونات',
    price: 18500,
    old: 22000,
    cap: '55 بوصة 4K UHD',
    tech: 'WebOS سمارت · ريموت ماجيك · HDR10',
    warranty: 'سنتان ضمان إل جي',
    origin: 'مصر — ضمان إل جي',
  },
  {
    id: 'f4',
    name: 'تكييف شارب 1.5 حصان بارد ساخن انفرتر',
    brand: 'Sharp · شارب',
    cat: 'تكييفات',
    price: 22400,
    old: 26200,
    cap: '1.5 حصان بارد ساخن',
    tech: 'انفرتر + بلازما كلاستر · شاشة ديجيتال',
    warranty: '5 سنوات العربي جروب',
    origin: 'مصر — ضمان العربي',
  },
]

// Stock counts from prototype/admin/assets/seed.js lines 17-38
const ADMIN_SEED_STOCK: Record<string, number> = {
  s1: 14,
  s2: 6,
  s3: 3,
  s4: 9,
  s5: 22,
  s6: 17,
  s7: 31,
  s8: 9,
  s9: 12,
  s10: 4,
  s11: 2,
  s12: 8,
  s13: 5,
  s14: 11,
  s15: 26,
  s16: 7,
  f1: 18,
  f2: 13,
  f3: 10,
  f4: 3,
}

// 6 Turkish cookware sets covering all 6 Turkish brands in prototype/assets/brands
const COOKWARE_CATALOG: CatalogSeedItem[] = [
  {
    id: 'c1',
    name: 'طقم حلل جرانيت 10 قطع تاك التركي',
    brand: 'TAÇ · تاك',
    cat: 'أدوات مطبخ تركي',
    price: 8900,
    old: 10200,
    cap: '10 قطع جرانيت تركي تقيل',
    tech: 'جرانيت 5 طبقات · يدعم الحث الحراري · آمن لغسالة الأطباق',
    warranty: '3 سنوات ضمان ضد التقشير وعيوب الصناعة',
    origin: 'تركيا — استيراد محمد سراج المباشر',
    stock: 10,
    setContents: [
      { item: 'حلة جرانيت بالغطاء', size: '18 سم', qty: 1 },
      { item: 'حلة جرانيت بالغطاء', size: '20 سم', qty: 1 },
      { item: 'حلة جرانيت بالغطاء', size: '24 سم', qty: 1 },
      { item: 'حلة جرانيت بالغطاء', size: '28 سم', qty: 1 },
      { item: 'مقلاية جرانيت عميقة', size: '26 سم', qty: 1 },
      { item: 'لبانة جرانيت', size: '16 سم', qty: 1 },
    ],
  },
  {
    id: 'c2',
    name: 'طقم حلل ستانلس ستيل 12 قطعة جلور التركي',
    brand: 'Glore · جلور',
    cat: 'أدوات مطبخ تركي',
    price: 9500,
    old: 10800,
    cap: '12 قطعة ستانلس 18/10',
    tech: 'ستانلس كروم نيكل 18/10 · يدعم الحث الحراري · آمن لغسالة الأطباق',
    warranty: '5 سنوات ضمان ضد الصدأ',
    origin: 'تركيا — استيراد محمد سراج المباشر',
    stock: 8,
    setContents: [
      { item: 'حلة ستانلس بالغطاء', size: '16 سم', qty: 1 },
      { item: 'حلة ستانلس بالغطاء', size: '20 سم', qty: 1 },
      { item: 'حلة ستانلس بالغطاء', size: '24 سم', qty: 1 },
      { item: 'حلة ستانلس كبيرة بالغطاء', size: '28 سم', qty: 1 },
      { item: 'كسرولة ستانلس بالغطاء', size: '16 سم', qty: 1 },
      { item: 'براد شاي تركي مزدوج', size: '2 لتر', qty: 1 },
    ],
  },
  {
    id: 'c3',
    name: 'طقم حلل جرانيت زهر 9 قطع أوزتيف دوكوم',
    brand: 'Oztef · أوزتيف دوكوم',
    cat: 'أدوات مطبخ تركي',
    price: 11200,
    old: 12800,
    cap: '9 قطع جرانيت صب ثقيل',
    tech: 'جرانيت ديكاست ثقيل · آمن لغسالة الأطباق',
    warranty: '3 سنوات ضمان ضد عيوب الصناعة',
    origin: 'تركيا — استيراد محمد سراج المباشر',
    stock: 6,
    setContents: [
      { item: 'حلة جرانيت صب بالغطاء', size: '20 سم', qty: 1 },
      { item: 'حلة جرانيت صب بالغطاء', size: '24 سم', qty: 1 },
      { item: 'حلة جرانيت صب بالغطاء', size: '28 سم', qty: 1 },
      { item: 'حلة قصيرة بالغطاء', size: '26 سم', qty: 1 },
      { item: 'جريل شوي مضلع', size: '28 سم', qty: 1 },
    ],
  },
  {
    id: 'c4',
    name: 'طقم حلل تيفال 14 قطعة يونجا التركي',
    brand: 'Yonca · يونجا',
    cat: 'أدوات مطبخ تركي',
    price: 7600,
    old: 8500,
    cap: '14 قطعة تيفال مانع للالتصاق',
    tech: 'تيفال صحي خالي من PFOA · آمن لغسالة الأطباق',
    warranty: 'سنتان ضمان استبدال',
    origin: 'تركيا — استيراد محمد سراج المباشر',
    stock: 12,
    setContents: [
      { item: 'حلة تيفال بالغطاء', size: '18 سم', qty: 1 },
      { item: 'حلة تيفال بالغطاء', size: '22 سم', qty: 1 },
      { item: 'حلة تيفال بالغطاء', size: '26 سم', qty: 1 },
      { item: 'مقلاية تيفال', size: '22 سم', qty: 1 },
      { item: 'مقلاية تيفال', size: '26 سم', qty: 1 },
      { item: 'طقم توزيع حراري', qty: 4 },
    ],
  },
  {
    id: 'c5',
    name: 'طقم حلل سيراميك 8 قطع مارتي التركي',
    brand: 'Marti · مارتي',
    cat: 'أدوات مطبخ تركي',
    price: 6800,
    cap: '8 قطع سيراميك طبيعي',
    tech: 'سيراميك تركي مقاوم للخدش · يدعم الحث الحراري · آمن لغسالة الأطباق',
    warranty: 'سنتان ضمان ضد عيوب الصناعة',
    origin: 'تركيا — استيراد محمد سراج المباشر',
    stock: 4,
    availabilityMode: 'on_request',
    leadTimeText: 'التوصيل خلال 7–10 أيام',
    setContents: [
      { item: 'حلة سيراميك بالغطاء', size: '20 سم', qty: 1 },
      { item: 'حلة سيراميك بالغطاء', size: '24 سم', qty: 1 },
      { item: 'حلة سيراميك بالغطاء', size: '28 سم', qty: 1 },
      { item: 'طاسة قلاية سيراميك', size: '24 سم', qty: 2 },
    ],
  },
  {
    id: 'c6',
    name: 'طقم حلل وصواني سيراميك 7 قطع إيديسا التركي',
    brand: 'Edessa · إيديسا',
    cat: 'أدوات مطبخ تركي',
    price: 5900,
    old: 6600,
    cap: '7 قطع سيراميك فرن وبوتاجاز',
    tech: 'سيراميك حراري تركي · آمن لغسالة الأطباق',
    warranty: 'سنتان ضمان ضد عيوب الصناعة',
    origin: 'تركيا — استيراد محمد سراج المباشر',
    stock: 0,
    availabilityMode: 'auto',
    setContents: [
      { item: 'حلة سيراميك بالغطاء', size: '20 سم', qty: 1 },
      { item: 'حلة سيراميك بالغطاء', size: '24 سم', qty: 1 },
      { item: 'صينية فرن سيراميك مستطيلة', size: '30 سم', qty: 1 },
      { item: 'صينية فرن سيراميك بيضاوية', size: '26 سم', qty: 1 },
      { item: 'مقلاية سيراميك', size: '24 سم', qty: 1 },
    ],
  },
]

const TURKISH_BRAND_DEFS: Array<{ slug: string; name: string; enName: string; intro: string }> = [
  {
    slug: 'tac',
    name: 'تاك',
    enName: 'TAÇ',
    intro: 'تاك (TAÇ) التركية — أطقم حلل جرانيت وأدوات مائدة فاخرة باستيراد مباشر.',
  },
  {
    slug: 'glore',
    name: 'جلور',
    enName: 'Glore',
    intro: 'جلور (Glore) التركية — أطقم ستانلس ستيل وزجاج وبورسلين تركي أصلي.',
  },
  {
    slug: 'yonca',
    name: 'يونجا',
    enName: 'Yonca',
    intro: 'يونجا (Yonca) التركية — أواني طهي عملية وعصرية بجودة تركية معتمدة.',
  },
  {
    slug: 'oztef',
    name: 'أوزتيف دوكوم',
    enName: 'Öztef Döküm',
    intro: 'أوزتيف دوكوم (Öztef Döküm) — حلل جرانيت وزهر تركي صب ثقيل لتوزيع مثالي للحرارة.',
  },
  {
    slug: 'marti',
    name: 'مارتي',
    enName: 'Marti',
    intro: 'مارتي (Marti) التركية — أطقم طهي سيراميك وأدوات مائدة ومنزل.',
  },
  {
    slug: 'edessa',
    name: 'إيديسا',
    enName: 'Edessa',
    intro: 'إيديسا (Edessa) التركية — أطقم سيراميك وبورسلين حراري تركي.',
  },
]

// ============================================================================
// 5. BRAND LOGO FILE COPY HELPER
// ============================================================================

function syncBrandLogos(): Map<string, string> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const relSourceDir = '../../prototype/assets/brands'
  const sourceDir = fs.existsSync(relSourceDir)
    ? relSourceDir
    : path.resolve(scriptDir, '../../../prototype/assets/brands')

  const uploadsRoot = process.env.UPLOADS_DIR ?? '../../uploads'
  const destDir = path.join(uploadsRoot, 'brands')
  fs.mkdirSync(destDir, { recursive: true })

  const slugToLogoUrl = new Map<string, string>()

  if (!fs.existsSync(sourceDir)) {
    return slugToLogoUrl
  }

  const files = fs.readdirSync(sourceDir)
  for (const file of files) {
    const srcFile = path.join(sourceDir, file)
    const srcStat = fs.statSync(srcFile)
    if (!srcStat.isFile()) continue

    const destFile = path.join(destDir, file)
    let shouldCopy = true
    if (fs.existsSync(destFile)) {
      const destStat = fs.statSync(destFile)
      if (destStat.size === srcStat.size) {
        shouldCopy = false
      }
    }

    if (shouldCopy) {
      fs.copyFileSync(srcFile, destFile)
    }

    const stem = path.parse(file).name.toLowerCase()
    slugToLogoUrl.set(stem, `/uploads/brands/${file}`)
  }

  return slugToLogoUrl
}

// ============================================================================
// 6. MAIN SEED EXECUTION
// ============================================================================

async function main() {
  // --------------------------------------------------------------------------
  // 6.1 Permissions, Owner Role & Admin User
  // --------------------------------------------------------------------------
  const permissionRecords = new Map<Permission, { id: string; key: string }>()
  for (const key of ALL_PERMISSIONS) {
    const label = PERMISSION_LABELS[key]
    const perm = await prisma.permission.upsert({
      where: { key },
      update: { label },
      create: { key, label },
    })
    permissionRecords.set(key, perm)
  }

  const ownerRole = await prisma.role.upsert({
    where: { key: OWNER_ROLE_KEY },
    update: { name: 'مدير المتجر' },
    create: { key: OWNER_ROLE_KEY, name: 'مدير المتجر' },
  })

  for (const perm of permissionRecords.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: perm.id,
      },
    })
  }

  let seededAdminId: string | null = null
  const adminEmail = process.env.ADMIN_EMAIL?.trim()
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME?.trim() || 'المدير'
  const resetAdminPassword = process.env.SEED_RESET_ADMIN_PASSWORD === 'true'

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD is not set — skipping admin user seed.')
  } else {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existingAdmin) {
      const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id })
      const createdAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          active: true,
        },
      })
      seededAdminId = createdAdmin.id
    } else if (resetAdminPassword) {
      const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id })
      const updatedAdmin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: adminName,
          passwordHash,
          active: true,
        },
      })
      seededAdminId = updatedAdmin.id
    } else {
      const updatedAdmin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: adminName,
          active: true,
        },
      })
      seededAdminId = updatedAdmin.id
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: seededAdminId,
          roleId: ownerRole.id,
        },
      },
      update: {},
      create: {
        userId: seededAdminId,
        roleId: ownerRole.id,
      },
    })
  }

  // --------------------------------------------------------------------------
  // 6.2 Spec Templates & Categories
  // --------------------------------------------------------------------------
  const categoryBySlug = new Map<string, { id: string; slug: string; name: string }>()

  for (const catDef of CATEGORY_DEFS) {
    const fieldsJson = catDef.fields as unknown as Prisma.InputJsonValue
    const existingTemplate = await prisma.specTemplate.findFirst({
      where: { name: catDef.templateName },
    })
    const specTemplate = existingTemplate
      ? await prisma.specTemplate.update({
          where: { id: existingTemplate.id },
          data: { fields: fieldsJson },
        })
      : await prisma.specTemplate.create({
          data: {
            name: catDef.templateName,
            fields: fieldsJson,
          },
        })

    const category = await prisma.category.upsert({
      where: { slug: catDef.slug },
      update: {
        name: catDef.name,
        specTemplateId: specTemplate.id,
        intro: catDef.intro,
        seoTitle: catDef.seoTitle,
        seoDescription: catDef.seoDescription,
        sort: catDef.sort,
        visible: true,
      },
      create: {
        slug: catDef.slug,
        name: catDef.name,
        specTemplateId: specTemplate.id,
        intro: catDef.intro,
        seoTitle: catDef.seoTitle,
        seoDescription: catDef.seoDescription,
        sort: catDef.sort,
        visible: true,
      },
    })

    categoryBySlug.set(catDef.slug, category)
  }

  // --------------------------------------------------------------------------
  // 6.3 Brands (CATALOG + Turkish cookware brands + logo copy)
  // --------------------------------------------------------------------------
  const logoMap = syncBrandLogos()
  const brandBySlug = new Map<string, { id: string; slug: string; name: string; enName: string }>()

  const catalogBrandMap = new Map<string, { slug: string; name: string; enName: string }>()
  for (const item of PROTOTYPE_CATALOG) {
    const parsed = splitBrand(item.brand)
    if (!catalogBrandMap.has(parsed.slug)) {
      catalogBrandMap.set(parsed.slug, parsed)
    }
  }

  let brandSort = 1
  for (const b of catalogBrandMap.values()) {
    const logoUrl = logoMap.get(b.slug) ?? null
    const intro = `أجهزة ${b.name} (${b.enName}) الأصلية بضمان الوكيل المعتمد في معرض محمد سراج.`
    const seoTitle = `منتجات وأسعار ${b.name} الأصلية | معرض محمد سراج`
    const seoDescription = `تسوق أحدث أجهزة ${b.name} بضمان الوكيل الرسمي وتوصيل لباب البيت من معرض محمد سراج.`

    const saved = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        logoUrl,
        intro,
        seoTitle,
        seoDescription,
        sort: brandSort,
        visible: true,
      },
      create: {
        slug: b.slug,
        name: b.name,
        logoUrl,
        intro,
        seoTitle,
        seoDescription,
        sort: brandSort,
        visible: true,
      },
    })
    brandBySlug.set(b.slug, { id: saved.id, slug: saved.slug, name: saved.name, enName: b.enName })
    brandSort += 1
  }

  for (const tb of TURKISH_BRAND_DEFS) {
    const logoUrl = logoMap.get(tb.slug) ?? null
    const seoTitle = `أطقم حلل وأدوات مطبخ ${tb.name} التركي | معرض محمد سراج`
    const seoDescription = tb.intro

    const saved = await prisma.brand.upsert({
      where: { slug: tb.slug },
      update: {
        name: tb.name,
        logoUrl,
        intro: tb.intro,
        seoTitle,
        seoDescription,
        sort: brandSort,
        visible: true,
      },
      create: {
        slug: tb.slug,
        name: tb.name,
        logoUrl,
        intro: tb.intro,
        seoTitle,
        seoDescription,
        sort: brandSort,
        visible: true,
      },
    })
    brandBySlug.set(tb.slug, { id: saved.id, slug: saved.slug, name: saved.name, enName: tb.enName })
    brandSort += 1
  }

  // --------------------------------------------------------------------------
  // 6.4 Products (20 CATALOG items + 6 Turkish cookware sets)
  // --------------------------------------------------------------------------
  const allCatalogItems: CatalogSeedItem[] = [...PROTOTYPE_CATALOG, ...COOKWARE_CATALOG]
  const productByModelCode = new Map<
    string,
    { id: string; slug: string; modelCode: string; name: string; price: number; taxRate: number }
  >()

  for (const item of allCatalogItems) {
    const categorySlug = CATEGORY_AR_TO_SLUG[item.cat]
    if (!categorySlug) {
      throw new Error(`Unknown category "${item.cat}" for product ${item.id}`)
    }
    const category = categoryBySlug.get(categorySlug)
    if (!category) {
      throw new Error(`Category record missing for slug "${categorySlug}"`)
    }

    const parsedBrand = splitBrand(item.brand)
    const brand = brandBySlug.get(parsedBrand.slug)
    if (!brand) {
      throw new Error(`Brand record missing for slug "${parsedBrand.slug}"`)
    }

    const slug = buildProductSlug(brand.slug, categorySlug, item.cap, item.id)
    const modelCode = buildModelCode(item.id)
    const price = egpToPiastres(item.price)
    const oldPrice = item.old !== undefined ? egpToPiastres(item.old) : null
    const specs = parseSpecs(item.cap, item.tech, categorySlug) as unknown as Prisma.InputJsonValue
    const stock = item.stock ?? ADMIN_SEED_STOCK[item.id] ?? 10
    const availabilityMode: AvailabilityMode = item.availabilityMode ?? 'auto'
    const leadTimeText = item.leadTimeText ?? null
    const featured = item.id.startsWith('f')
    const setContents = item.setContents
      ? (item.setContents as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull
    const warrantyActivation =
      categorySlug === 'cookware'
        ? 'الضمان ساري بالفاتورة المختومة من معرض محمد سراج'
        : 'فعّل الضمان بالاتصال بالخط الساخن للوكيل المعتمد عند التركيب'

    const searchText = buildProductSearchText(
      {
        name: item.name,
        brandNames: [brand.enName, brand.name],
        categoryName: category.name,
        modelCode,
        extra: [item.cap, item.tech],
      },
      SEARCH_SYNONYMS,
    )

    const productData = {
      slug,
      name: item.name,
      brandId: brand.id,
      categoryId: category.id,
      specs,
      price,
      oldPrice,
      stock,
      lowStockThreshold: 3,
      availabilityMode,
      leadTimeText,
      warranty: item.warranty,
      warrantyActivation,
      origin: item.origin,
      setContents,
      visible: true,
      featured,
      taxRate: 14,
      seoTitle: `${item.name} - ${brand.name} | معرض محمد سراج`,
      seoDescription: `${item.name} (${item.cap}) — ${item.tech} — ${item.warranty}.`,
      searchText,
    }

    const savedProduct = await prisma.product.upsert({
      where: { modelCode },
      update: productData,
      create: {
        modelCode,
        ...productData,
      },
    })

    productByModelCode.set(modelCode, {
      id: savedProduct.id,
      slug: savedProduct.slug,
      modelCode: savedProduct.modelCode,
      name: savedProduct.name,
      price: savedProduct.price,
      taxRate: savedProduct.taxRate,
    })
  }

  // --------------------------------------------------------------------------
  // 6.5 Settings
  // --------------------------------------------------------------------------
  const settingsEntries: Array<{ key: string; value: Prisma.InputJsonValue }> = [
    {
      key: 'store',
      value: {
        name: 'معرض محمد سراج',
        phone: '[رقم الهاتف]',
        whatsapp: '[رقم الواتساب]',
        tradersWhatsapp: '[رقم الواتساب]',
        address: '[عنوان المعرض]',
        hours: '[مواعيد العمل]',
      },
    },
    {
      key: 'payments',
      value: {
        methods: {
          cod: {
            enabled: true,
            name: 'الدفع عند الاستلام',
            hint: 'ادفع نقداً عند استلام ومعاينة الجهاز',
          },
          instapay: {
            enabled: true,
            name: 'إنستا باي',
            account: 'serag@instapay',
            hint: 'حوّل على عنوان الدفع ده من تطبيق إنستا باي',
          },
          vodafone_cash: {
            enabled: true,
            name: 'فودافون كاش',
            account: '[رقم فودافون كاش]',
            hint: 'حوّل من محفظتك على الرقم ده',
          },
          fawry: {
            enabled: false,
            name: 'فوري',
            account: '[كود فوري]',
            hint: 'ادفع بالكود ده من أي فرع أو تطبيق فوري (بانتظار تأكيد الإدارة)',
          },
        },
      },
    },
    {
      key: 'zones',
      value: DEFAULT_ZONES as unknown as Prisma.InputJsonValue,
    },
    {
      key: 'codDeposit',
      value: {
        threshold: egpToPiastres(30000),
        pct: 10,
      },
    },
    {
      key: 'bridal',
      value: {
        depositPct: 10,
        lockDays: 30,
      },
    },
    {
      key: 'searchSynonyms',
      value: SEARCH_SYNONYMS as unknown as Prisma.InputJsonValue,
    },
    {
      key: 'templates',
      value: DEFAULT_TEMPLATES as unknown as Prisma.InputJsonValue,
    },
    {
      key: 'vat',
      value: {
        rate: 14,
        label: 'الأسعار شاملة ضريبة القيمة المضافة',
      },
    },
  ]

  // Create-only: settings are the owner's data (store numbers, payment accounts, zones,
  // templates). Re-running the seed must never put the placeholders back.
  for (const entry of settingsEntries) {
    await prisma.setting.upsert({
      where: { key: entry.key },
      update: {},
      create: { key: entry.key, value: entry.value },
    })
  }

  // --------------------------------------------------------------------------
  // 6.6 Bridal Tiers
  // --------------------------------------------------------------------------
  const requireProductId = (code: string): string => {
    const found = productByModelCode.get(code)
    if (!found) {
      throw new Error(`Product ${code} not found when building bridal tiers`)
    }
    return found.id
  }

  const bridalTierDefs = [
    {
      slug: 'basic',
      name: 'أساسية',
      sort: 1,
      highlights: [
        'كل الأساسيات لبيت جديد بأفضل سعر',
        'أجهزة مضمونة فرز أول بضمان الوكيل الرسمي',
        'طقم حلل جرانيت تركي أصلي للمطبخ',
      ],
      rooms: [
        {
          key: 'kitchen',
          items: [
            { productId: requireProductId('SR-S4'), qty: 1 },
            { productId: requireProductId('SR-S15'), qty: 1 },
          ],
        },
        {
          key: 'laundry',
          items: [{ productId: requireProductId('SR-S7'), qty: 1 }],
        },
        {
          key: 'living',
          items: [{ productId: requireProductId('SR-S9'), qty: 1 }],
        },
        {
          key: 'bedrooms',
          items: [{ productId: requireProductId('SR-F4'), qty: 1 }],
        },
        {
          key: 'kitchenware',
          items: [{ productId: requireProductId('SR-C4'), qty: 1 }],
        },
      ],
    },
    {
      slug: 'golden',
      name: 'ذهبية',
      sort: 2,
      highlights: [
        'المزيج المثالي بين المواصفات العالية والسعر المناسب',
        'أجهزة أوتوماتيك وانفرتر موفرة للكهرباء',
        'شاشة سمارت 4K وتكييف للريسبشن وغرفة النوم',
        'طقم جرانيت تركي فاخر متكامل',
      ],
      rooms: [
        {
          key: 'kitchen',
          items: [
            { productId: requireProductId('SR-S1'), qty: 1 },
            { productId: requireProductId('SR-S16'), qty: 1 },
          ],
        },
        {
          key: 'laundry',
          items: [{ productId: requireProductId('SR-S5'), qty: 1 }],
        },
        {
          key: 'living',
          items: [{ productId: requireProductId('SR-S8'), qty: 1 }],
        },
        {
          key: 'bedrooms',
          items: [
            { productId: requireProductId('SR-S11'), qty: 1 },
            { productId: requireProductId('SR-F4'), qty: 1 },
          ],
        },
        {
          key: 'kitchenware',
          items: [{ productId: requireProductId('SR-C1'), qty: 1 }],
        },
      ],
    },
    {
      slug: 'palace',
      name: 'القصر',
      sort: 3,
      highlights: [
        'أعلى فئة لتجهيز متكامل بأرقى الماركات العالمية',
        'شاشة QLED عملاقة مع تكييفات لجميع الغرف',
        'ثلاجة وغسالة ذكية بأحدث تكنولوجيا',
        'طقمين أواني طهي تركي جرانيت وستانلس أصلي',
      ],
      rooms: [
        {
          key: 'kitchen',
          items: [
            { productId: requireProductId('SR-S3'), qty: 1 },
            { productId: requireProductId('SR-S14'), qty: 1 },
          ],
        },
        {
          key: 'laundry',
          items: [{ productId: requireProductId('SR-S6'), qty: 1 }],
        },
        {
          key: 'living',
          items: [{ productId: requireProductId('SR-S10'), qty: 1 }],
        },
        {
          key: 'bedrooms',
          items: [
            { productId: requireProductId('SR-S13'), qty: 1 },
            { productId: requireProductId('SR-S12'), qty: 2 },
          ],
        },
        {
          key: 'kitchenware',
          items: [
            { productId: requireProductId('SR-C2'), qty: 1 },
            { productId: requireProductId('SR-C3'), qty: 1 },
          ],
        },
      ],
    },
  ]

  for (const tier of bridalTierDefs) {
    const roomsJson = tier.rooms as unknown as Prisma.InputJsonValue
    const highlightsJson = tier.highlights as unknown as Prisma.InputJsonValue
    await prisma.bridalTier.upsert({
      where: { slug: tier.slug },
      update: {
        name: tier.name,
        sort: tier.sort,
        highlights: highlightsJson,
        rooms: roomsJson,
      },
      create: {
        slug: tier.slug,
        name: tier.name,
        sort: tier.sort,
        highlights: highlightsJson,
        rooms: roomsJson,
      },
    })
  }

  // --------------------------------------------------------------------------
  // 6.6b Demo flash sale (dev only): one in-stock product from four departments, 12% off, ending
  // in three days, so the home flash section and its countdown show. CI and production seeds set
  // `SEED_DEMO_FLASH=false`: a running sale would change the prices the browser suite expects.
  // --------------------------------------------------------------------------
  if (process.env.SEED_DEMO_FLASH !== 'false') {
    const demoFlashName = 'عروض الفلاش (تجريبي)'
    const flashProducts = []
    for (const slug of ['refrigerators', 'washers', 'acs', 'tvs']) {
      const product = await prisma.product.findFirst({
        where: { category: { slug }, stock: { gt: 0 }, visible: true, archivedAt: null },
        orderBy: { price: 'desc' },
      })
      if (product) flashProducts.push(product)
    }
    const startsAt = new Date(Date.now() - 60 * 60 * 1000)
    const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const existingFlash = await prisma.flashSale.findFirst({ where: { name: demoFlashName } })
    const flash = existingFlash
      ? await prisma.flashSale.update({ where: { id: existingFlash.id }, data: { startsAt, endsAt } })
      : await prisma.flashSale.create({ data: { name: demoFlashName, startsAt, endsAt } })
    for (const product of flashProducts) {
      // 12% off, rounded down to a whole 10 EGP (1,000 piastres)
      const salePrice = Math.floor((product.price * 0.88) / 1000) * 1000
      await prisma.flashSaleItem.upsert({
        where: { flashSaleId_productId: { flashSaleId: flash.id, productId: product.id } },
        create: { flashSaleId: flash.id, productId: product.id, salePrice },
        update: { salePrice },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 6.7 Content (Published Home ContentVersion + 6 Policy/Info Pages)
  // --------------------------------------------------------------------------
  const homeData = JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)) as Prisma.InputJsonValue
  const homeLayout = JSON.parse(JSON.stringify(DEFAULT_HOME_LAYOUT)) as Prisma.InputJsonValue

  // Create-only: once a home version is published it belongs to the owner (the editor);
  // re-running the seed must not replace it.
  const existingHomeVersion = await prisma.contentVersion.findFirst({
    where: { page: 'home', status: 'published' },
  })
  if (!existingHomeVersion) {
    await prisma.contentVersion.create({
      data: {
        page: 'home',
        status: 'published',
        data: homeData,
        layout: homeLayout,
        label: 'النسخة الافتتاحية',
        publishedAt: new Date(),
        userId: seededAdminId,
      },
    })
  }

  const pageDefs = [
    {
      slug: 'about',
      title: 'من نحن — معرض محمد سراج',
      seoTitle: 'من نحن | معرض محمد سراج',
      seoDescription: 'تعرف على قصة معرض محمد سراج بالمنصورة منذ عام 1972، وتشكيلتنا من الأجهزة المنزلية الأصلية وأدوات المطبخ التركية بضمان الوكيل الرسمي.',
      body: `<p>أهلاً بكم في معرض محمد سراج، وجهتكم الموثوقة للأجهزة المنزلية ومستلزمات المطبخ في المنصورة والدلتا منذ أكثر من خمسين عاماً.</p>
<h2>قصتنا منذ عام 1972</h2>
<p>بدأت رحلتنا في قلب مدينة المنصورة عام 1972 على مبدأ بسيط وراسخ: تقديم أجهزة كهربائية أصلية ومضمونة مع المعاملة الصادقة والنصيحة الأمينة لكل بيت. على مدار عقود، واكبنا تطور السوق المصري وخدمنا أجيالاً متتالية من العائلات الكريمة وأصحاب المحلات والتجار، ونجحنا في بناء اسم يرتبط دائماً بالأمانة والاعتمادية وجودة ما بعد البيع.</p>
<h2>ماذا نقدم في المعرض؟</h2>
<p>نوفر لعملائنا باقة متكاملة من الأجهزة المنزلية الأساسية من كبرى الماركات المعتمدة، وتشمل ثلاجات وديب فريزر، غسالات ملابس أوتوماتيك وفوق أوتوماتيك، شاشات وتلفزيونات سمارت، تكييفات هواء موفرة للطاقة، وبوتاجازات حديثة. كما نتميز بتشكيلة واسعة ومختارة بعناية من أدوات المطبخ وأطقم أواني الطهي التركية الأصلية المستوردة، المصنوعة من خامات الجرانيت والاستانلس ستيل الصحي لتدوم طويلاً وتلبي كل احتياجات الطهي اليومي.</p>
<h2>لماذا تختار الشراء منا؟</h2>
<ul>
<li><strong>أجهزة أصلية 100%:</strong> جميع الأجهزة فرز أول معتمد مع شهادة ضمان معتمدة من الوكيل الرسمي وفاتورة شراء رسمية.</li>
<li><strong>ضمان رسمي معتمد:</strong> نتعامل مباشرة مع الوكلاء الرسميين لضمان حقوق عملائنا في الصيانة والدعم الفني المعتمد.</li>
<li><strong>أسطول توصيل خاص بالمعرض:</strong> نقوم بنقل وشحن الأجهزة بسياراتنا المجهزة لضمان وصول الأجهزة الكبيرة والقطع الحساسة بأمان تام حتى باب بيتك.</li>
<li><strong>نصيحة فنية صادقة:</strong> نساعدك في اختيار الموديل والقدرة الأنسب لاحتياج بيتك وميزانيتك دون مبالغة.</li>
</ul>
<h2>خدمات التجار والمبيعات بالجملة</h2>
<p>إلى جانب خدمة الأسر والمستهلك الفردي، يسعدنا تلبية طلبات التجار وأصحاب الأنشطة التجارية والتوزيع، ويمكنكم الاطلاع على تفاصيل وشروط التعامل عبر صفحة <a href="/traders">مبيعات الجملة والتجار</a>.</p>
<h2>تفضلوا بزيارتنا أو تواصلوا معنا</h2>
<p>يمكنكم تصفح وشراء جميع الموديلات المتاحة مباشرة عبر <a href="/shop">كتالوج المنتجات على الموقع</a>، أو تشريفنا بالزيارة في صالة عرض معرض محمد سراج بالمنصورة لمعاينة الأجهزة على الطبيعة، كما يمكنكم دائماً التحدث إلينا مباشرة؛ كلمنا على واتساب من الزرار اللي في الموقع لأي استفسار وسنكون سعداء بخدمتكم.</p>`,
    },
    {
      slug: 'delivery',
      title: 'سياسة الشحن والتوصيل',
      seoTitle: 'الشحن والتوصيل | معرض محمد سراج',
      seoDescription: 'تعرف على خدمة الشحن بسيارات معرض محمد سراج للمنصورة والدقهلية والدلتا وكافة محافظات مصر وطرق تحديد وتنسيق موعد الاستلام.',
      body: `<p>نحرص في معرض محمد سراج على وصول أجهزتك المنزلية بسلامة تامة وسرعة موثوقة حتى باب بيتك في مختلف محافظات جمهورية مصر العربية.</p>
<h2>توصيل آمن بسيارات المعرض المجهزة</h2>
<p>نعتمد على أسطول سيارات النقل الخاص بمعرض محمد سراج، والمجهز خصيصاً لتحميل ونقل الأجهزة الكهربائية الكبيرة والحساسة، مثل الثلاجات والغسالات والشاشات، مع فريق مدرب يتعامل مع البضائع بحرص شديد لتفادي أي صدمات أو تلفيات أثناء النقل.</p>
<h2>مناطق التغطية الجغرافية</h2>
<p>تغطي خدمات التوصيل لدينا مدينة المنصورة ومراكز محافظة الدقهلية كافة، بالإضافة إلى جميع محافظات الدلتا وباقي محافظات مصر من الوجه البحري حتى الوجه القبلي. كما يتيح المعرض خيار الاستلام المباشر والمعاينة الشخصية من داخل صالة العرض بالمنصورة للعملاء الراغبين في ذلك.</p>
<h2>مصاريف الشحن وحساب التكلفة</h2>
<p>تختلف مصاريف التوصيل باختلاف المحافظة والمدينة المحددة في عنوان الاستلام. يتم احتساب التكلفة بدقة وعرضها بوضوح داخل <a href="/checkout">صفحة إتمام الطلب</a> قبل تأكيد طلبك بشكل نهائي، حتى تكون على دراية كاملة بالتكلفة الإجمالية دون أي رسوم مخفية.</p>
<h2>تنسيق موعد ومواعيد التسليم</h2>
<p>إذا كنت ترغب في تحديد موعد محدد لوصول الشحنة ليتناسب مع وقت فراغك ووجودك في المنزل، يمكنك ترتيب ذلك بسهولة: كلمنا على واتساب من الزرار اللي في الموقع بعد إتمام طلبك وسيقوم فريق المتابعة بتنسيق اليوم المناسب للتسليم.</p>
<h2>فحص واستلام الأجهزة</h2>
<p>يُرجى مراجعة الكرتونة الخارجية ومطابقة الموديل والتأكد من سلامة التغليف قبل استلام الأجهزة والتوقيع لمندوب التوصيل. لمعرفة تفاصيل الشروط في حال رغبتكم في الاسترجاع أو الاستبدال، يمكنكم مراجعة <a href="/pages/returns">سياسة الاستبدال والاسترجاع</a>، ولأي مساعدة أو استفسار يمكنكم دوماً التواصل معنا.</p>`,
    },
    {
      slug: 'returns',
      title: 'سياسة الاستبدال والاسترجاع',
      seoTitle: 'الاستبدال والاسترجاع | معرض محمد سراج',
      seoDescription: 'سياسة استبدال واسترجاع الأجهزة في معرض محمد سراج وفق قانون حماية المستهلك المصري رقم 181 لسنة 2018 وخطوات التعامل مع الأعطال.',
      body: `<p>نلتزم في معرض محمد سراج بضمان حقوق عملائنا كاملة وتقديم تجربة تسوق آمنة ومريحة وفقاً لأحكام قانون حماية المستهلك المصري رقم 181 لسنة 2018 ولائحته التنفيذية.</p>
<h2>الاسترجاع والاستبدال خلال 14 يوماً (المنتج غير المستخدم)</h2>
<p>يحق للعميل استبدال أو استرجاع المنتج غير المستخدم خلال 14 يوماً من تاريخ استلامه، وذلك وفق الشروط الآتية:</p>
<ul>
<li>أن يكون الجهاز في حالته الأصلية تماماً، داخل كرتونته الأصلية المغلقة والمحكمة بالغلق المصنعي دون أي فتح أو فض للشريط اللاصق أو تشغيل.</li>
<li>أن تكون كافة مشتملات الجهاز والكتالوجات وشهادات الضمان والملحقات والإكسسوارات المرفقة موجودة بحالتها السليمة.</li>
<li>يُفضّل الاحتفاظ بفاتورة الشراء الصادرة من معرض محمد سراج لتسهيل الإجراءات.</li>
</ul>
<h2>التعامل مع عيوب الصناعة خلال 30 يوماً</h2>
<p>في حال ظهور أي عيب صناعة أو مشكلة تقنية خلال 30 يوماً من تاريخ الاستلام، يتم التعامل وفق الضوابط الآتية:</p>
<ul>
<li>التواصل المباشر مع مركز الخدمة والصيانة المعتمد للوكيل الرسمي للماركة (عبر الخط الساخن الموضح في شهادة الضمان) لطلب فحص ومعاينة منزلية للجهاز.</li>
<li>يقوم فني الصيانة المعتمد بفحص الجهاز وإصدار تقرير فني رسمي يثبت وجود عيب صناعة في المنتج.</li>
<li>بموجب التقرير الفني المعتمد، يلتزم الوكيل والمعرض باتخاذ إجراءات الاستبدال أو الاسترجاع المنصوص عليها قانوناً. لمزيد من التفاصيل حول حقوق الصيانة، يرجى مراجعة صفحة <a href="/pages/warranty">الضمان والصيانة المعتمدة</a>.</li>
</ul>
<h2>حالات لا يسري عليها حق الاسترجاع</h2>
<ul>
<li>المنتجات التي تم فتح كرتونتها المغلقة أو تشغيلها واستعمالها وليست بها عيوب صناعة مثبتة بتقرير فني.</li>
<li>الأضرار والكسور الناتجة عن سوء الاستخدام، أو التوصيل الكهربائي الخاطئ، أو النقل العشوائي بعد الاستلام، أو عدم اتباع تعليمات التشغيل الرسمية.</li>
</ul>
<h2>كيفية تقديم طلب الاسترجاع أو الاستبدال</h2>
<p>لتقديم طلب أو الاستفسار عن حالة معينة، يرجى تجهيز رقم الطلب وبيانات الفاتورة ثم كلمنا على واتساب من الزرار اللي في الموقع، وسيقوم فريق خدمة العملاء بإرشادكم ومتابعة الخطوات معكم خطوة بخطوة.</p>
<blockquote>هذه السياسة قيد المراجعة القانونية النهائية.</blockquote>`,
    },
    {
      slug: 'warranty',
      title: 'الضمان والصيانة المعتمدة',
      seoTitle: 'الضمان والصيانة المعتمدة | معرض محمد سراج',
      seoDescription: 'تعرف على تفاصيل ضمان الوكيل الرسمي للأجهزة الأصلية في معرض محمد سراج وطريقة تفعيل الضمان وتركيب الأجهزة عبر الخط الساخن.',
      body: `<p>نؤمن في معرض محمد سراج بأن الثقة وراحة البال تبدأ من الضمان الموثوق، ولذلك نحرص على أن تكون كافة الأجهزة الكهربائية المعروضة لدينا مشمولة بالحماية الرسمية الكاملة من الوكلاء المعتمدين في مصر.</p>
<h2>منتجات أصلية 100% بضمان الوكيل الرسمي</h2>
<p>جميع الأجهزة الكهربائية التي نوفرها في المعرض أصلية وجديدة كلياً فرز أول، ومرفقة بشهادة الضمان الأصلية المعتمدة من شركة الوكيل الرسمي في جمهورية مصر العربية، مع فاتورة شراء معتمدة من المعرض تثبت حقك في التمتع بخدمات الضمان وقطع الغيار الأصلية طوال فترة السريان.</p>
<h2>مدة وسريان فترة الضمان</h2>
<p>تختلف مدة الضمان باختلاف نوع الجهاز وماركة الشركة المصنعة وسياسة الوكيل؛ حيث تمتد فترات الضمان في بعض الأجهزة الكبيرة مثل الثلاجات والغسالات والتكييفات لعدة سنوات، وتختلف من ماركة لأخرى ومن جهاز لآخر. تجدون مدة الضمان المحددة لكل موديل مسجلة بوضوح داخل صفحة تفاصيل المنتج على موقعنا قبل الشراء.</p>
<h2>خطوات تفعيل الضمان وتركيب الأجهزة الكبيرة</h2>
<p>للحفاظ على حقوق الضمان كاملة عند استلام الأجهزة المنزلية الكبيرة (كالغسالات والتكييفات وشاشات التلفزيون الكبيرة والبوتاجازات):</p>
<ol>
<li>احتفظ بالكرتونة مغلقة بعد استلام الجهاز من مندوب التوصيل، ولا تقم بفتحها بنفسك إذا كان الكتالوج يطلب تركيب فني معتمد.</li>
<li>اتصل برقم الخط الساخن للوكيل الرسمي المعتمد المسجل على كرتونة الجهاز أو في أوراق الضمان لتحديد موعد زيارة الفني.</li>
<li>يقوم فني الوكيل المعتمد بفتح الكرتونة وتثبيت وتشغيل الجهاز وختم شهادة الضمان رسمياً لتفعيل السريان.</li>
</ol>
<h2>دعم ومساعدة معرض محمد سراج</h2>
<p>في حال واجهتكم أي صعوبة في التواصل مع مركز خدمة الوكيل الرسمي أو كنتم بحاجة إلى استفسار فني بخصوص تفعيل الضمان، لا تترددوا أبداً في التحدث إلينا؛ كلمنا على واتساب من الزرار اللي في الموقع وسيقوم فريقنا بمساعدتكم والتنسيق معكم بكل اهتمام، كما ندعوكم لقراءة <a href="/pages/returns">سياسة الاستبدال والاسترجاع</a> لمعرفة حقوقكم في حالات الأعطال المصنعية.</p>`,
    },
    {
      slug: 'privacy',
      title: 'سياسة الخصوصية',
      seoTitle: 'سياسة الخصوصية وحماية البيانات | معرض محمد سراج',
      seoDescription: 'نلتزم في معرض محمد سراج بحماية خصوصيتك وسرية بياناتك الشخصية وعدم مشاركتها مع أي جهة إعلانية أو إظهارها علناً.',
      body: `<p>نولي في معرض محمد سراج أهمية قصوى لخصوصية عملائنا وزوار موقعنا الإلكتروني، ونلتزم التزاماً كاملاً بحماية بياناتكم الشخصية والحفاظ على سريتها وأمانها وفق أعلى معايير الشفافية والاحترام.</p>
<h2>ما هي البيانات التي نجمعها ولماذا؟</h2>
<p>عند استخدامكم للموقع أو تقديم طلب شراء، نطلب بعض البيانات الأساسية اللازمة فقط، وتقتصر على: الاسم الشخصي، رقم الهاتف المحمول، وعنوان التوصيل التفصيلي (المحافظة والمدينة والعنوان). نستخدم هذه البيانات في الأغراض الآتية حصراً:</p>
<ul>
<li>تأكيد تفاصيل الطلب والتواصل معكم عند تجهيزه وشحنه.</li>
<li>توصيل الأجهزة المشتراة بأمان إلى عنوانكم بدقة بواسطة أسطول التوصيل التابع للمعرض.</li>
<li>تقديم خدمات المتابعة، وإصدار فواتير الشراء، وتسهيل إجراءات وتفعيل ضمان الأجهزة والصيانة عند الحاجة.</li>
</ul>
<h2>حماية وسرية أرقام الهواتف والبيانات الشخصية</h2>
<p>نؤكد لجميع عملائنا الكرام أن أرقام الهواتف والبيانات الشخصية محاطة بسرية تامة؛ فلا نقوم أبداً بنشر رقم هاتفك أو بياناتك الحساسة علناً في الموقع (مثل نماذج آراء وتقييمات العملاء)، ولا نقوم إطلاقاً ببيع أو تأجير أو مشاركة بياناتكم مع أي شركات تسويقية أو جهات إعلانية خارجية بأي شكل من الأشكال.</p>
<h2>تحليلات الموقع واحترام خصوصية التصفح</h2>
<p>يستخدم موقع معرض محمد سراج أدوات تحليلية خفيفة وصديقة للخصوصية، هدفها الوحيد تحسين سرعة الموقع وتجربة الاستخدام ومعرفة الأقسام الأكثر زيارة، وتعمل هذه الأدوات بشكل مستقل دون استخدام ملفات تعريف ارتباط (كوكيز) إعلانية أو تتبع أنشطتكم عبر المواقع الأخرى.</p>
<h2>حقوقك في تعديل أو حذف بياناتك</h2>
<p>يحق لك في أي وقت مراجعة بياناتك المسجلة لدينا أو طلب تحديثها، كما يحق لك تقديم طلب حذف بياناتك وسجلاتك الشخصية بالكامل من قواعد بياناتنا؛ يكفيك فقط أن تتواصل معنا عبر زر واتساب المتاح في الموقع وهنتابع طلبك معاك. لأي استفسار حول سياسات التوصيل والخدمات، يمكنكم زيارة <a href="/pages/delivery">صفحة سياسة الشحن</a> أو <a href="/pages/faq">صفحة الأسئلة الشائعة</a>.</p>`,
    },
    {
      slug: 'faq',
      title: 'الأسئلة الشائعة',
      seoTitle: 'الأسئلة الشائعة | معرض محمد سراج',
      seoDescription: 'إجابات على الأسئلة الأكثر شيوعاً حول الطلب والدفع، التوصيل بالمحافظات، الضمان المعتمد، وسياسات معرض محمد سراج للأجهزة المنزلية.',
      body: `<p>جمعنا لكم في هذه الصفحة إجابات واضحة ومباشرة عن أكثر الأسئلة المتكررة التي تصلنا من عملائنا حول الطلب، الشحن، الدفع، والضمان، لتسهيل تجربتكم في معرض محمد سراج.</p>
<h2>الطلب والدفع</h2>
<h3>كيف يمكنني إتمام الطلب من المعرض؟</h3>
<p>يمكنك تصفح المعروضات عبر <a href="/shop">صفحة المنتجات</a> واختيار الجهاز المناسب وإضافته لسلة الشراء وإكمال البيانات في صفحة الدفع، أو يمكنك التواصل معنا وطلب الأجهزة مباشرة: كلمنا على واتساب من الزرار اللي في الموقع وسنقوم بمساعدتك في إنهاء طلبك.</p>
<h3>ما هي وسائل الدفع المقبولة لديكم؟</h3>
<p>نوفر خيارات دفع مريحة وآمنة تشمل: الدفع نقداً عند الاستلام، والتحويل عبر تطبيق إنستا باي (InstaPay)، والتحويل عبر محفظة فودافون كاش. في حالة الدفع عبر المحافظ الإلكترونية أو إنستا باي، يُرجى إرسال صورة إيصال التحويل على واتساب لتأكيد العملية وتجهيز الطلب للشحن.</p>
<h3>هل يُطلب دفع عربون مالي قبل شحن الطلبات النقدية؟</h3>
<p>في حالات بعض الطلبات النقدية الكبيرة (الدفع عند الاستلام)، قد يلزم تحويل عربون بسيط مسبقاً لتأكيد جدية الحجز قبل خروج الشحنة مع عربيات المعرض. في حال انطباق ذلك على طلبك، ستظهر لك قيمة العربون المطلوب وطريقة تحويله بالتفصيل داخل <a href="/checkout">صفحة إتمام الطلب</a> قبل اعتماد طلبك النهائي.</p>
<h3>هل يتوفر نظام تقسيط للأجهزة الكهربائية؟</h3>
<p>نعم، تتوفر أنظمة وتسهيلات التقسيط عند الشراء من داخل صالة عرض المعرض بالمنصورة، ويمكنكم الاستفسار عن الأنظمة والشروط المتوفرة عند تشريفنا بالزيارة في المعرض.</p>
<h2>الشحن والتوصيل</h2>
<h3>ما هي المناطق والمحافظات التي تشملها خدمة التوصيل؟</h3>
<p>نقوم بتوصيل الأجهزة بسيارات المعرض الخاصة إلى مدينة المنصورة، وجميع مراكز وقرى محافظة الدقهلية، بالإضافة إلى محافظات الدلتا وكافة محافظات جمهورية مصر العربية. كما نتيح خيار الاستلام المباشر من المعرض بالمنصورة.</p>
<h3>كم تبلغ تكلفة مصاريف الشحن والتوصيل؟</h3>
<p>تعتمد رسوم الشحن على المحافظة والمدينة المحددة في عنوانك. يمكنك معرفة قيمة مصاريف الشحن الدقيقة لعنوانك عبر إدخال بيانات المكان في <a href="/checkout">صفحة إتمام الطلب</a> قبل إنهاء الشراء، ولمزيد من الإيضاح يرجى زيارة صفحة <a href="/pages/delivery">سياسة الشحن والتوصيل</a>.</p>
<h3>هل يمكنني تحديد يوم معين لاستلام أجهزتي؟</h3>
<p>نعم بالتأكيد؛ بعد تسجيل طلبك، كلمنا على واتساب من الزرار اللي في الموقع لترتيب اليوم وموعد التسليم الأنسب لظروفك مع فريق التوصيل التابع للمعرض.</p>
<h2>الضمان والاسترجاع</h2>
<h3>هل جميع الأجهزة جديدة ومشمولة بالضمان الرسمي؟</h3>
<p>نعم، جميع الأجهزة المعروضة في معرض محمد سراج أصلية 100% وجديدة فرز أول، ومصحوبة ببطاقة ضمان الوكيل الرسمي وفاتورة شراء معتمدة من المعرض. تختلف مدة الضمان باختلاف الماركة ومسجلة في صفحة كل منتج.</p>
<h3>كيف أقوم بتفعيل الضمان وتركيب الأجهزة بعد استلامها؟</h3>
<p>بالنسبة للأجهزة الكبيرة كالغسالات والتكييفات والشاشات الكبيرة، يُفضل إبقاء الكرتونة مغلقة والاتصال بالخط الساخن لخدمة عملاء الوكيل الرسمي الموضح على الكرتونة لإرسال فني معتمد للتركيب وختم الضمان، ويمكنكم قراءة كامل التفاصيل في صفحة <a href="/pages/warranty">الضمان والصيانة المعتمدة</a>.</p>
<h3>ما هي شروط استرجاع أو استبدال الأجهزة؟</h3>
<p>وفقاً لقانون حماية المستهلك المصري، يحق لكم استرجاع أو استبدال المنتج غير المستخدم في كرتونته الأصلية المغلقة وبحالته الأصلية خلال 14 يوماً من الاستلام، وفي حال وجود عيب صناعة خلال 30 يوماً يتم التعامل بموجب تقرير فني معتمد من مركز صيانة الوكيل الرسمي، ويمكنكم معرفة كامل الإجراءات بزيارة صفحة <a href="/pages/returns">سياسة الاستبدال والاسترجاع</a>.</p>
<h2>عن المعرض والتجار</h2>
<h3>أين يقع المعرض؟</h3>
<p>يقع معرض محمد سراج في مدينة المنصورة بمحافظة الدقهلية، ويقدم خدماته الممتدة منذ عام 1972، ويمكنكم معرفة المزيد حول تاريخنا في صفحة <a href="/pages/about">من نحن</a>، ولمعرفة مواعيد العمل أو أي استفسار كلمنا على واتساب من الزرار اللي في الموقع.</p>
<h3>هل يقدم المعرض أسعاراً خاصة للتجار ومبيعات الجملة؟</h3>
<p>نعم، نوفر أسعاراً وخدمات مخصصة للتجار وأصحاب محلات الأدوات المنزلية والأجهزة الكهربائية، ويمكن للتجار الاطلاع على التفاصيل وتقديم طلباتهم من خلال صفحة <a href="/traders">مبيعات الجملة والتجار</a>.</p>`,
    },
  ]

  for (const p of pageDefs) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        body: p.body,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        published: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        body: p.body,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        published: true,
      },
    })
  }

  // --------------------------------------------------------------------------
  // 6.7b Buying Guides (3 published guides)
  // --------------------------------------------------------------------------
  interface GuideSeedDef {
    slug: string
    title: string
    summary: string
    body: string
    categorySlug: string | null
  }

  const guideDefs: GuideSeedDef[] = [
    {
      slug: 'choose-refrigerator',
      title: 'إزاي تختار الثلاجة المناسبة لبيتك؟',
      summary:
        'دليل سريع لاختيار الثلاجة: السعة المناسبة، الفرق بين النوفروست والانفرتر، استهلاك الكهرباء، والضمان — نصائح من خبراء معرض محمد سراج.',
      body: `<h2>ابدأ بحجم البيت والاستخدام</h2>
<p>ثلاجة 16 قدم مناسبة لبيت صغير، أما العائلات فالأفضل 20 قدم أو أكتر. اختار بين الباب العلوي والسفلي والـ Side by Side حسب المساحة المتاحة في مطبخك.</p>
<h2>النوفروست والانفرتر بيفرقوا في إيه؟</h2>
<ul>
<li>النوفروست بيمنع تكوّن الثلج وبيقلل تنظيف الثلاجة.</li>
<li>الانفرتر بيقلّل استهلاك الكهرباء وبيشتغل أهدأ.</li>
<li>لو منطقتك فيها قطع كهرباء متكرر، اسأل عن حماية الفولت.</li>
</ul>
<h2>نصائح من معرض محمد سراج</h2>
<p>اختار ماركة لها وكيل رسمي وضمان واضح في مصر، وقيس مساحة المطبخ قبل الشراء. في المعرض بنساعدك تقارن الموديلات والأسعار وتختار اللي يناسب بيتك.</p>`,
      categorySlug: 'refrigerators',
    },
    {
      slug: 'inverter-ac-guide',
      title: 'دليل شراء التكييف الانفرتر',
      summary:
        'كل اللي محتاج تعرفه عن تكييف الانفرتر: قوة التبريد، استهلاك الكهرباء، سعة الـ BTU المناسبة للأوضة، ونصائح التركيب والصيانة.',
      body: `<h2>ليه تختار الانفرتر؟</h2>
<p>تكييف الانفرتر بيتحكم في سرعة الضاغط، فبيوصل للحرارة المطلوبة بسرعة وبعدين بيقلّل الاستهلاك، وده بيفرق في فاتورة الكهربا على المدى الطويل.</p>
<h2>اختار سعة التبريد المناسبة</h2>
<ul>
<li>أوضة صغيرة لحد 14 متر مربع: 1.25 حصان كفاية.</li>
<li>أوضة متوسطة من 14 لـ 18 متر مربع: 1.5 حصان.</li>
<li>أوضة كبيرة أو فوق السطح: 2.25 حصان أو أكتر.</li>
</ul>
<h2>نصائح التركيب والصيانة</h2>
<p>التركيب الصح بيفرق في عمر الجهاز واستهلاكه. متثبتش الوحدة قرب مصدر حرارة، ونظّف الفلاتر كل شهرين. في المعرض بنركّب ونخدم بخبرة من سنين.</p>`,
      categorySlug: 'acs',
    },
    {
      slug: 'bridal-checklist',
      title: 'دليل تجهيز العروسة — قائمة كاملة',
      summary:
        'قائمة كاملة لتجهيز جهاز العروسة: من الأجهزة الكهربائية لأدوات المطبخ والحمام، مع نصائح ترتيب الأولويات والميزانية خطوة بخطوة.',
      body: `<h2>ابدئي بالأساسيات</h2>
<p>جهّزي الأول الأجهزة الكبيرة: ثلاجة، غسالة، تكييف، وبوتاجاز، لأنها بتاخد وقت في الاختيار والتوصيل.</p>
<h2>القائمة على مراحل</h2>
<ul>
<li>المرحلة الأولى: الأجهزة الكهربائية الأساسية.</li>
<li>المرحلة التانية: أدوات المطبخ والحلل والأجهزة الصغيرة.</li>
<li>المرحلة التالتة: أجهزة الحمام والعناية الشخصية.</li>
</ul>
<h2>نصيحة مننا</h2>
<p>متحاوليش تجهيزي كل حاجة مرة واحدة. رتّبي حسب الميزانية والأهم، وابدئي بباقة جاهزة لو حابة تمشي خطوة بخطوة.</p>`,
      categorySlug: null,
    },
  ]

  for (const guide of guideDefs) {
    const category = guide.categorySlug
      ? await prisma.category.findUnique({
          where: { slug: guide.categorySlug },
          select: { id: true },
        })
      : null

    const guideProducts = category
      ? await prisma.product.findMany({
          where: { categoryId: category.id, visible: true, archivedAt: null },
          take: 3,
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
      : []

    await prisma.guide.upsert({
      where: { slug: guide.slug },
      update: {
        title: guide.title,
        summary: guide.summary,
        body: guide.body,
        categoryIds: category ? [category.id] : [],
        productIds: guideProducts.map((product) => product.id),
        published: true,
      },
      create: {
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        body: guide.body,
        categoryIds: category ? [category.id] : [],
        productIds: guideProducts.map((product) => product.id),
        published: true,
        publishedAt: new Date(),
      },
    })
  }

  // --------------------------------------------------------------------------
  // 6.7c «ساعدني أختار» quizzes (refrigerators, washers, tvs, acs)
  // --------------------------------------------------------------------------
  await seedQuizzes(prisma)

  // --------------------------------------------------------------------------
  // 6.8 Demo Orders (6 orders: SR-2026-000101..106)
  // --------------------------------------------------------------------------
  interface DemoOrderSeedDef {
    no: string
    status: OrderStatus
    paymentMethod: PaymentMethod
    customerName: string
    customerPhone: string
    governorate: string
    city: string
    address: string
    notes?: string
    depositPct?: number
    items: Array<{ modelCode: string; qty: number }>
    events: Array<{ status: OrderStatus; note: string }>
    payment?: {
      method: PaymentMethod
      status: PaymentStatus
      rejectReason?: string
    }
    markPaidInFull?: boolean
  }

  const demoOrderDefs: DemoOrderSeedDef[] = [
    {
      no: 'SR-2026-000101',
      status: 'new',
      paymentMethod: 'cod',
      customerName: 'أحمد محمود',
      customerPhone: '01000000101',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      address: 'شارع الجمهورية، المنصورة',
      notes: 'الاتصال قبل الوصول بنصف ساعة',
      items: [{ modelCode: 'SR-S5', qty: 1 }],
      events: [{ status: 'new', note: 'تم استلام الطلب (الدفع عند الاستلام)' }],
    },
    {
      no: 'SR-2026-000102',
      status: 'awaiting_payment',
      paymentMethod: 'instapay',
      customerName: 'محمد إبراهيم',
      customerPhone: '01000000102',
      governorate: 'الدقهلية',
      city: 'طلخا',
      address: 'شارع صلاح سالم، طلخا',
      items: [{ modelCode: 'SR-S8', qty: 1 }],
      events: [{ status: 'awaiting_payment', note: 'بانتظار تحويل إنستا باي وإرسال الإثبات على واتساب' }],
    },
    {
      no: 'SR-2026-000103',
      status: 'awaiting_deposit',
      paymentMethod: 'cod',
      customerName: 'ياسمين خالد',
      customerPhone: '01000000103',
      governorate: 'الشرقية',
      city: 'الزقازيق',
      address: 'حي القومية، الزقازيق',
      depositPct: 10,
      items: [
        { modelCode: 'SR-S1', qty: 1 },
        { modelCode: 'SR-S14', qty: 1 },
      ],
      events: [{ status: 'awaiting_deposit', note: 'طلب كاش فوق 30,000 ج.م — بانتظار عربون 10%' }],
    },
    {
      no: 'SR-2026-000104',
      status: 'payment_rejected',
      paymentMethod: 'vodafone_cash',
      customerName: 'هدى سمير',
      customerPhone: '01000000104',
      governorate: 'الدقهلية',
      city: 'ميت غمر',
      address: 'شارع بورسعيد، ميت غمر',
      items: [{ modelCode: 'SR-S9', qty: 1 }],
      events: [
        { status: 'awaiting_payment', note: 'تم إنشاء الطلب بانتظار التحويل' },
        { status: 'payment_rejected', note: 'تم رفض التحويل: صورة الإيصال غير واضحة' },
      ],
      payment: {
        method: 'vodafone_cash',
        status: 'rejected',
        rejectReason: 'صورة الإيصال غير واضحة',
      },
    },
    {
      no: 'SR-2026-000105',
      status: 'confirmed',
      paymentMethod: 'instapay',
      customerName: 'منى السيد',
      customerPhone: '01000000105',
      governorate: 'دمياط',
      city: 'دمياط',
      address: 'شارع كورنيش النيل، دمياط',
      items: [{ modelCode: 'SR-S1', qty: 1 }],
      events: [
        { status: 'awaiting_payment', note: 'تم إنشاء الطلب بانتظار التحويل' },
        { status: 'confirmed', note: 'تم تأكيد تحويل إنستا باي بالكامل' },
      ],
      payment: {
        method: 'instapay',
        status: 'confirmed',
      },
      markPaidInFull: true,
    },
    {
      no: 'SR-2026-000106',
      status: 'delivered',
      paymentMethod: 'cod',
      customerName: 'عمر فتحي',
      customerPhone: '01000000106',
      governorate: 'كفر الشيخ',
      city: 'كفر الشيخ',
      address: 'شارع النبوي المهندس، كفر الشيخ',
      items: [{ modelCode: 'SR-S15', qty: 2 }],
      events: [
        { status: 'new', note: 'تم استلام الطلب' },
        { status: 'confirmed', note: 'تم تأكيد الطلب هاتفياً مع العميل' },
        { status: 'out_for_delivery', note: 'خرج الطلب للتوصيل بعربيات المعرض' },
        { status: 'delivered', note: 'تم التسليم والتحصيل بنجاح' },
      ],
      markPaidInFull: true,
    },
  ]

  // Production first deploy: `SEED_DEMO_ORDERS=false` keeps the live order list empty.
  const seedDemoOrders = process.env.SEED_DEMO_ORDERS !== 'false'
  for (const orderDef of seedDemoOrders ? demoOrderDefs : []) {
    const existingOrder = await prisma.order.findUnique({
      where: { no: orderDef.no },
    })
    if (existingOrder) {
      continue
    }

    const zone = findZone(DEFAULT_ZONES, orderDef.governorate, orderDef.city)
    const deliveryFee = zone.fee

    const resolvedItems = orderDef.items.map((line) => {
      const prod = productByModelCode.get(line.modelCode)
      if (!prod) {
        throw new Error(`Product ${line.modelCode} not found for order ${orderDef.no}`)
      }
      return {
        productId: prod.id,
        name: prod.name,
        modelCode: prod.modelCode,
        qty: line.qty,
        unitPrice: prod.price,
        taxRate: prod.taxRate,
      }
    })

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    const total = subtotal + deliveryFee
    const depositPct = orderDef.depositPct ?? null
    const depositAmount = depositPct !== null ? Math.round((total * depositPct) / 100) : null
    const paidAmount = orderDef.markPaidInFull ? total : 0

    const baseTime = Date.now() - orderDef.events.length * 60_000

    await prisma.order.create({
      data: {
        no: orderDef.no,
        type: 'order',
        status: orderDef.status,
        customerPhone: orderDef.customerPhone,
        customerName: orderDef.customerName,
        governorate: orderDef.governorate,
        city: orderDef.city,
        zoneId: zone.id,
        address: orderDef.address,
        notes: orderDef.notes ?? null,
        subtotal,
        discount: 0,
        deliveryFee,
        total,
        paymentMethod: orderDef.paymentMethod,
        depositPct,
        depositAmount,
        paidAmount,
        publicToken: nanoid(32),
        confirmToken: nanoid(32),
        items: {
          create: resolvedItems,
        },
        events: {
          create: orderDef.events.map((ev, idx) => ({
            status: ev.status,
            note: ev.note,
            userId: seededAdminId,
            at: new Date(baseTime + idx * 60_000),
          })),
        },
        ...(orderDef.payment
          ? {
              payments: {
                create: [
                  {
                    method: orderDef.payment.method,
                    amount: total,
                    status: orderDef.payment.status,
                    rejectReason: orderDef.payment.rejectReason ?? null,
                    userId: seededAdminId,
                  },
                ],
              },
            }
          : {}),
      },
    })
  }

  // --------------------------------------------------------------------------
  // 6.9 Summary Output
  // --------------------------------------------------------------------------
  const [
    permissionsCount,
    rolesCount,
    usersCount,
    specTemplatesCount,
    categoriesCount,
    brandsCount,
    productsCount,
    settingsCount,
    bridalTiersCount,
    contentVersionsCount,
    pagesCount,
    ordersCount,
    orderItemsCount,
    orderEventsCount,
    paymentsCount,
  ] = await Promise.all([
    prisma.permission.count(),
    prisma.role.count(),
    prisma.user.count(),
    prisma.specTemplate.count(),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.count(),
    prisma.setting.count(),
    prisma.bridalTier.count(),
    prisma.contentVersion.count(),
    prisma.page.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.orderEvent.count(),
    prisma.payment.count(),
  ])

  console.log('✅ Seed complete:', {
    permissions: permissionsCount,
    roles: rolesCount,
    users: usersCount,
    specTemplates: specTemplatesCount,
    categories: categoriesCount,
    brands: brandsCount,
    products: productsCount,
    settings: settingsCount,
    bridalTiers: bridalTiersCount,
    contentVersions: contentVersionsCount,
    pages: pagesCount,
    orders: ordersCount,
    orderItems: orderItemsCount,
    orderEvents: orderEventsCount,
    payments: paymentsCount,
  })
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}
