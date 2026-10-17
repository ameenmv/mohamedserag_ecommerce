import { Module } from '@nestjs/common'
import { BrandsController } from './brands.controller.js'
import { CatalogService } from './catalog.service.js'
import { CategoriesController } from './categories.controller.js'
import { ProductDetailService } from './product-detail.service.js'
import { ProductListService } from './product-list.service.js'
import { ProductsController } from './products.controller.js'

@Module({
  controllers: [CategoriesController, BrandsController, ProductsController],
  providers: [CatalogService, ProductListService, ProductDetailService],
  exports: [CatalogService, ProductListService, ProductDetailService],
})
export class CatalogModule {}
