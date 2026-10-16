<script setup lang="ts">
import { Banknote, MapPin, MessageCircle, Phone, ShieldCheck, Smartphone, Wallet } from '@lucide/vue'
import { waLink } from '@serag/shared'
import { computed } from 'vue'
import { useAnalytics } from '@/composables/useAnalytics'
import { useStoreSettings } from '@/composables/useStoreSettings'

const settings = useStoreSettings()
const { track } = useAnalytics()

const whatsappUrl = computed(() =>
  waLink(settings.whatsapp, 'السلام عليكم، عندي استفسار من موقع معرض محمد سراج 👋'),
)

const footerLinks = [
  { label: 'من نحن', to: '/about' },
  { label: 'التوصيل', to: '/delivery' },
  { label: 'الاسترجاع', to: '/returns' },
  { label: 'الضمان', to: '/warranty' },
  { label: 'الخصوصية', to: '/privacy' },
  { label: 'الأسئلة الشائعة', to: '/faq' },
  { label: 'التجار', to: '/traders' },
] as const

const storeSections = [
  { label: 'الرئيسية', to: '/' },
  { label: 'كل الأقسام', to: '/shop' },
  { label: 'جهاز العروسة', to: '/bridal' },
  { label: 'العروض', to: '/offers' },
  { label: 'دليل الشراء', to: '/guides' },
] as const

const paymentMethods = [
  { label: 'كاش عند الاستلام', icon: Banknote },
  { label: 'إنستا باي', icon: Smartphone },
  { label: 'فودافون كاش', icon: Wallet },
] as const
</script>

<template>
  <footer class="bg-sidebar text-sidebar-foreground">
    <div class="mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
        <!-- Brand & about blurb -->
        <div class="flex flex-col gap-4 lg:col-span-4">
          <div class="flex items-center gap-3.5">
            <div
              class="num flex size-14 shrink-0 items-center justify-center rounded-2xl bg-serag-green text-2xl font-extrabold text-serag-gold-hi ring-2 ring-serag-gold/45 ring-inset"
              aria-hidden="true"
            >
              MS
            </div>
            <div class="leading-tight">
              <div class="font-display text-3xl text-serag-ivory">
                محمد سراج
              </div>
              <div class="num text-[11px] font-bold tracking-widest text-serag-gold-hi">
                SINCE 1972
              </div>
            </div>
          </div>
          <p class="max-w-sm text-base leading-relaxed text-sidebar-foreground">
            أجهزة كهربائية وأدوات منزلية بضمان حقيقي، من المنصورة لكل بيت مصري. خبرة وثقة من سنة <span class="num">1972</span> في تجهيز البيوت والعرايس بأفضل الأسعار.
          </p>
          <div class="inline-flex items-center gap-2 text-xs text-serag-gold-hi">
            <ShieldCheck class="size-4 shrink-0" aria-hidden="true" />
            <span>الأسعار شاملة ضريبة القيمة المضافة</span>
          </div>
        </div>

        <!-- Store quick links -->
        <div class="flex flex-col gap-2.5 lg:col-span-2">
          <h2 class="mb-1 text-lg font-bold text-serag-ivory">
            تسوّق
          </h2>
          <NuxtLink
            v-for="item in storeSections"
            :key="item.to"
            :to="item.to"
            class="inline-flex min-h-11 items-center rounded-lg px-1 text-base transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
          >
            {{ item.label }}
          </NuxtLink>
        </div>

        <!-- Info & policy links required by PRD -->
        <div class="flex flex-col gap-2.5 lg:col-span-3">
          <h2 class="mb-1 text-lg font-bold text-serag-ivory">
            معلومات وسياسات المعرض
          </h2>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-1">
            <NuxtLink
              v-for="link in footerLinks"
              :key="link.to"
              :to="link.to"
              class="inline-flex min-h-11 items-center rounded-lg px-1 text-base transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Showroom address & contact -->
        <div class="flex flex-col gap-3 lg:col-span-3">
          <h2 class="mb-1 text-lg font-bold text-serag-ivory">
            تواصل معانا
          </h2>
          <div class="flex items-start gap-2.5 text-base">
            <MapPin class="mt-1 size-5 shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <div>
              <div class="font-semibold text-serag-ivory">المنصورة، مصر</div>
              <div class="text-sm text-sidebar-foreground">[عنوان المعرض]</div>
            </div>
          </div>
          <a
            :href="`tel:${settings.phone}`"
            class="inline-flex min-h-11 items-center gap-2.5 rounded-lg px-1 text-base transition-colors hover:text-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
          >
            <Phone class="size-5 shrink-0 text-serag-gold-hi" aria-hidden="true" />
            <span class="num">{{ settings.phone }}</span>
          </a>
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sidebar-primary px-5 font-bold text-sidebar-primary-foreground transition-colors hover:bg-serag-gold-hi focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none motion-reduce:transition-none"
            @click="track('whatsapp_click', { source: 'footer' })"
          >
            <MessageCircle class="size-5" aria-hidden="true" />
            <span>كلّمنا على واتساب</span>
          </a>
        </div>
      </div>

      <!-- Payment methods row -->
      <div class="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-serag-ivory/15 pt-6">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="text-sm font-semibold text-serag-ivory">طرق الدفع المتاحة:</span>
          <span
            v-for="method in paymentMethods"
            :key="method.label"
            class="inline-flex items-center gap-1.5 rounded-full border border-serag-ivory/20 bg-serag-deep px-3.5 py-1.5 text-xs font-semibold text-serag-ivory"
          >
            <component :is="method.icon" class="size-3.5 text-serag-gold-hi" aria-hidden="true" />
            <span>{{ method.label }}</span>
          </span>
        </div>
        <span class="font-display text-xl tracking-wide text-serag-gold-hi">
          ثقة لها تاريخ · <span class="num text-base font-bold">SINCE 1972</span>
        </span>
      </div>

      <!-- Copyright -->
      <div class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-serag-ivory/10 pt-5 text-xs text-sidebar-foreground/80">
        <span>© <span class="num">2026</span> {{ settings.name }}. كل الحقوق محفوظة.</span>
        <span>توصيل بعربيات المعرض لكل محافظات مصر</span>
      </div>
    </div>
  </footer>
</template>
