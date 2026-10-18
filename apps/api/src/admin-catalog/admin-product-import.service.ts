import { BadRequestException, Injectable } from '@nestjs/common'
import {
  buildImportPlan,
  type ImportPlan,
  type ImportProductSource,
  parseCsv,
  piastresToEgp,
} from '@serag/shared'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes(';') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export interface ImportApplyResult {
  updated: number
  skipped: number
  errors: number
}

@Injectable()
export class AdminProductImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a CSV of all non-archived products for admin price/stock bulk export.
   * Header: model_code,name,price,old_price,stock
   * Includes UTF-8 BOM so Microsoft Excel correctly renders Arabic strings.
   */
  async exportProductsCsv(): Promise<{ csv: string; filename: string }> {
    const products = await this.prisma.product.findMany({
      where: { archivedAt: null },
      select: {
        modelCode: true,
        name: true,
        price: true,
        oldPrice: true,
        stock: true,
      },
      orderBy: { modelCode: 'asc' },
    })

    const header = 'model_code,name,price,old_price,stock'
    const lines = [header]

    for (const p of products) {
      const priceEgp = piastresToEgp(p.price)
      const oldPriceEgp = p.oldPrice !== null ? piastresToEgp(p.oldPrice) : ''
      const row = [
        escapeCsvCell(p.modelCode),
        escapeCsvCell(p.name),
        escapeCsvCell(priceEgp),
        escapeCsvCell(oldPriceEgp),
        escapeCsvCell(p.stock),
      ].join(',')
      lines.push(row)
    }

    const today = new Date().toISOString().slice(0, 10)
    const filename = `serag-products-${today}.csv`
    const csvWithBom = `\uFEFF${lines.join('\r\n')}\r\n`

    return {
      csv: csvWithBom,
      filename,
    }
  }

  /**
   * Parses and creates a dry-run import preview plan against the current database state.
   */
  async preview(csv: string): Promise<ImportPlan> {
    const sources = await this.loadProductSources()
    const rows = parseCsv(csv)
    return buildImportPlan(rows, sources)
  }

  /**
   * Re-parses and applies the CSV import plan in a single Prisma transaction.
   * Updates product prices, old prices, and stock levels.
   * Logs a StockMovement record with reason: 'import' for each stock delta.
   */
  async apply(csv: string, adminUserId?: string): Promise<ImportApplyResult> {
    const rows = parseCsv(csv)
    const initialSources = await this.loadProductSources()
    const initialPlan = buildImportPlan(rows, initialSources)

    if (initialPlan.headerError) {
      throw new BadRequestException({
        message: 'خطأ في ترويسة ملف الاستيراد',
        error: initialPlan.headerError,
      })
    }

    return this.prisma.$transaction(async (tx) => {
      const sources = await this.loadProductSources(tx)
      const plan = buildImportPlan(rows, sources)

      const updateRows = plan.rows.filter((r) => r.status === 'update')

      for (const row of updateRows) {
        if (!row.productId || !row.next) continue

        const updateData: {
          price?: number
          oldPrice?: number | null
          stock?: number
        } = {}

        if (row.changes.includes('price')) {
          updateData.price = row.next.price
        }
        if (row.changes.includes('oldPrice')) {
          updateData.oldPrice = row.next.oldPrice
        }
        if (row.changes.includes('stock')) {
          updateData.stock = row.next.stock
        }

        await tx.product.update({
          where: { id: row.productId },
          data: updateData,
        })

        if (row.changes.includes('stock') && row.current) {
          const stockDiff = row.next.stock - row.current.stock
          await tx.stockMovement.create({
            data: {
              productId: row.productId,
              qty: stockDiff,
              reason: 'import',
              userId: adminUserId ?? null,
            },
          })
        }
      }

      // No reindex: search text is built from name/brand/specs, not price or stock.

      const updated = updateRows.length
      const skipped = plan.summary.unchanged + plan.summary.duplicate + plan.summary.notFound
      const errors = plan.summary.error

      return {
        updated,
        skipped,
        errors,
      }
    })
  }

  private async loadProductSources(
    db: Pick<PrismaService, 'product'> | Prisma.TransactionClient = this.prisma,
  ): Promise<ImportProductSource[]> {
    const records = await db.product.findMany({
      select: {
        id: true,
        modelCode: true,
        name: true,
        price: true,
        oldPrice: true,
        stock: true,
        archivedAt: true,
      },
    })

    return records.map((p) => ({
      id: p.id,
      modelCode: p.modelCode,
      name: p.name,
      price: p.price,
      oldPrice: p.oldPrice,
      stock: p.stock,
      archived: p.archivedAt !== null,
    }))
  }
}
