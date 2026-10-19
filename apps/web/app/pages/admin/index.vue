<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.nav.overview') })

const { user, can } = useAdminAuth()
</script>

<template>
  <section class="flex flex-col gap-6 p-6">
    <AdminDashboardWelcomeHeader :name="user?.name" />
    <AdminDashboardPendingReviews v-if="can(PERMISSIONS.reviews.moderate)" />
    <AdminDashboardExpiringLocks />
    <AdminDashboardEmptyState />
  </section>
</template>
