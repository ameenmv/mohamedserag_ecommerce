<script setup lang="ts">
import { toasterWanted } from '~/utils/toaster'

useAppHead()
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Mounted on the first notification (see utils/toaster.ts) -->
    <LazyCommonAppToaster v-if="toasterWanted" />
  </div>
</template>
