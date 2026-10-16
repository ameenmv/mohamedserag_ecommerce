<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })


useSeoMeta({ title: 'نظرة عامة' })

const { user } = useAdminAuth()
</script>

<template>
  <section class="flex flex-col gap-6 p-6">
    <div>
      <h1 class="font-display text-3xl sm:text-4xl text-foreground">
        أهلاً {{ user?.name ?? '' }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        نظرة عامة على أداء المعرض والطلبات اليومية
      </p>
    </div>

    <Card class="border-dashed py-12 text-center">
      <CardContent class="flex flex-col items-center justify-center gap-2">
        <p class="text-base font-medium text-muted-foreground">
          لوحة التحكم هتتملي لما الطلبات تبدأ توصل
        </p>
      </CardContent>
    </Card>
  </section>
</template>
