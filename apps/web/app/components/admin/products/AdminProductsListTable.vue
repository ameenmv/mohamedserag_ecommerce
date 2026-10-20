<script setup lang="ts">
import type { AdminProductListItem } from '@serag/shared'
import { Package } from '@lucide/vue'
import { calculateDiscountPercent } from '~/utils/admin-money'

defineProps<{
  products: AdminProductListItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  toggleVisibility: [product: AdminProductListItem]
  toggleArchive: [product: AdminProductListItem]
  deleteProduct: [product: AdminProductListItem]
}>()

const { t } = useI18n()
const { money } = usePrice()
const localePath = useLocalePath()
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Desktop Table (md+) -->
    <div class="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
      <table class="w-full text-sm text-start" :aria-label="t('admin.products.title')">
        <thead class="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase">
          <tr>
            <th scope="col" class="py-3.5 ps-5 pe-3 text-start">
              {{ t('admin.products.table.product') }}
            </th>
            <th scope="col" class="px-3 py-3.5 text-start">
              {{ t('admin.products.table.category') }}
            </th>
            <th scope="col" class="px-3 py-3.5 text-start">
              {{ t('admin.products.table.brand') }}
            </th>
            <th scope="col" class="px-3 py-3.5 text-start">
              {{ t('admin.products.table.price') }}
            </th>
            <th scope="col" class="px-3 py-3.5 text-start">
              {{ t('admin.products.table.stock') }}
            </th>
            <th scope="col" class="px-3 py-3.5 text-start">
              {{ t('admin.products.table.status') }}
            </th>
            <th scope="col" class="py-3.5 ps-3 pe-5 text-end">
              <span class="sr-only">{{ t('admin.products.table.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="p in products"
            :key="p.id"
            class="transition-colors hover:bg-muted/20"
          >
            <!-- Product: Thumbnail, Name, Model Code -->
            <td class="py-3 ps-5 pe-3">
              <div class="flex items-center gap-3">
                <div class="relative size-12 shrink-0 overflow-hidden rounded-lg bg-serag-ivory/60 border border-border dark:bg-muted/30">
                  <img
                    v-if="p.thumbnail"
                    :src="p.thumbnail"
                    :alt="p.name"
                    class="size-full object-contain p-1"
                    loading="lazy"
                  >
                  <div v-else class="flex size-full items-center justify-center text-muted-foreground/40">
                    <Package class="size-6 stroke-[1.2]" />
                  </div>
                </div>

                <div class="flex flex-col min-w-0">
                  <NuxtLink
                    :to="localePath(`/admin/products/${p.id}`)"
                    class="truncate font-semibold text-foreground hover:text-serag-green dark:hover:text-serag-gold transition-colors"
                  >
                    {{ p.name }}
                  </NuxtLink>
                  <span class="num text-xs font-mono text-muted-foreground">
                    {{ p.modelCode }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Category -->
            <td class="px-3 py-3 text-muted-foreground">
              {{ p.category.name }}
            </td>

            <!-- Brand -->
            <td class="px-3 py-3 font-medium text-foreground">
              {{ p.brand.name }}
            </td>

            <!-- Price with discount if applicable -->
            <td class="px-3 py-3">
              <div class="flex flex-col">
                <span class="num font-bold text-foreground">
                  {{ money(p.price) }}
                </span>
                <span
                  v-if="p.oldPrice && p.oldPrice > p.price"
                  class="num text-xs text-muted-foreground line-through"
                >
                  {{ money(p.oldPrice) }}
                  <span class="text-serag-green dark:text-serag-gold font-bold">
                    (-{{ calculateDiscountPercent(p.price, p.oldPrice) }}%)
                  </span>
                </span>
              </div>
            </td>

            <!-- Stock with low / out badge -->
            <td class="px-3 py-3">
              <div class="flex items-center gap-2">
                <span class="num font-semibold">{{ p.stock }}</span>
                <Badge
                  v-if="p.stock <= 0"
                  variant="destructive"
                  class="text-[10px] px-1.5 py-0"
                >
                  {{ t('store.availability.outOfStock') }}
                </Badge>
                <Badge
                  v-else-if="p.stock <= p.lowStockThreshold"
                  variant="outline"
                  class="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0"
                >
                  {{ t('store.availability.low') }}
                </Badge>
              </div>
            </td>

            <!-- Visibility / Archived Status -->
            <td class="px-3 py-3">
              <Badge
                v-if="p.archived"
                variant="secondary"
                class="text-[11px]"
              >
                {{ t('admin.products.status.archived') }}
              </Badge>
              <Badge
                v-else-if="p.visible"
                class="bg-serag-green/15 text-serag-green dark:bg-serag-gold/15 dark:text-serag-gold border-0 text-[11px] font-semibold"
              >
                {{ t('admin.products.status.active') }}
              </Badge>
              <Badge
                v-else
                variant="outline"
                class="text-[11px] text-muted-foreground"
              >
                {{ t('admin.products.status.hidden') }}
              </Badge>
            </td>

            <!-- Row actions -->
            <td class="py-3 ps-3 pe-5 text-end">
              <AdminProductsListRowActions
                :product="p"
                @toggle-visibility="emit('toggleVisibility', $event)"
                @toggle-archive="emit('toggleArchive', $event)"
                @delete-product="emit('deleteProduct', $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Stacked Cards (below md) -->
    <div class="flex flex-col gap-3 md:hidden">
      <div
        v-for="p in products"
        :key="p.id"
        class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative size-12 shrink-0 overflow-hidden rounded-lg bg-serag-ivory/60 border border-border dark:bg-muted/30">
              <img
                v-if="p.thumbnail"
                :src="p.thumbnail"
                :alt="p.name"
                class="size-full object-contain p-1"
                loading="lazy"
              >
              <div v-else class="flex size-full items-center justify-center text-muted-foreground/40">
                <Package class="size-6 stroke-[1.2]" />
              </div>
            </div>

            <div class="flex flex-col min-w-0">
              <NuxtLink
                :to="localePath(`/admin/products/${p.id}`)"
                class="truncate font-semibold text-foreground text-sm hover:text-serag-green dark:hover:text-serag-gold transition-colors"
              >
                {{ p.name }}
              </NuxtLink>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <span class="num font-mono">{{ p.modelCode }}</span>
                <span>·</span>
                <span>{{ p.brand.name }}</span>
              </div>
            </div>
          </div>

          <AdminProductsListRowActions
            :product="p"
            @toggle-visibility="emit('toggleVisibility', $event)"
            @toggle-archive="emit('toggleArchive', $event)"
            @delete-product="emit('deleteProduct', $event)"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="num font-bold text-foreground text-sm">
              {{ money(p.price) }}
            </span>
            <span
              v-if="p.oldPrice && p.oldPrice > p.price"
              class="num text-xs text-muted-foreground line-through"
            >
              {{ money(p.oldPrice) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-muted-foreground">{{ t('admin.products.table.stock') }}:</span>
            <span class="num font-semibold">{{ p.stock }}</span>
            <Badge
              v-if="p.stock <= 0"
              variant="destructive"
              class="text-[9px] px-1 py-0"
            >
              {{ t('store.availability.outOfStock') }}
            </Badge>
            <Badge
              v-else-if="p.stock <= p.lowStockThreshold"
              variant="outline"
              class="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] px-1 py-0"
            >
              {{ t('store.availability.low') }}
            </Badge>
          </div>

          <div>
            <Badge
              v-if="p.archived"
              variant="secondary"
              class="text-[10px]"
            >
              {{ t('admin.products.status.archived') }}
            </Badge>
            <Badge
              v-else-if="p.visible"
              class="bg-serag-green/15 text-serag-green dark:bg-serag-gold/15 dark:text-serag-gold border-0 text-[10px] font-semibold"
            >
              {{ t('admin.products.status.active') }}
            </Badge>
            <Badge
              v-else
              variant="outline"
              class="text-[10px] text-muted-foreground"
            >
              {{ t('admin.products.status.hidden') }}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
