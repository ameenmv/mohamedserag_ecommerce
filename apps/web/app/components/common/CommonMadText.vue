<script setup lang="ts">
import { addMad, type MadSize } from '~/utils/mad'

// A title with a مد (see utils/mad.ts). The real text stays in the page for screen readers and
// search engines; the stretched copy is for the eye only. English titles are left as they are.
const props = withDefaults(defineProps<{ text: string; size?: MadSize }>(), { size: 'lg' })

const { locale } = useI18n()

const segments = computed(() =>
  addMad(props.text, { size: props.size })
    .split(/(ـ+)/)
    .filter(Boolean)
    .map((part) => ({ part, mad: part.startsWith('ـ') })),
)
</script>

<template>
  <template v-if="locale === 'ar'">
    <span class="sr-only">{{ text }}</span>
    <span aria-hidden="true"><template v-for="(segment, index) in segments" :key="index"><span v-if="segment.mad" class="mad">{{ segment.part }}</span><template v-else>{{ segment.part }}</template></template></span>
  </template>
  <template v-else>{{ text }}</template>
</template>
