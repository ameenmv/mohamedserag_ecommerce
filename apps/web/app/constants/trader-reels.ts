/**
 * Trader video testimonials on the home page («التجار بيتكلموا عننا»).
 * Placeholders from the prototype: replace each entry with a real trader and the URL of their
 * Facebook reel before launch (see docs/LAUNCH-CHECKLIST.md). A card without `url` is not a link.
 */
/** Arabic and English text for one reel (the English page must not show Arabic names). */
export interface TraderReelText {
  ar: string
  en: string
}

export interface TraderReel {
  name: TraderReelText
  shop: TraderReelText
  /** Facebook reel/video URL; opens in a new tab. */
  url: string | null
  /** Card background tint (prototype gradient start color). */
  tint: string
}

export const TRADER_REELS: readonly TraderReel[] = [
  { name: { ar: 'الحاج سعيد', en: 'Hajj Saeed' }, shop: { ar: 'معرض النور · طلخا', en: 'Al Nour Showroom · Talkha' }, url: null, tint: '#3D6B4F' },
  { name: { ar: 'أ. محمود رضا', en: 'Mahmoud Reda' }, shop: { ar: 'رضا للأجهزة · ميت غمر', en: 'Reda Appliances · Mit Ghamr' }, url: null, tint: '#6F6329' },
  { name: { ar: 'أ. كريم عادل', en: 'Karim Adel' }, shop: { ar: 'بيت العروسة · السنبلاوين', en: 'Beit El Arousa · El Senbellawein' }, url: null, tint: '#2A4D38' },
  { name: { ar: 'الحاج عبده', en: 'Hajj Abdo' }, shop: { ar: 'عبده إلكترونيك · دكرنس', en: 'Abdo Electronics · Dekernes' }, url: null, tint: '#8B7D3C' },
  { name: { ar: 'أ. أحمد فتحي', en: 'Ahmed Fathy' }, shop: { ar: 'الأمانة للأجهزة · المنزلة', en: 'Al Amana Appliances · El Manzala' }, url: null, tint: '#3D6B4F' },
  { name: { ar: 'الحاج مصطفى', en: 'Hajj Mostafa' }, shop: { ar: 'الإخلاص · شربين', en: 'Al Ekhlas · Sherbin' }, url: null, tint: '#6F6329' },
  { name: { ar: 'أ. هاني جمال', en: 'Hany Gamal' }, shop: { ar: 'هاني ستورز · أجا', en: 'Hany Stores · Aga' }, url: null, tint: '#8B7D3C' },
] as const
