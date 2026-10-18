<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, LayoutDashboard } from '@lucide/vue'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const token = String(route.params.token)
const { t } = useI18n()
const localePath = useLocalePath()

const {
  summary,
  pending,
  error,
  shortages,
  rejectWhatsappUrl,
  actionError,
  load,
  confirm,
  reject,
} = useAdminConfirm(token)

// Initial load
await load()

useSeoMeta({
  title: () =>
    summary.value
      ? t('admin.confirm.header', { no: summary.value.no })
      : t('admin.confirm.pageTitle'),
  robots: 'noindex, follow',
})
useAdminPageTitle('admin.confirm.pageTitle')

const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const justConfirmed = ref(false)
const rejectDialogOpen = ref(false)

async function handleConfirm(amountPiastres: number, note?: string): Promise<void> {
  const ok = await confirm(amountPiastres, note)
  if (ok) {
    justConfirmed.value = true
  }
}

async function handleReject(reason: string): Promise<void> {
  const ok = await reject(reason)
  if (ok) {
    rejectDialogOpen.value = false
  }
}
</script>

<template>
  <main class="w-full min-w-0 py-6 sm:py-8">
    <div class="mx-auto max-w-md px-4 flex flex-col gap-6 min-w-0">
      <!-- Loading Skeleton -->
      <div v-if="pending && !summary && !error" class="flex flex-col gap-4">
        <Skeleton class="h-8 w-48 rounded-xl" />
        <Skeleton class="h-64 w-full rounded-2xl" />
        <Skeleton class="h-12 w-full rounded-xl" />
      </div>

      <!-- Error / Unknown Token (404) -->
      <div
        v-else-if="error || !summary"
        role="alert"
        class="flex flex-col items-center gap-4 rounded-3xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive"
      >
        <AlertCircle class="size-12" aria-hidden="true" />
        <p class="text-base font-bold text-foreground">
          {{ t('admin.confirm.notFound') }}
        </p>
        <NuxtLink
          :to="localePath('/admin')"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-input bg-background px-6 text-sm font-bold text-foreground shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutDashboard class="size-4" aria-hidden="true" />
          <span>{{ t('admin.confirm.backToDashboard') }}</span>
        </NuxtLink>
      </div>

      <!-- Confirmed State (just confirmed) -->
      <AdminConfirmResult
        v-else-if="justConfirmed"
        state="confirmed"
        :summary="summary"
        :shortages="shortages"
        :reject-whatsapp-url="null"
      />

      <!-- Rejected State (just rejected) -->
      <AdminConfirmResult
        v-else-if="rejectWhatsappUrl"
        state="rejected"
        :summary="summary"
        :shortages="shortages"
        :reject-whatsapp-url="rejectWhatsappUrl"
      />

      <!-- Not Actionable State (order already confirmed, cancelled, or not confirmable) -->
      <div
        v-else-if="!summary.canConfirm"
        class="flex flex-col gap-6"
      >
        <div class="flex flex-col gap-2 border-b border-border/80 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h1 class="text-xl font-bold text-foreground sm:text-2xl break-words">
              {{ t('admin.confirm.header', { no: summary.no }) }}
            </h1>
            <Badge variant="outline" class="font-bold">
              {{ summary.statusLabel }}
            </Badge>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-6 text-center text-sm font-medium text-muted-foreground shadow-xs">
          <p class="text-foreground font-semibold">
            {{ t('admin.confirm.notActionable', { status: summary.statusLabel }) }}
          </p>
          <NuxtLink
            :to="localePath('/admin')"
            class="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LayoutDashboard class="size-4" aria-hidden="true" />
            <span>{{ t('admin.confirm.backToDashboard') }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Actionable Flow -->
      <template v-else>
        <!-- Header -->
        <header class="flex flex-col gap-2 border-b border-border/80 pb-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h1 class="text-xl font-bold text-foreground sm:text-2xl break-words">
              {{ t('admin.confirm.header', { no: summary.no }) }}
            </h1>
            <Badge
              :variant="summary.status === 'payment_rejected' ? 'destructive' : 'outline'"
              class="font-bold"
            >
              {{ summary.statusLabel }}
            </Badge>
          </div>
        </header>

        <!-- Summary Card -->
        <AdminConfirmSummary :summary="summary" />

        <!-- Confirm / Reject Actions -->
        <AdminConfirmActions
          :summary="summary"
          :pending="pending"
          :hydrated="hydrated"
          :action-error="actionError"
          @confirm="handleConfirm"
          @open-reject="rejectDialogOpen = true"
        />

        <!-- Reject Reason Dialog -->
        <AdminConfirmRejectDialog
          v-model:open="rejectDialogOpen"
          :pending="pending"
          :hydrated="hydrated"
          @reject="handleReject"
        />
      </template>
    </div>
  </main>
</template>
