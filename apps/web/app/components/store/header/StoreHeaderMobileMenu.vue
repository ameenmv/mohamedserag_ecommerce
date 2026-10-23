<script setup lang="ts">
import { Menu, MessageCircle, Phone, Sparkles } from '@lucide/vue'
import type { StoreNavItem } from '~/constants/navigation'

defineProps<{
  items: readonly StoreNavItem[]
  whatsappUrl: string
  phone: string
  isActive: (to: string) => boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const { t, localeProperties } = useI18n()
const localePath = useLocalePath()
const { track } = useAnalytics()

const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'left' : 'right'))
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <button
        type="button"
        :aria-label="t('common.mainNav')"
        class="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden motion-reduce:transition-none"
      >
        <Menu class="size-5" aria-hidden="true" />
      </button>
    </SheetTrigger>
    <LazySheetContent :side="side" class="w-80 bg-background p-0">
      <SheetHeader class="border-b border-sidebar-border bg-serag-deep px-5 py-5 text-start text-serag-ivory">
        <SheetTitle>
          <img src="/brand/logo-light.webp" :alt="t('brand.storeName')" width="480" height="172" class="h-14 w-auto">
        </SheetTitle>
        <SheetDescription class="num text-xs font-semibold tracking-widest text-serag-gold-hi">
          {{ t('store.header.mobileMenuSubtitle') }}
        </SheetDescription>
      </SheetHeader>
      <nav :aria-label="t('store.header.browseSite')" class="flex flex-col gap-1 p-4">
        <SheetClose v-for="item in items" :key="item.to" as-child>
          <NuxtLink
            :to="localePath(item.to)"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :class="[
              'flex min-h-11 items-center justify-between rounded-xl px-4 py-2.5 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
              isActive(item.to)
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-secondary',
            ]"
          >
            <span>{{ t(item.labelKey) }}</span>
            <Sparkles v-if="item.highlight" class="size-4 text-serag-gold" aria-hidden="true" />
          </NuxtLink>
        </SheetClose>
      </nav>
      <div class="mt-auto flex flex-col gap-2 border-t border-border bg-secondary/50 p-4">
        <CommonLocaleSwitcher class="w-full justify-center" />
        <StoreHeaderThemeToggle block />
        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
          @click="track('whatsapp_click', { source: 'header_drawer' })"
        >
          <MessageCircle class="size-5" aria-hidden="true" />
          <span>{{ t('store.header.directWhatsapp') }}</span>
        </a>
        <a
          v-if="phone"
          :href="`tel:${phone}`"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary px-4 font-bold text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          <Phone class="size-4" aria-hidden="true" />
          <span>{{ t('store.header.callShowroom') }}: <span class="num">{{ phone }}</span></span>
        </a>
      </div>
    </LazySheetContent>
  </Sheet>
</template>
