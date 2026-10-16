<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useI18n()
useSeoMeta({ title: () => t('admin.login.title') })
</script>

<template>
  <main
    class="min-h-dvh w-full bg-serag-ivory text-serag-ink flex items-center justify-center p-4 sm:p-6 lg:p-10"
  >
    <div
      class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-[var(--radius-card)] border border-border shadow-xl bg-card"
    >
      <AdminLoginForm />
      <AdminLoginSidePanel />
    </div>
  </main>
</template>
