<script setup lang="ts">
import { FileText, Save } from '@lucide/vue'

const props = defineProps<{
  initialNotes: string | null
  actionPending?: boolean
}>()

const emit = defineEmits<{
  save: [notes: string]
}>()

const { t } = useI18n()

const notes = ref(props.initialNotes ?? '')

watch(
  () => props.initialNotes,
  (val) => {
    notes.value = val ?? ''
  },
)

const isDirty = computed(() => (notes.value.trim() !== (props.initialNotes ?? '').trim()))

function handleSave() {
  emit('save', notes.value)
}
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4 min-w-0">
    <div class="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div class="flex items-center gap-2">
        <FileText class="size-4 text-serag-night dark:text-serag-gold" aria-hidden="true" />
        <h2 class="text-sm font-bold text-foreground">
          {{ t('admin.orders.detail.internalNotesTitle') }}
        </h2>
      </div>

      <button
        type="button"
        :disabled="actionPending || !isDirty"
        class="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-serag-night px-3.5 text-xs font-bold text-white hover:bg-serag-night/90 dark:bg-serag-gold dark:text-serag-ink dark:hover:bg-serag-gold-hi transition-colors disabled:opacity-40 shadow-xs"
        @click="handleSave"
      >
        <Save class="size-3.5" aria-hidden="true" />
        <span>{{ t('admin.orders.detail.saveNotes') }}</span>
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <textarea
        v-model="notes"
        rows="4"
        maxlength="2000"
        :placeholder="t('admin.orders.detail.internalNotesPlaceholder')"
        class="border-input bg-background w-full rounded-xl border p-3 text-xs shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div class="flex justify-end text-[11px] text-muted-foreground num">
        {{ notes.length }} / 2000
      </div>
    </div>
  </div>
</template>
