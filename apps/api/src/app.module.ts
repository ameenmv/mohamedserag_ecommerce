import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuditInterceptor } from './audit/audit.interceptor.js'
import { AdminCatalogModule } from './admin-catalog/admin-catalog.module.js'
import { AdminOrdersModule } from './admin-orders/admin-orders.module.js'
import { AdminBridalModule } from './admin-bridal/admin-bridal.module.js'
import { AdminPromotionsModule } from './admin-promotions/admin-promotions.module.js'
import { AdminNotifyModule } from './admin-notify/admin-notify.module.js'
import { AdminReviewsModule } from './admin-reviews/admin-reviews.module.js'
import { AuthModule } from './auth/auth.module.js'
import { CatalogModule } from './catalog/catalog.module.js'
import { OrdersModule } from './orders/orders.module.js'
import { BridalModule } from './bridal/bridal.module.js'
import { SettingsModule } from './settings/settings.module.js'
import { PromotionsModule } from './promotions/promotions.module.js'
import { ReviewsModule } from './reviews/reviews.module.js'
import { PermissionGuard } from './auth/permission.guard.js'
import { SessionGuard } from './auth/session.guard.js'
import { HealthController } from './health.controller.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { TestSeedModule } from './test-seed/test-seed.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    TestSeedModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    SettingsModule,
    PromotionsModule,
    ReviewsModule,
    AuthModule,
    CatalogModule,
    AdminCatalogModule,
    AdminOrdersModule,
    AdminBridalModule,
    AdminPromotionsModule,
    AdminNotifyModule,
    AdminReviewsModule,
    OrdersModule,
    BridalModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

