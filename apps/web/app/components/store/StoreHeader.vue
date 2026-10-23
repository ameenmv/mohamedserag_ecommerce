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
const categories = await useNavCategories()

const isScrolled = computed(() => y.value > 10)
const mobileMenuOpen = ref(false)

const whatsappUrl = computed(() =>
  settings.whatsapp ? waLink(settings.whatsapp, t('store.footer.whatsappPrefill')) : '',
)
</script>

<template>
  <!-- Top promise bar: authentic + delivery, phone, language -->
  <LazyStoreHeaderAnnouncement hydrate-never :phone="settings.phone" />

  <!-- Logo, search and actions stay pinned; the category bar below scrolls away -->
  <header
    :class="[
      'sticky top-0 z-40 border-b border-[#ECE6D3] bg-card transition-shadow duration-200 motion-reduce:transition-none',
      isScrolled ? 'shadow-sm' : '',
    ]"
  >
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:gap-x-8 sm:px-6 lg:px-10 lg:py-[18px]">
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

      <!-- Hydrated eagerly: deferring it lost what was typed before it loaded -->
      <StoreHeaderSearchBar class="order-last basis-full md:order-none md:flex-1 md:basis-80" />

      <div class="ms-auto flex items-center gap-1.5 sm:gap-2.5 md:ms-0">
        <!-- Phones get it in the side menu: the row has no room for a fourth button -->
        <div class="hidden sm:flex">
          <StoreHeaderThemeToggle />
        </div>
        <StoreHeaderBadgeButton
          to="/compare"
          :label="t('store.header.compare')"
          :sr-text="t('store.header.compareCount', { count: compare })"
          :count="compare"
          :icon="ArrowLeftRight"
        />
        <StoreHeaderBadgeButton
          to="/wishlist"
          :label="t('store.header.wishlist')"
          :sr-text="t('store.header.wishlistCount', { count: wishlist })"
          :count="wishlist"
          :icon="Heart"
        />
        <StoreHeaderCartButton :count="cart" />
      </div>
    </div>
  </header>

  <!-- Links only: no client JavaScript -->
  <LazyStoreHeaderCategoryNav hydrate-never :categories="categories" />
</template>
