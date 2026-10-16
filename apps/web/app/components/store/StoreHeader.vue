<script setup lang="ts">
import {
  ArrowLeftRight,
  Heart,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from '@lucide/vue'
import { waLink } from '@serag/shared'
import { useWindowScroll } from '@vueuse/core'
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useHeaderBadges } from '@/composables/useHeaderBadges'
import { useStoreSettings } from '@/composables/useStoreSettings'

const route = useRoute()
const settings = useStoreSettings()
const { wishlist, compare, cart } = useHeaderBadges()
const { y } = useWindowScroll()

const isScrolled = computed(() => y.value > 10)
const searchSheetOpen = ref(false)
const mobileMenuOpen = ref(false)
const searchQuery = ref('')

const navItems: { label: string; to: string; highlight?: boolean }[] = [
  { label: 'الرئيسية', to: '/' },
  { label: 'الأقسام', to: '/shop' },
  { label: 'جهاز العروسة', to: '/bridal', highlight: true },
  { label: 'العروض', to: '/offers' },
  { label: 'دليل الشراء', to: '/guides' },
]

const whatsappUrl = computed(() =>
  waLink(settings.whatsapp, 'السلام عليكم، عندي استفسار من موقع معرض محمد سراج 👋'),
)

function isNavActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <!-- Top announcement bar -->
  <div class="bg-serag-night text-serag-ivory text-xs sm:text-sm">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center gap-4 sm:gap-6">
        <span class="inline-flex items-center gap-1.5">
          <ShieldCheck class="size-4 text-serag-gold" aria-hidden="true" />
          <span>أصلي <span class="num">100%</span> وبضمان حقيقي</span>
        </span>
        <span class="hidden items-center gap-1.5 md:inline-flex">
          <Truck class="size-4 text-serag-gold" aria-hidden="true" />
          <span>استلام من المعرض أو توصيل لحد باب البيت</span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <a
          :href="`tel:${settings.phone}`"
          class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          <Phone class="size-3.5 text-serag-gold" aria-hidden="true" />
          <span class="num font-medium">{{ settings.phone }}</span>
        </a>
      </div>
    </div>
  </div>

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
        <Sheet v-model:open="mobileMenuOpen">
          <SheetTrigger as-child>
            <button
              type="button"
              aria-label="القائمة الرئيسية"
              class="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden motion-reduce:transition-none"
            >
              <Menu class="size-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" class="w-80 bg-background p-0">
            <SheetHeader class="border-b border-sidebar-border bg-serag-deep px-5 py-5 text-start text-serag-ivory">
              <SheetTitle class="font-display text-2xl text-serag-ivory">
                محمد سراج
              </SheetTitle>
              <SheetDescription class="num text-xs font-semibold tracking-widest text-serag-gold-hi">
                SINCE 1972 · المنصورة
              </SheetDescription>
            </SheetHeader>
            <nav aria-label="تصفح الموقع" class="flex flex-col gap-1 p-4">
              <SheetClose v-for="item in navItems" :key="item.to" as-child>
                <NuxtLink
                  :to="item.to"
                  :aria-current="isNavActive(item.to) ? 'page' : undefined"
                  :class="[
                    'flex min-h-11 items-center justify-between rounded-xl px-4 py-2.5 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                    isNavActive(item.to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-secondary',
                  ]"
                >
                  <span>{{ item.label }}</span>
                  <Sparkles v-if="item.highlight" class="size-4 text-serag-gold" aria-hidden="true" />
                </NuxtLink>
              </SheetClose>
            </nav>
            <div class="mt-auto flex flex-col gap-2 border-t border-border bg-secondary/50 p-4">
              <a
                :href="whatsappUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
              >
                <MessageCircle class="size-5" aria-hidden="true" />
                <span>تواصل واتساب مباشر</span>
              </a>
              <a
                :href="`tel:${settings.phone}`"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary px-4 font-bold text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
              >
                <Phone class="size-4" aria-hidden="true" />
                <span>اتصل بالمعرض: <span class="num">{{ settings.phone }}</span></span>
              </a>
            </div>
          </SheetContent>
        </Sheet>

        <NuxtLink
          to="/"
          aria-label="محمد سراج - الرئيسية"
          class="flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:gap-3"
        >
          <div
            class="num flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold tracking-tight text-serag-gold-hi ring-2 ring-serag-gold/40 ring-inset sm:size-12 sm:text-xl"
            aria-hidden="true"
          >
            MS
          </div>
          <div class="flex flex-col leading-none">
            <span class="font-display text-2xl text-primary sm:text-3xl">محمد سراج</span>
            <span class="num mt-0.5 text-[10px] font-bold tracking-widest text-serag-gold-ink sm:text-[11px] dark:text-serag-gold-hi">
              SINCE 1972
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Desktop main navigation -->
      <nav aria-label="القائمة الرئيسية" class="hidden items-center gap-1 lg:flex">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isNavActive(item.to) ? 'page' : undefined"
          :class="[
            'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
            isNavActive(item.to)
              ? 'bg-primary text-primary-foreground'
              : item.highlight
                ? 'bg-secondary text-serag-gold-ink hover:bg-accent hover:text-accent-foreground dark:text-serag-gold-hi'
                : 'text-foreground hover:bg-secondary',
          ]"
        >
          <Sparkles v-if="item.highlight" class="size-4" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Actions: Search (Sheet), Wishlist, Compare, Cart, WhatsApp -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Search button opening placeholder Sheet (real search in T024) -->
        <Sheet v-model:open="searchSheetOpen">
          <SheetTrigger as-child>
            <button
              type="button"
              aria-label="ابحث عن منتج"
              class="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3.5 motion-reduce:transition-none"
            >
              <Search class="size-5 text-primary" aria-hidden="true" />
              <span class="hidden sm:inline">ابحث عن منتج…</span>
            </button>
          </SheetTrigger>
          <SheetContent side="top" class="mx-auto max-w-3xl rounded-b-3xl bg-background p-6">
            <SheetHeader class="text-start">
              <SheetTitle class="font-display text-2xl text-primary">
                ابحث في معرض محمد سراج
              </SheetTitle>
              <SheetDescription>
                ابحث عن ثلاجة، غسالة، شاشة، بوتاجاز، تكييف أو أدوات مطبخ تركي
              </SheetDescription>
            </SheetHeader>
            <form
              class="mt-2 flex items-center gap-2"
              @submit.prevent="
                () => {
                  searchSheetOpen = false
                  navigateTo({ path: '/shop', query: searchQuery.trim() ? { q: searchQuery.trim() } : undefined })
                }
              "
            >
              <label for="store-header-search-input" class="sr-only">ابحث عن منتج</label>
              <Input
                id="store-header-search-input"
                v-model="searchQuery"
                type="search"
                placeholder="ابحث عن ثلاجة، غسالة، شاشة، بوتاجاز..."
                class="min-h-12 flex-1 rounded-full px-5 text-base"
              />
              <button
                type="submit"
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
              >
                <Search class="size-4" aria-hidden="true" />
                <span>بحث</span>
              </button>
            </form>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>أقسام سريعة:</span>
              <SheetClose as-child>
                <NuxtLink
                  to="/shop"
                  class="inline-flex min-h-9 items-center rounded-full bg-secondary px-3 font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  كل المنتجات
                </NuxtLink>
              </SheetClose>
              <SheetClose as-child>
                <NuxtLink
                  to="/bridal"
                  class="inline-flex min-h-9 items-center rounded-full bg-secondary px-3 font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  جهاز العروسة
                </NuxtLink>
              </SheetClose>
              <SheetClose as-child>
                <NuxtLink
                  to="/offers"
                  class="inline-flex min-h-9 items-center rounded-full bg-secondary px-3 font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  العروض
                </NuxtLink>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <!-- Wishlist button with badge -->
        <NuxtLink
          to="/wishlist"
          aria-label="المفضلة"
          class="relative inline-flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          <Heart class="size-5" aria-hidden="true" />
          <span
            class="num absolute -top-1.5 -start-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
          >
            {{ wishlist }}
          </span>
        </NuxtLink>

        <!-- Compare button with badge -->
        <NuxtLink
          to="/compare"
          aria-label="المقارنة"
          class="relative inline-flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary transition-colors hover:border-accent hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
        >
          <ArrowLeftRight class="size-5" aria-hidden="true" />
          <span
            class="num absolute -top-1.5 -start-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
          >
            {{ compare }}
          </span>
        </NuxtLink>

        <!-- Cart button with badge -->
        <NuxtLink
          to="/cart"
          aria-label="السلة"
          class="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 font-bold text-accent-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4 motion-reduce:transition-none"
        >
          <ShoppingCart class="size-5" aria-hidden="true" />
          <span class="hidden text-sm sm:inline">السلة</span>
          <span
            class="num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-serag-ink px-1.5 text-xs font-extrabold text-serag-gold-hi"
          >
            {{ cart }}
          </span>
        </NuxtLink>

        <!-- WhatsApp button -->
        <a
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل معنا عبر واتساب"
          class="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2.5 font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3.5 motion-reduce:transition-none"
        >
          <MessageCircle class="size-5 text-serag-gold-hi" aria-hidden="true" />
          <span class="hidden text-sm xl:inline">واتساب</span>
        </a>
      </div>
    </div>

    <!-- Secondary horizontal navigation strip for tablet/mobile below lg -->
    <nav
      aria-label="روابط سريعة"
      class="flex items-center gap-1.5 overflow-x-auto border-t border-sidebar-border bg-serag-deep px-3 py-2 text-serag-ivory lg:hidden"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :aria-current="isNavActive(item.to) ? 'page' : undefined"
        :class="[
          'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
          isNavActive(item.to)
            ? 'bg-accent font-bold text-accent-foreground'
            : 'bg-serag-ivory/10 text-serag-ivory hover:bg-serag-ivory/20',
        ]"
      >
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </header>
</template>
