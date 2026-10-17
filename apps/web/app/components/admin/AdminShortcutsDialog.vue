<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ADMIN_NAV_SHORTCUTS } from '@/utils/shortcuts'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader class="text-start">
        <DialogTitle class="font-display text-2xl text-primary">
          {{ t('admin.shortcuts.title') }}
        </DialogTitle>
        <DialogDescription>
          {{ t('admin.shortcuts.descriptionPress') }} <kbd class="num rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-bold">G</kbd> {{ t('admin.shortcuts.descriptionHint') }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1.5">
          <h3 class="text-xs font-bold text-muted-foreground">
            {{ t('admin.shortcuts.pageNavigation') }}
          </h3>
          <div class="divide-y divide-border rounded-xl border border-border bg-card">
            <div
              v-for="item in ADMIN_NAV_SHORTCUTS"
              :key="item.key"
              class="flex items-center justify-between px-3.5 py-2 text-sm"
            >
              <span class="font-medium text-foreground">{{ t(item.labelKey) }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">
                  {{ t('admin.shortcuts.gThen', { key: item.key.toUpperCase() }) }}
                </span>
                <kbd class="num rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                  {{ item.hint }}
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <h3 class="text-xs font-bold text-muted-foreground">
            {{ t('admin.shortcuts.generalCommands') }}
          </h3>
          <div class="divide-y divide-border rounded-xl border border-border bg-card">
            <div class="flex items-center justify-between px-3.5 py-2 text-sm">
              <span class="font-medium text-foreground">{{ t('admin.shortcuts.openCommandPalette') }}</span>
              <kbd class="num rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                Ctrl / ⌘ + K
              </kbd>
            </div>
            <div class="flex items-center justify-between px-3.5 py-2 text-sm">
              <span class="font-medium text-foreground">{{ t('admin.shortcuts.showShortcutsDialog') }}</span>
              <kbd class="num rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                ?
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
