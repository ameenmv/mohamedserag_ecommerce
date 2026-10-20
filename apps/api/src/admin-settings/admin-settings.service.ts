import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import {
  adminCodDepositSchema,
  adminPaymentsSettingSchema,
  adminZonesSettingSchema,
  lowStockSettingSchema,
  renderTemplatePreview,
  searchSynonymsSettingSchema,
  SETTINGS_SECTIONS,
  settingsPlaceholderWarnings,
  storeInfoSettingSchema,
  templatesSettingSchema,
  unknownTemplateVariables,
  type AdminSettingsResponse,
  type SettingsSection,
  type SettingsSectionState,
  type WhatsAppTemplateKey,
} from '@serag/shared'
import type { z } from 'zod'
import { SearchIndexService } from '../catalog/search-index.service.js'
import { SearchService } from '../catalog/search.service.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { StoreSettingsService } from '../settings/store-settings.service.js'

const LEGACY_WARNING = 'legacy'

type SectionSchema =
  | typeof storeInfoSettingSchema
  | typeof adminPaymentsSettingSchema
  | typeof adminZonesSettingSchema
  | typeof adminCodDepositSchema
  | typeof lowStockSettingSchema
  | typeof searchSynonymsSettingSchema
  | typeof templatesSettingSchema

export function isSettingsSection(value: string): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section === value)
}

function sectionSchema(section: SettingsSection): SectionSchema {
  switch (section) {
    case 'store':
      return storeInfoSettingSchema
    case 'payments':
      return adminPaymentsSettingSchema
    case 'zones':
      return adminZonesSettingSchema
    case 'codDeposit':
      return adminCodDepositSchema
    case 'lowStock':
      return lowStockSettingSchema
    case 'searchSynonyms':
      return searchSynonymsSettingSchema
    case 'templates':
      return templatesSettingSchema
  }
}

/** Formats Zod issues into the repo-standard `{ field.path: [messages] }` error map. */
function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    ;(errors[key] ??= []).push(issue.message)
  }
  return errors
}

interface StoreInfoShape {
  name: string
  phone: string
  whatsapp: string
  tradersWhatsapp: string
  address: string
  hours: string
}

function isStoreInfo(value: unknown): value is StoreInfoShape {
  if (value === null || typeof value !== 'object') return false
  return 'phone' in value && 'tradersWhatsapp' in value && 'hours' in value
}

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeSettings: StoreSettingsService,
    private readonly searchService: SearchService,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  async getAll(): Promise<AdminSettingsResponse> {
    const sections = await Promise.all(
      SETTINGS_SECTIONS.map(async (section) => {
        const row = await this.prisma.setting.findUnique({ where: { key: section } })
        return [section, await this.stateFor(section, row?.value ?? null, row)] as const
      }),
    )

    const byKey = new Map(sections)
    return {
      sections: {
        store: this.requireSection(byKey, 'store'),
        payments: this.requireSection(byKey, 'payments'),
        zones: this.requireSection(byKey, 'zones'),
        codDeposit: this.requireSection(byKey, 'codDeposit'),
        lowStock: this.requireSection(byKey, 'lowStock'),
        searchSynonyms: this.requireSection(byKey, 'searchSynonyms'),
        templates: this.requireSection(byKey, 'templates'),
      },
    }
  }

  async save(
    section: SettingsSection,
    value: unknown,
    version: string | null,
  ): Promise<SettingsSectionState<unknown>> {
    const parsed = sectionSchema(section).safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'بيانات غير صحيحة',
        errors: zodFieldErrors(parsed.error),
      })
    }
    const parsedValue = parsed.data

    let newVersion: string | null = null
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.setting.findUnique({ where: { key: section } })
      const currentVersion = row ? row.updatedAt.toISOString() : null
      if (currentVersion !== version) {
        const latest = await this.stateFor(section, row?.value ?? null, row)
        throw new ConflictException({
          message: 'الإعدادات اتغيرت من مكان تاني',
          latest,
        })
      }

      const saved = await tx.setting.upsert({
        where: { key: section },
        update: { value: parsedValue as Prisma.InputJsonValue },
        create: { key: section, value: parsedValue as Prisma.InputJsonValue },
      })
      newVersion = saved.updatedAt.toISOString()
    })

    if (newVersion === null) {
      throw new ConflictException({ message: 'الإعدادات اتغيرت من مكان تاني' })
    }

    await this.applySideEffects(section)

    return {
      value: parsedValue,
      version: newVersion,
      warnings:
        section === 'store' && isStoreInfo(parsedValue)
          ? settingsPlaceholderWarnings(parsedValue)
          : [],
    }
  }

  previewTemplate(
    key: WhatsAppTemplateKey,
    template: string,
  ): { text: string; unknownVariables: string[] } {
    return {
      text: renderTemplatePreview(template),
      unknownVariables: unknownTemplateVariables(key, template),
    }
  }

  private async applySideEffects(section: SettingsSection): Promise<void> {
    if (section !== 'searchSynonyms') return
    this.searchService.invalidateSynonymsCache()
    await this.searchIndexService.reindexAll()
  }

  /**
   * Resolves one section's state: the saved value parsed by its admin schema,
   * falling back to the effective reader value with a `legacy` warning.
   */
  private async stateFor(
    section: SettingsSection,
    rawValue: unknown,
    row: { updatedAt: Date } | null | undefined,
  ): Promise<SettingsSectionState<unknown>> {
    const version = row ? row.updatedAt.toISOString() : null
    const parsed = sectionSchema(section).safeParse(rawValue)
    if (parsed.success) {
      const warnings =
        section === 'store' && isStoreInfo(parsed.data) ? settingsPlaceholderWarnings(parsed.data) : []
      return { value: parsed.data, version, warnings }
    }

    const effective = await this.effectiveValue(section)
    const warnings = rawValue === null ? [] : [LEGACY_WARNING]
    if (section === 'store' && isStoreInfo(effective)) {
      warnings.push(...settingsPlaceholderWarnings(effective))
    }
    return { value: effective, version, warnings }
  }

  private requireSection(
    byKey: Map<SettingsSection, SettingsSectionState<unknown>>,
    section: SettingsSection,
  ): SettingsSectionState<unknown> {
    const state = byKey.get(section)
    if (state === undefined) {
      throw new Error(`Missing settings section state for ${section}`)
    }
    return state
  }

  private async effectiveValue(section: SettingsSection): Promise<unknown> {
    switch (section) {
      case 'store':
        return this.storeSettings.getStoreInfo()
      case 'payments':
        return this.storeSettings.getPayments()
      case 'zones':
        return this.storeSettings.getZones()
      case 'codDeposit':
        return this.storeSettings.getCodDeposit()
      case 'lowStock':
        return this.storeSettings.getLowStock()
      case 'searchSynonyms':
        return this.searchService.getSynonyms()
      case 'templates':
        return this.storeSettings.getTemplates()
    }
  }
}
