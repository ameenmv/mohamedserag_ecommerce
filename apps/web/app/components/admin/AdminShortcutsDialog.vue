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
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader class="text-start">
        <DialogTitle class="font-display text-2xl text-primary">
          اختصارات لوحة المفاتيح
        </DialogTitle>
        <DialogDescription>
          اضغط <kbd class="num rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-bold">G</kbd> ثم حرف الصفحة خلال <span class="num">1.5</span> ثانية للانتقال السريع.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1.5">
          <h3 class="text-xs font-bold text-muted-foreground">
            التنقل بين الصفحات
          </h3>
          <div class="divide-y divide-border rounded-xl border border-border bg-card">
            <div
              v-for="item in ADMIN_NAV_SHORTCUTS"
              :key="item.key"
              class="flex items-center justify-between px-3.5 py-2 text-sm"
            >
              <span class="font-medium text-foreground">{{ item.label }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">{{ item.paletteHint }}</span>
                <kbd class="num rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                  {{ item.hint }}
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <h3 class="text-xs font-bold text-muted-foreground">
            أوامر عامة
          </h3>
          <div class="divide-y divide-border rounded-xl border border-border bg-card">
            <div class="flex items-center justify-between px-3.5 py-2 text-sm">
              <span class="font-medium text-foreground">فتح لوحة البحث والأوامر</span>
              <kbd class="num rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                Ctrl / ⌘ + K
              </kbd>
            </div>
            <div class="flex items-center justify-between px-3.5 py-2 text-sm">
              <span class="font-medium text-foreground">عرض نافذة الاختصارات</span>
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
