<script setup lang="ts">
import { PALETTES, PALETTE_CSS_KEY, PALETTE_STORAGE_KEY, paletteCss } from '~/utils/palettes'

const { t, locale } = useI18n()
const open = ref(false)
const current = ref('current')

function apply(id: string) {
  const palette = PALETTES.find(p => p.id === id) ?? PALETTES[0]!
  current.value = palette.id
  let el = document.getElementById('palette-lab') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'palette-lab'
    document.head.appendChild(el)
  }
  const css = paletteCss(palette)
  el.textContent = css
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette.id)
    localStorage.setItem(PALETTE_CSS_KEY, css)
  } catch { /* storage unavailable */ }
}

onMounted(() => {
  try {
    current.value = localStorage.getItem(PALETTE_STORAGE_KEY) ?? 'current'
  } catch { /* storage unavailable */ }
})
</script>

<template>
  <div class="fixed bottom-40 start-4 z-[60] md:bottom-6">
    <div
      v-if="open"
      class="mb-2 w-60 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-xl"
    >
      <p class="mb-2 text-sm font-bold">{{ t('store.paletteLab.title') }}</p>
      <ul class="grid gap-1.5">
        <li v-for="p in PALETTES" :key="p.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-start text-sm transition-colors hover:bg-secondary"
            :class="current === p.id ? 'border-primary bg-secondary' : 'border-transparent'"
            :aria-pressed="current === p.id"
            @click="apply(p.id)"
          >
            <span class="flex h-5 w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10" aria-hidden="true">
              <i class="flex-[3]" :style="{ background: p.green }" />
              <i class="flex-1" :style="{ background: p.gold }" />
              <i class="flex-1" :style="{ background: p.cream }" />
            </span>
            <span>{{ locale === 'ar' ? p.ar : p.en }}</span>
          </button>
        </li>
      </ul>
    </div>
    <button
      type="button"
      class="flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
        <circle cx="7.5" cy="11.5" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="7.5" r="1" />
      </svg>
      {{ t('store.paletteLab.button') }}
    </button>
  </div>
</template>
