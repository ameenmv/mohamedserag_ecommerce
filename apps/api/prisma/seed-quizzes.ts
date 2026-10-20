import type { QuizDefinition } from '@serag/shared'
import type { Prisma, PrismaClient } from '../src/generated/prisma/client.js'

/** JSON columns only accept Prisma's JSON value types; these literals are plain JSON. */
function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Seeded «ساعدني أختار» quizzes, keyed by category slug. Rules use only real spec-template keys. */
const QUIZZES: Record<string, QuizDefinition> = {
  refrigerators: {
    questions: [
      {
        id: 'fridge-family',
        text: 'عددكم في البيت كام؟',
        answers: [
          { id: 'fridge-fam-small', text: 'فرد أو اتنين' },
          { id: 'fridge-fam-mid', text: '3 أو 4' },
          { id: 'fridge-fam-large', text: '5 أو أكتر' },
        ],
      },
      {
        id: 'fridge-power',
        text: 'توفير الكهربا يفرق معاك؟',
        answers: [
          { id: 'fridge-pow-saves', text: 'آه، يفرق معايا' },
          { id: 'fridge-pow-no', text: 'مش فارقة' },
        ],
      },
      {
        id: 'fridge-doors',
        text: 'تحب التلاجة كام باب؟',
        answers: [
          { id: 'fridge-door-two', text: 'بابين' },
          { id: 'fridge-door-side', text: 'سايد باي سايد' },
          { id: 'fridge-door-four', text: '٤ أبواب' },
        ],
      },
    ],
    rules: [
      { answerId: 'fridge-fam-large', field: 'capacity_l', op: 'gte', value: 450, points: 3, reason: 'سعة كبيرة تناسب الأسرة' },
      { answerId: 'fridge-fam-mid', field: 'capacity_l', op: 'lte', value: 400, points: 2, reason: 'سعة وسط مناسبة' },
      { answerId: 'fridge-fam-small', field: 'capacity_l', op: 'lte', value: 300, points: 2, reason: 'سعة صغيرة للشقة' },
      { answerId: 'fridge-pow-saves', field: 'inverter', op: 'isTrue', value: true, points: 3, reason: 'موتور انفرتر موفر للكهرباء' },
      { answerId: 'fridge-door-two', field: 'doors', op: 'lte', value: 2, points: 1, reason: 'بابين بمساحة عملية' },
      { answerId: 'fridge-door-four', field: 'doors', op: 'gte', value: 4, points: 2, reason: '٤ أبواب بتشيل أكتر' },
    ],
  },
  washers: {
    questions: [
      {
        id: 'washer-family',
        text: 'الغسيل عندكم قد إيه؟',
        answers: [
          { id: 'washer-fam-small', text: 'قليل، فرد أو اتنين' },
          { id: 'washer-fam-large', text: 'كتير، أسرة كبيرة' },
        ],
      },
      {
        id: 'washer-loading',
        text: 'بتحب التحميل إزاي؟',
        answers: [
          { id: 'washer-load-front', text: 'أمامي' },
          { id: 'washer-load-top', text: 'علوي' },
          { id: 'washer-load-twin', text: 'حوضين' },
        ],
      },
      {
        id: 'washer-power',
        text: 'محتاج غسيل بالبخار؟',
        answers: [
          { id: 'washer-pow-steam', text: 'آه، مهم' },
          { id: 'washer-pow-normal', text: 'مش لازم' },
        ],
      },
    ],
    rules: [
      { answerId: 'washer-fam-large', field: 'capacity_kg', op: 'gte', value: 9, points: 3, reason: 'سعة غسيل كبيرة' },
      { answerId: 'washer-fam-small', field: 'capacity_kg', op: 'lte', value: 8, points: 2, reason: 'سعة مناسبة للاستخدام اليومي' },
      { answerId: 'washer-load-front', field: 'loading', op: 'eq', value: 'أمامي', points: 2, reason: 'تحميل أمامي بيوفر مساحة' },
      { answerId: 'washer-load-top', field: 'loading', op: 'eq', value: 'علوي', points: 1, reason: 'تحميل علوي سهل الاستخدام' },
      { answerId: 'washer-load-twin', field: 'loading', op: 'eq', value: 'حوضين', points: 1, reason: 'حوضين عملي واقتصادي' },
      { answerId: 'washer-pow-steam', field: 'steam', op: 'isTrue', value: true, points: 3, reason: 'غسيل بالبخار تعقيم أعمق' },
    ],
  },
  tvs: {
    questions: [
      {
        id: 'tv-room',
        text: 'هتحط الشاشة فين؟',
        answers: [
          { id: 'tv-room-small', text: 'أوضة صغيرة' },
          { id: 'tv-room-large', text: 'صالة كبيرة' },
        ],
      },
      {
        id: 'tv-resolution',
        text: 'أهم حاجة عندك إيه؟',
        answers: [
          { id: 'tv-res-4k', text: 'دقة 4K' },
          { id: 'tv-res-qled', text: 'ألوان QLED' },
          { id: 'tv-res-fhd', text: 'سعر اقتصادي' },
        ],
      },
      {
        id: 'tv-smart',
        text: 'عايز تلفزيون سمارت؟',
        answers: [
          { id: 'tv-smart-yes', text: 'آه، سمارت' },
          { id: 'tv-smart-receiver', text: 'مهم ريسيفر داخلي' },
        ],
      },
    ],
    rules: [
      { answerId: 'tv-room-large', field: 'size_in', op: 'gte', value: 55, points: 3, reason: 'مقاس كبير للصالة' },
      { answerId: 'tv-room-small', field: 'size_in', op: 'lte', value: 43, points: 2, reason: 'مقاس مناسب للأوضة' },
      { answerId: 'tv-res-4k', field: 'resolution', op: 'eq', value: '4K', points: 3, reason: 'دقة 4K نقية' },
      { answerId: 'tv-res-qled', field: 'resolution', op: 'eq', value: 'QLED', points: 3, reason: 'تقنية QLED بألوان غنية' },
      { answerId: 'tv-res-fhd', field: 'resolution', op: 'eq', value: 'FHD', points: 1, reason: 'دقة FHD بسعر اقتصادي' },
      { answerId: 'tv-smart-yes', field: 'smart', op: 'isTrue', value: true, points: 2, reason: 'شاشة سمارت بتطبيقات' },
      { answerId: 'tv-smart-receiver', field: 'receiver', op: 'isTrue', value: true, points: 2, reason: 'ريسيفر داخلي جاهز' },
    ],
  },
  acs: {
    questions: [
      {
        id: 'ac-room',
        text: 'التكييف للأوضة ولا للصالة؟',
        answers: [
          { id: 'ac-room-small', text: 'أوضة صغيرة' },
          { id: 'ac-room-large', text: 'صالة كبيرة' },
        ],
      },
      {
        id: 'ac-mode',
        text: 'عايز تبريد بس ولا بارد وساخن؟',
        answers: [
          { id: 'ac-mode-cold', text: 'بارد بس' },
          { id: 'ac-mode-hot', text: 'بارد وساخن' },
        ],
      },
      {
        id: 'ac-power',
        text: 'توفير الكهربا يفرق معاك؟',
        answers: [
          { id: 'ac-pow-inverter', text: 'آه انفرتر' },
          { id: 'ac-pow-normal', text: 'مش فارقة' },
        ],
      },
    ],
    rules: [
      { answerId: 'ac-room-large', field: 'coverage_m2', op: 'gte', value: 30, points: 3, reason: 'تغطية مناسبة للصالة' },
      { answerId: 'ac-room-small', field: 'coverage_m2', op: 'lte', value: 15, points: 2, reason: 'تغطية مناسبة للأوضة' },
      { answerId: 'ac-mode-hot', field: 'mode', op: 'eq', value: 'بارد ساخن', points: 3, reason: 'بارد وساخن طول السنة' },
      { answerId: 'ac-mode-cold', field: 'mode', op: 'eq', value: 'بارد', points: 1, reason: 'تبريد بارد بسعر أقل' },
      { answerId: 'ac-pow-inverter', field: 'inverter', op: 'isTrue', value: true, points: 3, reason: 'تكييف انفرتر موفر للكهرباء' },
    ],
  },
}

/**
 * Seeds the launch quizzes (refrigerators, washers, tvs, acs); a category that does not exist
 * is skipped so the seed stays safe on partial databases.
 */
export async function seedQuizzes(prisma: PrismaClient): Promise<void> {
  for (const [slug, definition] of Object.entries(QUIZZES)) {
    const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } })
    if (!category) continue

    await prisma.quizRule.upsert({
      where: { categoryId: category.id },
      update: {
        questions: toInputJson(definition.questions),
        rules: toInputJson(definition.rules),
      },
      create: {
        categoryId: category.id,
        questions: toInputJson(definition.questions),
        rules: toInputJson(definition.rules),
      },
    })
  }
}
