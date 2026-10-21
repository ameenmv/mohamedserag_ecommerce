<script setup lang="ts">
import type { ProductCard } from '@serag/shared'
import { ChevronDown, Eye } from '@lucide/vue'

defineProps<{
  product: ProductCard
  isDirty: boolean
  productId?: string
}>()

const { t } = useI18n()
const mobileExpanded = ref(true)
</script>

<template>
  <div class="flex flex-col gap-3 lg:sticky lg:top-20">
    <!-- Header card -->
    <Card class="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Eye class="size-4 text-serag-gold" aria-hidden="true" />
          <h2 class="font-display text-base font-semibold text-foreground">
            {{ t('admin.products.editor.preview.title') }}
          </h2>
        </div>

        <div class="flex items-center gap-2">
          <Badge
            v-if="isDirty"
            variant="outline"
            class="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-400 text-[10px]"
          >
            {{ t('admin.products.editor.preview.unsavedBadge') }}
          </Badge>
          <span v-else-if="productId" class="num text-[11px] text-muted-foreground">
            ID: {{ productId }}
          </span>

          <!-- Mobile toggle button -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-7 lg:hidden"
            :aria-label="t('admin.products.editor.preview.mobileToggle')"
            @click="mobileExpanded = !mobileExpanded"
          >
            <ChevronDown
              class="size-4 transition-transform duration-200"
              :class="mobileExpanded ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      <p class="mt-1 text-xs text-muted-foreground hidden lg:block">
        {{ t('admin.products.editor.preview.subtitle') }}
      </p>

      <!-- Live card preview wrapper (inert so links and buttons are unclickable) -->
      <div
        class="mt-4 transition-all"
        :class="mobileExpanded ? 'block' : 'hidden lg:block'"
      >
        <div
          inert
          class="pointer-events-none select-none max-w-sm mx-auto"
          aria-hidden="true"
        >
          <StoreProductCard :product="product" />
        </div>
      </div>
    </Card>
  </div>
</template>
