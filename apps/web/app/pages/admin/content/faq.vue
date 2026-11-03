<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.content.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()

useSeoMeta({ title: () => t('admin.content.faq.pageTitle') })
useAdminPageTitle('admin.content.faq.pageTitle')
</script>

<template>
  <AdminContentFaq />
</template>
