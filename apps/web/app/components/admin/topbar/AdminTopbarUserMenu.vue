<script setup lang="ts">
import { ChevronDown, LogOut } from '@lucide/vue'

const props = defineProps<{
  name: string
}>()

const emit = defineEmits<{
  logout: []
}>()

const { t } = useI18n()

const userInitial = computed(() => {
  const displayName = props.name.trim() || t('admin.topbar.adminRole')
  return displayName.charAt(0).toUpperCase()
})
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        :aria-label="t('admin.topbar.userMenuAria')"
        class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card ps-1.5 pe-3 text-start transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
      >
        <span
          class="font-display inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary pb-0.5 text-lg text-serag-gold-hi"
          aria-hidden="true"
        >
          {{ userInitial }}
        </span>
        <span class="hidden text-sm font-bold text-foreground sm:inline">
          {{ name }}
        </span>
        <ChevronDown class="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuLabel class="flex flex-col gap-0.5 text-start">
        <span class="font-bold">{{ name }}</span>
        <span class="text-xs font-normal text-muted-foreground">{{ t('admin.topbar.fullAccess') }}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        class="flex min-h-10 cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
        @select="emit('logout')"
      >
        <LogOut class="size-4" aria-hidden="true" />
        <span>{{ t('common.logout') }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
