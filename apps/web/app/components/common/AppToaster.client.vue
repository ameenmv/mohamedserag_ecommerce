<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'

const { localeProperties } = useI18n()

onMounted(() => {
  void nextTick(markToasterReady)
})
</script>

<template>
  <Toaster :dir="localeProperties.dir" rich-colors position="bottom-center" />
</template>
