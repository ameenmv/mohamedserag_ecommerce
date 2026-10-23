<script setup lang="ts">
import { toasterWanted } from '~/utils/toaster'

useAppHead()

// The splash plays on every full page load of the storefront (not the admin); CSS only.
const showSplash = !/^\/(?:en\/)?admin(?:\/|$)/.test(useRoute().path)

// Theme chosen with the header switch (or the admin's), applied before first paint so a dark
// page never flashes light. The store stays light unless the visitor picked dark.
useHead({
  script: [
    {
      key: 'theme',
      tagPosition: 'head',
      innerHTML: "try{if(localStorage.getItem('serag-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
    },
  ],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <!-- Gold progress bar while the next page loads -->
    <NuxtLoadingIndicator color="linear-gradient(90deg, #B5A45C, #D2C27A, #B5A45C)" :height="3" :throttle="150" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <CommonSplash v-if="showSplash" />
    <!-- Mounted on the first notification (see utils/toaster.ts) -->
    <LazyCommonAppToaster v-if="toasterWanted" />
  </div>
</template>
