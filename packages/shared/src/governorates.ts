/**
 * All 27 Egyptian governorates in Arabic.
 * Dakahlia («الدقهلية») is positioned first as the home base of Mohamed Serag (Mansoura),
 * followed by the remaining 26 governorates in Arabic alphabetical order.
 */
const OTHER_GOVERNORATES: readonly string[] = [
  'الإسكندرية',
  'الإسماعيلية',
  'أسوان',
  'أسيوط',
  'الأقصر',
  'البحر الأحمر',
  'البحيرة',
  'بني سويف',
  'بورسعيد',
  'جنوب سيناء',
  'الجيزة',
  'دمياط',
  'سوهاج',
  'السويس',
  'الشرقية',
  'شمال سيناء',
  'الغربية',
  'الفيوم',
  'القاهرة',
  'القليوبية',
  'قنا',
  'كفر الشيخ',
  'مطروح',
  'المنوفية',
  'المنيا',
  'الوادي الجديد',
].sort((a, b) => a.localeCompare(b, 'ar'))

export const EGYPT_GOVERNORATES: readonly string[] = [
  'الدقهلية',
  ...OTHER_GOVERNORATES,
] as const
