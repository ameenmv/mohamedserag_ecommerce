import { Module } from '@nestjs/common'
import { CatalogModule } from '../catalog/catalog.module.js'
import { AdminBrandsController } from './admin-brands.controller.js'
import { AdminBrandsService } from './admin-brands.service.js'
import { AdminCategoriesController } from './admin-categories.controller.js'
import { AdminCategoriesService } from './admin-categories.service.js'
import { AdminProductImagesService } from './admin-product-images.service.js'
import { AdminProductsController } from './admin-products.controller.js'
import { AdminProductsService } from './admin-products.service.js'
import { AdminSpecTemplatesController } from './admin-spec-templates.controller.js'
import { AdminSpecTemplatesService } from './admin-spec-templates.service.js'

@Module({
  imports: [CatalogModule],
  controllers: [
    AdminProductsController,
    AdminCategoriesController,
    AdminBrandsController,
    AdminSpecTemplatesController,
  ],
  providers: [
    AdminProductsService,
    AdminProductImagesService,
    AdminCategoriesService,
    AdminBrandsService,
    AdminSpecTemplatesService,
  ],
  exports: [
    AdminProductsService,
    AdminProductImagesService,
    AdminCategoriesService,
    AdminBrandsService,
    AdminSpecTemplatesService,
  ],
})
export class AdminCatalogModule {}
