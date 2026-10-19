import { Module } from '@nestjs/common'
import { PromotionsModule } from '../promotions/promotions.module.js'
import { BrandsController } from './brands.controller.js'
import { CatalogService } from './catalog.service.js'
import { CategoriesController } from './categories.controller.js'
import { ProductDetailService } from './product-detail.service.js'
import { ProductListService } from './product-list.service.js'
import { ProductsController } from './products.controller.js'
import { SearchIndexService } from './search-index.service.js'
import { SearchController } from './search.controller.js'
import { SearchService } from './search.service.js'

@Module({
  imports: [PromotionsModule],
  controllers: [
    CategoriesController,
    BrandsController,
    ProductsController,
    SearchController,
  ],
  providers: [
    CatalogService,
    ProductListService,
    ProductDetailService,
    SearchService,
    SearchIndexService,
  ],
  exports: [
    CatalogService,
    ProductListService,
    ProductDetailService,
    SearchService,
    SearchIndexService,
  ],
})
export class CatalogModule {}

