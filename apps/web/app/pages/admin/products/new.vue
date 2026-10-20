<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.products.newTitle') })
useAdminPageTitle('admin.products.newTitle')
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {{ t('admin.products.newTitle') }}
      </h1>
    </div>

    <AdminProductsEditor />
  </div>
</template>
