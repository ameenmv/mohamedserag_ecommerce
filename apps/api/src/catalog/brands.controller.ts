import { Controller, Get, Param } from '@nestjs/common'
import type { BrandDetail, BrandSummary } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { CatalogService } from './catalog.service.js'

@Controller('brands')
export class BrandsController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * GET /api/brands
   * Returns visible brands with productCount > 0, ordered by sort then name.
   */
  @Get()
  @Public()
  async getBrands(): Promise<BrandSummary[]> {
    return this.catalogService.getBrands()
  }

  /**
   * GET /api/brands/:slug
   * Returns one visible brand (+ intro/SEO) or 404 if missing or hidden.
   */
  @Get(':slug')
  @Public()
  async getBrand(@Param('slug') slug: string): Promise<BrandDetail> {
    return this.catalogService.getBrandBySlug(slug)
  }
}
