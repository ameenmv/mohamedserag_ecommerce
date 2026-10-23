<script setup lang="ts">
import { ShoppingBag } from '@lucide/vue'

const { t } = useI18n()
</script>

<template>
  <StoreEmptyState
    :icon="ShoppingBag"
    :title="t('store.cart.emptyTitle')"
    :description="t('store.cart.emptyDescription')"
    :cta-label="t('store.cart.browseProducts')"
  />
</template>
