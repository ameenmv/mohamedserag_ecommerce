<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.notify.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()

useSeoMeta({ title: () => t('admin.notify.pageTitle') })
useAdminPageTitle('admin.nav.notify')
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0">
    <!-- Header -->
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {{ t('admin.notify.pageTitle') }}
        </h1>
        <p class="text-xs text-muted-foreground sm:text-sm">
          {{ t('admin.notify.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Product Rows List & Detail Sheet -->
    <AdminNotifyProductsList />
  </div>
</template>
