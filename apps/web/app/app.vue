<script setup lang="ts">
import { toasterWanted } from '~/utils/toaster'

useAppHead()

// The splash plays on every full page load of the storefront (not the admin); CSS only.
const showSplash = !/^\/(?:en\/)?admin(?:\/|$)/.test(useRoute().path)
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
