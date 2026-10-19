<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { useProductFormContext } from '~/composables/useProductFormContext'

defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  addRow: []
  removeRow: [index: number]
}>()

const { form } = useProductFormContext()
const { t } = useI18n()
</script>

<template>
  <Card class="rounded-2xl border border-border bg-card p-6 shadow-xs">
    <CardHeader class="p-0 pb-4">
      <div class="flex items-center justify-between gap-2">
        <div>
          <CardTitle class="font-display text-xl text-primary">
            {{ t('admin.products.editor.setContents.title') }}
          </CardTitle>
          <CardDescription class="mt-1 text-xs text-muted-foreground">
            {{ t('admin.products.editor.setContents.description') }}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="disabled"
          class="gap-1.5 rounded-lg text-xs font-semibold"
          @click="emit('addRow')"
        >
          <Plus class="size-3.5" aria-hidden="true" />
          <span>{{ t('admin.products.editor.setContents.addRow') }}</span>
        </Button>
      </div>
    </CardHeader>
    <CardContent class="p-0">
      <div v-if="form.setContents.length === 0" class="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        {{ t('admin.products.editor.setContents.emptyHint') }}
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="(piece, idx) in form.setContents"
          :key="idx"
          class="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:flex-row sm:items-center"
        >
          <div class="flex-1">
            <Input
              v-model="piece.item"
              type="text"
              :placeholder="t('admin.products.editor.setContents.itemPlaceholder')"
              :disabled="disabled"
              class="h-9 rounded-lg text-sm"
              :aria-label="t('admin.products.editor.setContents.item')"
            />
          </div>

          <div class="w-full sm:w-36">
            <Input
              :model-value="piece.size ?? ''"
              type="text"
              :placeholder="t('admin.products.editor.setContents.sizePlaceholder')"
              :disabled="disabled"
              class="h-9 rounded-lg text-sm"
              :aria-label="t('admin.products.editor.setContents.size')"
              @update:model-value="(val) => (piece.size = String(val).trim() || null)"
            />
          </div>

          <div class="w-full sm:w-24">
            <Input
              :model-value="piece.qty ?? undefined"
              type="number"
              min="1"
              :placeholder="t('admin.products.editor.setContents.qty')"
              :disabled="disabled"
              class="num h-9 rounded-lg text-sm"
              :aria-label="t('admin.products.editor.setContents.qty')"
              @update:model-value="(val) => (piece.qty = val ? Number(val) : null)"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            :disabled="disabled"
            class="size-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            :aria-label="t('admin.products.editor.setContents.removeRow')"
            @click="emit('removeRow', idx)"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
