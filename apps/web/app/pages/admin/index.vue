<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.nav.overview') })

const { user } = useAdminAuth()
</script>

<template>
  <section class="flex flex-col gap-6 p-6">
    <AdminDashboardWelcomeHeader :name="user?.name" />
    <AdminDashboardEmptyState />
  </section>
</template>
