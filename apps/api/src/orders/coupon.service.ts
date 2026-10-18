import { Injectable } from '@nestjs/common'
import type { CartQuoteLine, CouponEvaluation } from '@serag/shared'

@Injectable()
export class CouponService {
  evaluate(code?: string | null, _lines?: readonly CartQuoteLine[]): CouponEvaluation | null {
    if (!code || code.trim().length === 0) {
      return null
    }

    // Slice 4 (T05x): real coupon rules
    return {
      code: code.trim(),
      status: 'rejected',
      discount: 0,
      reason: 'الكوبونات هتتفعل قريب',
    }
  }
}
