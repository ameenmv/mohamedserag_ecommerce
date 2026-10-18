<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const id = String(route.params.id)
const { t } = useI18n()
const localePath = useLocalePath()
const productsApi = useAdminProducts()

const { data: product, error, status } = await useAsyncData(
  `admin-product-${id}`,
  () => productsApi.getById(id),
)

useSeoMeta({
  title: () =>
    product.value
      ? `${product.value.name} · ${t('admin.products.editTitle')}`
      : t('admin.products.editTitle'),
})
useAdminPageTitle('admin.products.editTitle')
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="status === 'pending'" class="flex flex-col gap-4 p-6">
      <Skeleton class="h-10 w-64 rounded-xl" />
      <Skeleton class="h-96 w-full rounded-2xl" />
    </div>

    <div
      v-else-if="error || !product"
      class="rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive"
    >
      <p class="font-semibold">{{ t('errors.generic') }}</p>
      <NuxtLink
        :to="localePath('/admin/products')"
        class="mt-4 inline-block text-sm font-bold underline"
      >
        {{ t('admin.products.backToList') }}
      </NuxtLink>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-col gap-1">
          <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {{ product.name }}
          </h1>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span class="num font-mono">{{ product.modelCode }}</span>
            <span>·</span>
            <span>{{ product.category.name }}</span>
            <span>·</span>
            <span>{{ product.brand.name }}</span>
          </div>
        </div>
      </div>

      <AdminProductsEditor :initial-product="product" />
    </template>
  </div>
</template>
