<script setup lang="ts">
import { PERMISSIONS } from '@serag/shared'
import type { Component } from 'vue'
import { FileText, LayoutDashboard, BookOpen, HelpCircle } from '@lucide/vue'

definePageMeta({
  layout: 'admin',
  middleware: [
    'admin-auth',
    () => {
      const { can } = useAdminAuth()
      if (!can(PERMISSIONS.content.manage)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
    },
  ],
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta({ title: () => t('admin.nav.content') })
useAdminPageTitle('admin.nav.content')

interface ContentTab {
  id: string
  labelKey: string
  icon: Component
  available: boolean
}

// Content editor tabs: home page, static pages, buying guides and the «ساعدني أختار» quizzes.
const TABS: ContentTab[] = [
  {
    id: 'home',
    labelKey: 'admin.content.tabs.home',
    icon: LayoutDashboard,
    available: true,
  },
  {
    id: 'pages',
    labelKey: 'admin.content.tabs.pages',
    icon: FileText,
    available: true,
  },
  {
    id: 'guides',
    labelKey: 'admin.content.tabs.guides',
    icon: BookOpen,
    available: true,
  },
  {
    id: 'quiz',
    labelKey: 'admin.content.tabs.quiz',
    icon: HelpCircle,
    available: true,
  },
]

const activeTab = computed(() => {
  const requested = typeof route.query.tab === 'string' ? route.query.tab : 'home'
  return TABS.some((tab) => tab.id === requested && tab.available) ? requested : 'home'
})

function setTab(tab: string): void {
  void router.replace({
    query: { ...route.query, tab: tab === 'home' ? undefined : tab },
  })
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <div class="border-b border-border">
      <div
        role="tablist"
        :aria-label="t('admin.nav.content')"
        class="-mb-px flex items-center gap-2 overflow-x-auto"
      >
        <button
          v-for="tab in TABS"
          :id="`tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`panel-${tab.id}`"
          :disabled="!tab.available"
          class="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            activeTab === tab.id
              ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          "
          @click="setTab(tab.id)"
        >
          <component :is="tab.icon" class="size-4" aria-hidden="true" />
          <span>{{ t(tab.labelKey) }}</span>
        </button>
      </div>
    </div>

    <div
      id="panel-home"
      role="tabpanel"
      aria-labelledby="tab-home"
      :class="activeTab === 'home' ? 'block' : 'hidden'"
    >
      <AdminContentHomeEditor v-if="activeTab === 'home'" />
    </div>

    <div
      id="panel-pages"
      role="tabpanel"
      aria-labelledby="tab-pages"
      :class="activeTab === 'pages' ? 'block' : 'hidden'"
    >
      <AdminContentPages v-if="activeTab === 'pages'" />
    </div>

    <div
      id="panel-guides"
      role="tabpanel"
      aria-labelledby="tab-guides"
      :class="activeTab === 'guides' ? 'block' : 'hidden'"
    >
      <AdminContentGuides v-if="activeTab === 'guides'" />
    </div>

    <div
      id="panel-quiz"
      role="tabpanel"
      aria-labelledby="tab-quiz"
      :class="activeTab === 'quiz' ? 'block' : 'hidden'"
    >
      <AdminContentQuiz v-if="activeTab === 'quiz'" />
    </div>
  </div>
</template>
