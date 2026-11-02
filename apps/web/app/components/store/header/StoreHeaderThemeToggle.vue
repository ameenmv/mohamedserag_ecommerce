<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'

// Same storage key as the admin's theme (useAdminTheme), so it is one preference site-wide.
// The head script in app.vue applies it before first paint; the icons swap with CSS (dark:),
// so nothing here depends on client state during hydration.
// `block`: full-width row with a label, for the phone side menu.
defineProps<{ block?: boolean }>()

const { t } = useI18n()

function toggle(): void {
  const dark = document.documentElement.classList.toggle('dark')
  try {
    localStorage.setItem('serag-theme', dark ? 'dark' : 'light')
  } catch {
    // Private mode: the switch still works for this page
  }
}
</script>

<template>
  <button
    v-if="block"
    type="button"
    class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 font-bold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
    @click="toggle"
  >
    <Moon class="size-5 dark:hidden" aria-hidden="true" />
    <Sun class="hidden size-5 text-serag-gold-hi dark:block" aria-hidden="true" />
    <span class="dark:hidden">{{ t('store.header.darkMode') }}</span>
    <span class="hidden dark:inline">{{ t('store.header.lightMode') }}</span>
  </button>
  <button
    v-else
    type="button"
    :aria-label="t('store.header.toggleTheme')"
    class="relative inline-flex size-10 items-center justify-center rounded-xl border-[1.5px] border-[#E4DDC6] bg-card text-primary transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-[46px] sm:rounded-[14px] motion-reduce:transition-none dark:border-border dark:text-serag-gold-hi"
    @click="toggle"
  >
    <Moon class="size-5 dark:hidden" aria-hidden="true" />
    <Sun class="hidden size-5 dark:block" aria-hidden="true" />
  </button>
</template>
