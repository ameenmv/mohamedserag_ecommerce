import type { OrderStatus } from './enums.js'
import { normalizePhone } from './phone.js'

/**
 * Builds a prefilled WhatsApp click-to-chat URL (`https://wa.me/20XXXXXXXXXX?text=...`).
 * Accepts `phone` in any format supported by `normalizePhone` or already in `201...` international form.
 */
export function waLink(phone: string, text: string): string {
  const normalized = normalizePhone(phone)
  let intlPhone: string

  if (normalized !== null) {
    intlPhone = `2${normalized}`
  } else {
    const cleaned = phone
      .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/\D+/g, '')
      .replace(/^00/, '')

    intlPhone = cleaned.startsWith('0') ? `2${cleaned}` : cleaned
  }

  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`
}

/**
 * Replaces `{{name}}` placeholders with values from `vars`.
 * Unknown placeholders are left untouched.
 */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const value = vars[key]
      if (value !== undefined) {
        return String(value)
      }
    }
    return match
  })
}

/**
 * Default Egyptian Arabic WhatsApp message templates for store and customer actions.
 */
export const DEFAULT_TEMPLATES = {
  order_confirmed:
    'أهلاً {{customerName}}، تم تأكيد طلبك رقم {{orderNo}} من معرض محمد سراج بإجمالي {{total}}. هننسق معاك ميعاد التوصيل قريباً.',
  order_out_for_delivery:
    'أهلاً {{customerName}}، طلبك رقم {{orderNo}} خرج للتوصيل بعربيات معرض محمد سراج وهيوصلك النهارده إن شاء الله.',
  order_delivered:
    'أهلاً {{customerName}}، تم تسليم طلبك رقم {{orderNo}} من معرض محمد سراج. مبروك عليك ونتشرف بتقييمك للمنتج على الموقع!',
  order_cancelled:
    'أهلاً {{customerName}}، تم إلغاء طلبك رقم {{orderNo}} من معرض محمد سراج. لو عندك أي استفسار تقدر تتواصل معانا في أي وقت.',
  payment_rejected:
    'أهلاً {{customerName}}، بخصوص طلبك رقم {{orderNo}}، تعذر تأكيد التحويل ({{reason}}). يا ريت تبعتلنا صورة إيصال التحويل تاني للتأكيد.',
  payment_proof:
    'السلام عليكم، ده إثبات تحويل مبلغ {{amount}} عن طريق {{method}} للطلب رقم {{orderNo}}.\nرابط تأكيد الدفع للإدارة: {{confirmUrl}}',
  bridal_locked:
    'ألف مبروك يا {{customerName}}! تم تأكيد عربون قائمة جهاز العروسة رقم {{orderNo}} وتثبيت الأسعار لحد يوم {{lockedUntil}}. هنكلمك نتفق على ميعاد التوصيل والتركيب.',
  bridal_repriced:
    'أهلاً {{customerName}}، بخصوص قائمة جهاز العروسة رقم {{orderNo}}، بعد انتهاء فترة تثبيت السعر تم تحديث أسعار الأجهزة من {{oldTotal}} إلى {{newTotal}}. والأسعار الجديدة متثبتة لحد {{lockedUntil}}.',
  notify_back_in_stock:
    'أهلاً {{customerName}}، المنتج اللي طلبت يتبلّغك بيه «{{productName}}» بقى متوفر دلوقتي في معرض محمد سراج: {{productUrl}}',
  product_question: 'السلام عليكم، عندي استفسار عن {{productName}} ({{productUrl}})',
  traders_contact:
    'السلام عليكم، بتواصل معاكم من قسم التجار والجملة في معرض محمد سراج.\nاسم المعرض/الشركة: {{businessName}}\nالمحافظة: {{governorate}}',
} as const

export type WhatsAppTemplateKey = keyof typeof DEFAULT_TEMPLATES

export function statusTemplateKey(status: OrderStatus): WhatsAppTemplateKey | null {
  switch (status) {
    case 'confirmed':
      return 'order_confirmed'
    case 'out_for_delivery':
      return 'order_out_for_delivery'
    case 'delivered':
      return 'order_delivered'
    case 'payment_rejected':
      return 'payment_rejected'
    case 'cancelled':
      return 'order_cancelled'
    default:
      return null
  }
}
