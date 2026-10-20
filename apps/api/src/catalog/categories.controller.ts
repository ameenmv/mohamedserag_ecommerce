import { Controller, Get, Param } from '@nestjs/common'
import type { CategoryDetail, CategoryTreeNode } from '@serag/shared'
import { Public } from '../auth/decorators.js'
import { CatalogService } from './catalog.service.js'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * GET /api/categories
   * Returns visible categories as a tree, omitting categories with 0 products.
   */
  @Get()
  @Public()
  async getCategories(): Promise<CategoryTreeNode[]> {
    return this.catalogService.getCategoriesTree()
  }

  /**
   * GET /api/categories/:slug
   * Returns a single visible category with breadcrumb parent, children, and validated spec template fields.
   */
  @Get(':slug')
  @Public()
  async getCategory(@Param('slug') slug: string): Promise<CategoryDetail> {
    return this.catalogService.getCategoryBySlug(slug)
  }
}
