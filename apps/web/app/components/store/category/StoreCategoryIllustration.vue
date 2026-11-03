<script setup lang="ts">
import { resolveCategoryIllustration, type CategoryIllustration } from '@serag/shared'

const props = withDefaults(
  defineProps<{
    name?: CategoryIllustration | string | null
  }>(),
  {
    name: 'default',
  },
)

const resolved = computed<CategoryIllustration>(() =>
  resolveCategoryIllustration(props.name),
)
</script>

<template>
  <svg
    viewBox="0 0 120 120"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="shrink-0 overflow-visible"
    aria-hidden="true"
  >
    <!-- 1. Fridge -->
    <g v-if="resolved === 'fridge'">
      <path pathLength="1" class="cat-stroke" d="M34 16 H86 A8 8 0 0 1 94 24 V102 A6 6 0 0 1 88 108 H32 A6 6 0 0 1 26 102 V24 A8 8 0 0 1 34 16 Z" />
      <path pathLength="1" class="cat-stroke" d="M26 48 H94" />
      <path pathLength="1" class="cat-stroke" d="M35 28 V40" />
      <path pathLength="1" class="cat-stroke" d="M35 56 V76" />
      <path pathLength="1" class="cat-stroke" d="M44 68 H76" />
      <path pathLength="1" class="cat-stroke" d="M44 86 H76" />
      <path pathLength="1" class="cat-stroke" d="M34 108 V112" />
      <path pathLength="1" class="cat-stroke" d="M86 108 V112" />
    </g>

    <!-- 2. Washer -->
    <g v-else-if="resolved === 'washer'">
      <path pathLength="1" class="cat-stroke" d="M28 16 H92 A8 8 0 0 1 100 24 V102 A6 6 0 0 1 94 108 H26 A6 6 0 0 1 20 102 V24 A8 8 0 0 1 28 16 Z" />
      <path pathLength="1" class="cat-stroke" d="M20 38 H100" />
      <path pathLength="1" class="cat-stroke" d="M28 27 H46" />
      <circle pathLength="1" class="cat-stroke" cx="80" cy="27" r="4" />
      <path pathLength="1" class="cat-stroke" d="M58 27 H62" />
      <circle pathLength="1" class="cat-stroke" cx="60" cy="73" r="25" />
      <circle pathLength="1" class="cat-stroke" cx="60" cy="73" r="18" />
      <path pathLength="1" class="cat-stroke" d="M49 75 C54 70 58 70 63 75 C68 80 72 80 77 75" />
      <path pathLength="1" class="cat-stroke" d="M28 108 V112" />
      <path pathLength="1" class="cat-stroke" d="M92 108 V112" />
    </g>

    <!-- 3. TV -->
    <g v-else-if="resolved === 'tv'">
      <path pathLength="1" class="cat-stroke" d="M16 22 H104 A6 6 0 0 1 110 28 V80 A6 6 0 0 1 104 86 H16 A6 6 0 0 1 10 80 V28 A6 6 0 0 1 16 22 Z" />
      <path pathLength="1" class="cat-stroke" d="M10 76 H110" />
      <circle pathLength="1" class="cat-stroke" cx="60" cy="81" r="1" />
      <path pathLength="1" class="cat-stroke" d="M60 86 V98" />
      <path pathLength="1" class="cat-stroke" d="M38 98 H82" />
      <path pathLength="1" class="cat-stroke" d="M74 34 L94 54" />
      <path pathLength="1" class="cat-stroke" d="M84 34 L98 48" />
    </g>

    <!-- 4. AC -->
    <g v-else-if="resolved === 'ac'">
      <path pathLength="1" class="cat-stroke" d="M14 30 H106 A8 8 0 0 1 114 38 V66 A10 10 0 0 1 104 76 H16 A10 10 0 0 1 6 66 V38 A8 8 0 0 1 14 30 Z" />
      <path pathLength="1" class="cat-stroke" d="M12 66 H108" />
      <path pathLength="1" class="cat-stroke" d="M24 38 H96" />
      <path pathLength="1" class="cat-stroke" d="M24 44 H96" />
      <path pathLength="1" class="cat-stroke" d="M84 54 H94" />
      <path pathLength="1" class="cat-stroke" d="M22 88 C34 94 44 94 54 104" />
      <path pathLength="1" class="cat-stroke" d="M48 88 C60 94 70 94 80 104" />
      <path pathLength="1" class="cat-stroke" d="M74 88 C86 94 96 94 106 104" />
    </g>

    <!-- 5. Cooker -->
    <g v-else-if="resolved === 'cooker'">
      <path pathLength="1" class="cat-stroke" d="M24 18 H96 A6 6 0 0 1 102 24 V102 A6 6 0 0 1 96 108 H24 A6 6 0 0 1 18 102 V24 A6 6 0 0 1 24 18 Z" />
      <path pathLength="1" class="cat-stroke" d="M22 14 H98" />
      <path pathLength="1" class="cat-stroke" d="M18 36 H102" />
      <circle pathLength="1" class="cat-stroke" cx="32" cy="27" r="3" />
      <circle pathLength="1" class="cat-stroke" cx="50" cy="27" r="3" />
      <circle pathLength="1" class="cat-stroke" cx="70" cy="27" r="3" />
      <circle pathLength="1" class="cat-stroke" cx="88" cy="27" r="3" />
      <path pathLength="1" class="cat-stroke" d="M36 43 H84" />
      <path pathLength="1" class="cat-stroke" d="M28 50 H92 A4 4 0 0 1 96 54 V94 A4 4 0 0 1 92 98 H28 A4 4 0 0 1 24 94 V54 A4 4 0 0 1 28 50 Z" />
      <path pathLength="1" class="cat-stroke" d="M34 74 H86" />
    </g>

    <!-- 6. Cookware -->
    <g v-else-if="resolved === 'cookware'">
      <path pathLength="1" class="cat-stroke" d="M52 24 C52 20 68 20 68 24" />
      <path pathLength="1" class="cat-stroke" d="M28 36 C34 26 86 26 92 36 Z" />
      <path pathLength="1" class="cat-stroke" d="M30 40 L34 80 A16 16 0 0 0 50 96 H70 A16 16 0 0 0 86 80 L90 40 Z" />
      <path pathLength="1" class="cat-stroke" d="M30 50 H18 A4 4 0 0 0 14 54 V62 A4 4 0 0 0 18 66 H31" />
      <path pathLength="1" class="cat-stroke" d="M90 50 H102 A4 4 0 0 1 106 54 V62 A4 4 0 0 1 102 66 H89" />
      <path pathLength="1" class="cat-stroke" d="M48 16 C44 10 50 6 46 2" />
      <path pathLength="1" class="cat-stroke" d="M60 14 C56 8 62 4 58 1" />
      <path pathLength="1" class="cat-stroke" d="M72 16 C68 10 74 6 70 2" />
    </g>

    <!-- 7. Small Appliances (Blender) -->
    <g v-else-if="resolved === 'small-appliances'">
      <path pathLength="1" class="cat-stroke" d="M54 16 H66 V20 H54 Z" />
      <path pathLength="1" class="cat-stroke" d="M44 20 H76" />
      <path pathLength="1" class="cat-stroke" d="M40 24 L48 20 L48 24 L52 68 H68 L74 24 Z" />
      <path pathLength="1" class="cat-stroke" d="M74 30 H86 A6 6 0 0 1 92 36 V52 A6 6 0 0 1 86 58 H70" />
      <path pathLength="1" class="cat-stroke" d="M58 36 H64 M58 44 H64 M58 52 H64" />
      <path pathLength="1" class="cat-stroke" d="M48 70 H72 L78 100 A4 4 0 0 1 74 104 H46 A4 4 0 0 1 42 100 Z" />
      <circle pathLength="1" class="cat-stroke" cx="60" cy="86" r="4" />
      <path pathLength="1" class="cat-stroke" d="M48 104 V108 M72 104 V108" />
    </g>

    <!-- 8. Household (Steam Iron) -->
    <g v-else-if="resolved === 'household'">
      <path pathLength="1" class="cat-stroke" d="M20 94 H98 A6 6 0 0 0 104 88 C104 80 86 62 68 54 L36 54 C26 54 20 64 20 74 Z" />
      <path pathLength="1" class="cat-stroke" d="M30 54 V36 A10 10 0 0 1 40 26 H80 A8 8 0 0 1 88 34 C88 44 80 54 76 60" />
      <circle pathLength="1" class="cat-stroke" cx="52" cy="46" r="4" />
      <path pathLength="1" class="cat-stroke" d="M104 80 L112 78" />
      <path pathLength="1" class="cat-stroke" d="M32 102 L30 108" />
      <path pathLength="1" class="cat-stroke" d="M50 102 L50 109" />
      <path pathLength="1" class="cat-stroke" d="M68 102 L70 108" />
      <path pathLength="1" class="cat-stroke" d="M86 102 L90 108" />
    </g>

    <!-- 9. Default (Serag Heritage Diamond Emblem) -->
    <g v-else>
      <path pathLength="1" class="cat-stroke" d="M60 12 L102 54 A8 8 0 0 1 102 66 L60 108 A8 8 0 0 1 50 108 L18 66 A8 8 0 0 1 18 54 L50 12 A8 8 0 0 1 60 12 Z" />
      <path pathLength="1" class="cat-stroke" d="M60 32 V88" />
      <path pathLength="1" class="cat-stroke" d="M32 60 H88" />
      <path pathLength="1" class="cat-stroke" d="M60 44 L76 60 L60 76 L44 60 Z" />
    </g>
  </svg>
</template>
