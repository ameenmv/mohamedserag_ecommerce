<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'

const { localeProperties } = useI18n()

onMounted(() => {
  void nextTick(markToasterReady)
})
</script>

<template>
  <!-- Styled in main.css; on phones it sits above the bottom navigation -->
  <Toaster
    :dir="localeProperties.dir"
    position="bottom-center"
    close-button
    :mobile-offset="{ bottom: '84px' }"
  />
</template>
