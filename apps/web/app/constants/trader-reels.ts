/**
 * Trader video testimonials on the home page («التجار بيتكلموا عننا»).
 * Placeholders from the prototype: replace each entry with a real trader and the URL of their
 * Facebook reel before launch (see docs/LAUNCH-CHECKLIST.md). A card without `url` is not a link.
 */
export interface TraderReel {
  name: string
  shop: string
  /** Facebook reel/video URL; opens in a new tab. */
  url: string | null
  /** Card background tint (prototype gradient start color). */
  tint: string
}

export const TRADER_REELS: readonly TraderReel[] = [
  { name: 'الحاج سعيد', shop: 'معرض النور · طلخا', url: null, tint: '#3D6B4F' },
  { name: 'أ. محمود رضا', shop: 'رضا للأجهزة · ميت غمر', url: null, tint: '#6F6329' },
  { name: 'أ. كريم عادل', shop: 'بيت العروسة · السنبلاوين', url: null, tint: '#2A4D38' },
  { name: 'الحاج عبده', shop: 'عبده إلكترونيك · دكرنس', url: null, tint: '#8B7D3C' },
  { name: 'أ. أحمد فتحي', shop: 'الأمانة للأجهزة · المنزلة', url: null, tint: '#3D6B4F' },
  { name: 'الحاج مصطفى', shop: 'الإخلاص · شربين', url: null, tint: '#6F6329' },
  { name: 'أ. هاني جمال', shop: 'هاني ستورز · أجا', url: null, tint: '#8B7D3C' },
] as const
