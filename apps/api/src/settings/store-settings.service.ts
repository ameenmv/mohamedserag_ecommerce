import { Injectable } from '@nestjs/common'
import {
  DEFAULT_COD_DEPOSIT,
  DEFAULT_PAYMENTS,
  DEFAULT_TEMPLATES,
  DEFAULT_ZONES,
  codDepositSchema,
  paymentsSettingSchema,
  zonesSchema,
  type CodDepositSetting,
  type PaymentsSetting,
  type Zone,
} from '@serag/shared'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getZones(): Promise<Zone[]> {
    const row = await this.prisma.setting.findUnique({
      where: { key: 'zones' },
    })
    const parsed = zonesSchema.safeParse(row?.value)
    return parsed.success ? parsed.data : DEFAULT_ZONES
  }

  async getCodDeposit(): Promise<CodDepositSetting> {
    const row = await this.prisma.setting.findUnique({
      where: { key: 'codDeposit' },
    })
    const parsed = codDepositSchema.safeParse(row?.value)
    return parsed.success ? parsed.data : DEFAULT_COD_DEPOSIT
  }

  async getPayments(): Promise<PaymentsSetting> {
    const row = await this.prisma.setting.findUnique({
      where: { key: 'payments' },
    })
    const parsed = paymentsSettingSchema.safeParse(row?.value)
    return parsed.success ? parsed.data : DEFAULT_PAYMENTS
  }

  async getTemplates(): Promise<Record<string, string>> {
    const row = await this.prisma.setting.findUnique({
      where: { key: 'templates' },
    })
    const parsed = z.record(z.string(), z.string()).safeParse(row?.value)
    return parsed.success ? { ...DEFAULT_TEMPLATES, ...parsed.data } : { ...DEFAULT_TEMPLATES }
  }

  async getStoreWhatsapp(): Promise<string> {
    const row = await this.prisma.setting.findUnique({
      where: { key: 'store' },
    })
    const parsed = z.object({ whatsapp: z.string().optional() }).safeParse(row?.value)
    return parsed.success && parsed.data.whatsapp ? parsed.data.whatsapp : ''
  }
}

