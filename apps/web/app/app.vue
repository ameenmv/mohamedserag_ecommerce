<script setup lang="ts">
import { toasterWanted } from '~/utils/toaster'
import { firstInput } from '~/composables/useGsap'

useAppHead()

// The storefront's splash (not the admin's), CSS only.
const route = useRoute()
const isStorefront = computed(() => !/^\/(?:en\/)?admin(?:\/|$)/.test(route.path))
const showSplash = isStorefront

// The page transition and the cursor follower download on the visitor's first interaction:
// the first-load script budget (CI Lighthouse) has no room, and neither is needed before it.
const motionReady = ref(false)
onMounted(() => { firstInput().then(() => { motionReady.value = true }) })

// Theme chosen with the header switch (or the admin's), applied before first paint so a dark
// page never flashes light. The store stays light unless the visitor picked dark.
useHead({
  script: [
    {
      key: 'theme',
      tagPosition: 'head',
      innerHTML: "try{if(localStorage.getItem('serag-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
    },
    {
      // Web fonts start loading only after the first paint (the splash covers the swap). Until
      // then text uses system fonts: see `:root:not(.fonts-ready)` in main.css.
      key: 'fonts-ready',
      tagPosition: 'head',
      innerHTML:
        "requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(function(){document.documentElement.classList.add('fonts-ready')},100)})})",
    },
  ],
  // Without JavaScript the class is never added: use the web fonts straight away
  noscript: [{ innerHTML: '<style>:root:not(.fonts-ready){--font-display:initial;--font-sans:initial;--font-num:initial}</style>' }],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <!-- Gold progress bar while the next page loads -->
    <NuxtLoadingIndicator color="linear-gradient(90deg, #A68A64, #C9B189, #A68A64)" :height="3" :throttle="150" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Server-rendered only (no client JS): the logo symbols and the splash that uses them -->
    <LazyCommonBrandSymbols hydrate-never />
    <LazyCommonSplash v-if="showSplash" hydrate-never />
    <!-- Storefront page transition overlay and custom cursor -->
    <template v-if="motionReady && isStorefront">
      <LazyCommonPageWipe />
      <LazyCommonCursor />
    </template>
    <!-- Mounted on the first notification (see utils/toaster.ts) -->
    <LazyCommonAppToaster v-if="toasterWanted" />
  </div>
</template>
