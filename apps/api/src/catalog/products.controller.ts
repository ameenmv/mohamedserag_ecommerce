import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import {
  productQuerySchema,
  type ProductDetail,
  type ProductListResponse,
  type ProductQueryOutput,
} from '@serag/shared'
import type { Request } from 'express'
import { Public } from '../auth/decorators.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { ProductDetailService } from './product-detail.service.js'
import { ProductListService } from './product-list.service.js'

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productListService: ProductListService,
    private readonly productDetailService: ProductDetailService,
  ) {}

  /**
   * GET /api/products
   * Returns a paginated, filtered, and sorted product list with live facets, or exact products by ID list.
   */
  @Get()
  @Public()
  async getProducts(
    @Query(new ZodValidationPipe(productQuerySchema)) query: ProductQueryOutput,
    @Req() req: Request,
  ): Promise<ProductListResponse> {
    const rawQuery = (req.query ?? {}) as Record<string, unknown>
    return this.productListService.getProducts(query, rawQuery)
  }

  /**
   * GET /api/products/:slug
   * Returns full product detail, merged specs, gallery images, and up to 8 related products.
   */
  @Get(':slug')
  @Public()
  async getProduct(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.productDetailService.getProductBySlug(slug)
  }
}
