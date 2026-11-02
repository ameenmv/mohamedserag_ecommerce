<script setup lang="ts">
const props = defineProps<{
  slug: string
}>()

const kind = computed(() => categoryIconKind(props.slug))
</script>

<!-- 48×48 line icons from the prototype; size and stroke come from the parent (class / stroke-width). -->
<template>
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="kind === 'fridge'">
      <rect x="13" y="4" width="22" height="40" rx="3" />
      <path d="M13 20h22M18 10v6M18 25v8" />
    </template>
    <template v-else-if="kind === 'washer'">
      <rect x="9" y="4" width="30" height="40" rx="4" />
      <circle cx="24" cy="28" r="10" />
      <circle cx="24" cy="28" r="5" />
      <path d="M15 11h8M31 11h2" />
    </template>
    <template v-else-if="kind === 'screen'">
      <rect x="4" y="8" width="40" height="27" rx="3" />
      <path d="M16 42h16M24 35v7" />
    </template>
    <template v-else-if="kind === 'ac'">
      <rect x="4" y="10" width="40" height="16" rx="3" />
      <path d="M10 21h28M14 32c2 3 2 5 0 8M24 32c2 3 2 5 0 8M34 32c2 3 2 5 0 8" />
    </template>
    <template v-else-if="kind === 'oven'">
      <rect x="7" y="6" width="34" height="36" rx="3" />
      <path d="M7 16h34" />
      <circle cx="14" cy="11" r="1.5" />
      <circle cx="24" cy="11" r="1.5" />
      <circle cx="34" cy="11" r="1.5" />
      <rect x="12" y="22" width="24" height="15" rx="2" />
    </template>
    <template v-else-if="kind === 'fan'">
      <circle cx="24" cy="18" r="3" />
      <ellipse cx="24" cy="9" rx="3.5" ry="6" />
      <ellipse cx="24" cy="9" rx="3.5" ry="6" transform="rotate(120 24 18)" />
      <ellipse cx="24" cy="9" rx="3.5" ry="6" transform="rotate(240 24 18)" />
      <path d="M24 32v10M15 43h18" />
    </template>
    <template v-else-if="kind === 'blender'">
      <path d="M14 5h20l-3 24H17z" />
      <rect x="16" y="29" width="16" height="12" rx="2" />
      <path d="M12 5h24M20 45h8" />
    </template>
    <template v-else>
      <path d="M9 20h30v14a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6z" />
      <path d="M7 20h34M9 26H4M39 26h5M18 14c0-3 3-3 3-6M27 14c0-3 3-3 3-6" />
    </template>
  </svg>
</template>
