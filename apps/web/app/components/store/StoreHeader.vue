<script setup lang="ts">
import { ArrowLeftRight, Heart } from '@lucide/vue'
import { waLink } from '@serag/shared'
import { useWindowScroll } from '@vueuse/core'
import { STORE_NAV_ITEMS } from '~/constants/navigation'

const { t } = useI18n()
const settings = useStoreSettings()
const { wishlist, compare, cart } = useHeaderBadges()
const { y } = useWindowScroll()
const { isActive: isNavActive } = useNavActive('/')

const isScrolled = computed(() => y.value > 10)
const searchSheetOpen = ref(false)
const mobileMenuOpen = ref(false)

const whatsappUrl = computed(() =>
  waLink(settings.whatsapp, t('store.footer.whatsappPrefill')),
)
</script>

<template>
  <!-- Top announcement bar -->
  <StoreHeaderAnnouncement :phone="settings.phone" />

  <!-- Sticky Header (frosted on scroll) -->
  <header
    :class="[
      'sticky top-0 z-40 border-b transition-all duration-200 motion-reduce:transition-none',
      isScrolled
        ? 'border-border/80 bg-card/90 shadow-sm backdrop-blur-md'
        : 'border-border bg-card',
    ]"
  >
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 lg:px-8">
      <!-- Mobile menu drawer trigger + Brand logo -->
      <div class="flex items-center gap-2 sm:gap-3">
        <StoreHeaderMobileMenu
          v-model:open="mobileMenuOpen"
          :items="STORE_NAV_ITEMS"
          :whatsapp-url="whatsappUrl"
          :phone="settings.phone"
          :is-active="isNavActive"
        />

        <StoreHeaderBrand />
      </div>

      <!-- Desktop main navigation -->
      <nav :aria-label="t('common.mainNav')" class="hidden items-center gap-1 lg:flex">
        <StoreHeaderNavLink
          v-for="item in STORE_NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          :label="t(item.labelKey)"
          :is-active="isNavActive(item.to)"
          :highlight="item.highlight"
        />
      </nav>

      <!-- Actions: Search (Sheet), Wishlist, Compare, Cart, WhatsApp, LocaleSwitcher -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <StoreHeaderSearch v-model:open="searchSheetOpen" />

        <StoreHeaderBadgeButton
          to="/wishlist"
          :label="t('store.header.wishlist')"
          :sr-text="t('store.header.wishlistCount', { count: wishlist })"
          :count="wishlist"
          :icon="Heart"
        />

        <StoreHeaderBadgeButton
          to="/compare"
          :label="t('store.header.compare')"
          :sr-text="t('store.header.compareCount', { count: compare })"
          :count="compare"
          :icon="ArrowLeftRight"
        />

        <!-- Cart button with badge -->
        <StoreHeaderCartButton :count="cart" />

        <!-- WhatsApp button -->
        <StoreHeaderWhatsAppButton :href="whatsappUrl" />

        <!-- Language switcher (phones get it in the ☰ menu, so the action row fits at 320 px) -->
        <CommonLocaleSwitcher class="hidden sm:inline-flex" />
      </div>
    </div>

    <!-- Secondary horizontal navigation strip for tablet/mobile below lg -->
    <StoreHeaderQuickNav
      :items="STORE_NAV_ITEMS"
      :is-active="isNavActive"
    />
  </header>
</template>
