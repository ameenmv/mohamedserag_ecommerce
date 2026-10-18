<script setup lang="ts">
useAppHead()
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <LazyCommonAppToaster />
  </div>
</template>
